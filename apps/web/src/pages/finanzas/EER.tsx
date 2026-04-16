import React, { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, DollarSign, Percent, BarChart2 } from 'lucide-react';
import api from '../../api/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const INGRESO_CATEGORIES = [
  'Subvención General', 'SEP', 'PIE', 'Pro-Retención', 'Mantención', 'Otros Ingresos',
];
const EGRESO_CATEGORIES = [
  'Remuneraciones Personal', 'Remuneraciones SEP', 'Remuneraciones PIE',
  'Asesoría y Capacitación', 'Recursos de Aprendizaje', 'Infraestructura',
  'Administración', 'Otros Egresos',
];

interface MesData {
  mes: number;
  nombreMes: string;
  ingresos: { subtotales: Record<string, number>; total: number };
  egresos: { subtotales: Record<string, number>; total: number };
  resultado: number;
  margen: number;
  saldoAcumulado: number;
}

interface EERData {
  anio: number;
  meses: MesData[];
}

const colors = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  purple: '#8b5cf6',
};

export default function EER() {
  const [anio, setAnio] = useState(2026);
  const [data, setData] = useState<EERData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/finanzas/estado-resultados?anio=${anio}`);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [anio]);

  const allMonths: MesData[] = Array.from({ length: 12 }, (_, i) => {
    const found = data?.meses?.find(m => m.mes === i + 1);
    return found || {
      mes: i + 1,
      nombreMes: MONTH_NAMES[i],
      ingresos: { subtotales: Object.fromEntries(INGRESO_CATEGORIES.map(k => [k, 0])), total: 0 },
      egresos: { subtotales: Object.fromEntries(EGRESO_CATEGORIES.map(k => [k, 0])), total: 0 },
      resultado: 0, margen: 0, saldoAcumulado: 0,
    };
  });

  const totalIngresos = allMonths.reduce((s, m) => s + m.ingresos.total, 0);
  const totalEgresos = allMonths.reduce((s, m) => s + m.egresos.total, 0);
  const totalResultado = totalIngresos - totalEgresos;
  const totalMargen = totalIngresos ? (totalResultado / totalIngresos) * 100 : 0;
  const saldoAcumulado = allMonths[11]?.saldoAcumulado ?? totalResultado;

  const cellVal = (n: number) =>
    n === 0 ? (
      <span style={{ color: colors.muted }}>—</span>
    ) : (
      <span style={{ color: n < 0 ? colors.red : 'inherit' }}>{fmt(n)}</span>
    );

  const kpis = [
    { label: 'Total Ingresos', value: fmt(totalIngresos), color: colors.green, Icon: TrendingUp },
    { label: 'Total Egresos', value: fmt(totalEgresos), color: colors.red, Icon: TrendingDown },
    { label: 'Resultado', value: fmt(totalResultado), color: totalResultado >= 0 ? colors.green : colors.red, Icon: DollarSign },
    { label: 'Margen', value: `${totalMargen.toFixed(1)}%`, color: colors.amber, Icon: Percent },
    { label: 'Saldo Acumulado', value: fmt(saldoAcumulado), color: colors.blue, Icon: BarChart2 },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Estado de Resultados</h1>
          <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Análisis mensual de ingresos y egresos</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '4px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '4px' }}>
            {[2024, 2025, 2026].map(y => (
              <button
                key={y}
                onClick={() => setAnio(y)}
                style={{
                  padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '14px',
                  background: anio === y ? colors.blue : 'transparent',
                  color: anio === y ? '#fff' : colors.muted,
                  transition: 'all 0.15s',
                }}
              >
                {y}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-body)', cursor: 'pointer', fontSize: '14px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {kpis.map(({ label, value, color, Icon }) => (
          <div key={label} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Icon size={16} style={{ color }} />
              <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Table */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: '900px' }}>
            <thead>
              <tr style={{ background: 'var(--card-deep)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: colors.muted, fontWeight: 600, position: 'sticky', left: 0, background: 'var(--card-deep)', zIndex: 10, minWidth: '200px', borderBottom: `1px solid ${colors.border}` }}>
                  Categoría
                </th>
                {allMonths.map(m => (
                  <th key={m.mes} style={{ padding: '12px 10px', textAlign: 'right', color: colors.muted, fontWeight: 600, borderBottom: `1px solid ${colors.border}`, minWidth: '100px' }}>
                    {MONTH_NAMES[m.mes - 1]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* INGRESOS header */}
              <tr style={{ background: '#0e2218' }}>
                <td colSpan={13} style={{ padding: '8px 16px', fontWeight: 700, color: colors.green, fontSize: '11px', letterSpacing: '0.1em', borderBottom: `1px solid ${colors.border}` }}>
                  INGRESOS
                </td>
              </tr>
              {INGRESO_CATEGORIES.map(cat => (
                <tr key={cat} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                  <td style={{ padding: '9px 16px 9px 28px', color: 'var(--text-alt)', position: 'sticky', left: 0, background: colors.card, zIndex: 5 }}>{cat}</td>
                  {allMonths.map(m => (
                    <td key={m.mes} style={{ padding: '9px 10px', textAlign: 'right' }}>
                      {cellVal(m.ingresos.subtotales[cat] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* TOTAL INGRESOS */}
              <tr style={{ background: '#0e2218', borderTop: `1px solid ${colors.green}40` }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: colors.green, position: 'sticky', left: 0, background: '#0e2218', zIndex: 5 }}>TOTAL INGRESOS</td>
                {allMonths.map(m => (
                  <td key={m.mes} style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: colors.green }}>
                    {m.ingresos.total === 0 ? <span style={{ color: colors.muted }}>—</span> : fmt(m.ingresos.total)}
                  </td>
                ))}
              </tr>
              {/* Separator */}
              <tr><td colSpan={13} style={{ padding: '6px', background: colors.bg }} /></tr>
              {/* EGRESOS header */}
              <tr style={{ background: '#2d1515' }}>
                <td colSpan={13} style={{ padding: '8px 16px', fontWeight: 700, color: colors.red, fontSize: '11px', letterSpacing: '0.1em', borderBottom: `1px solid ${colors.border}` }}>
                  EGRESOS
                </td>
              </tr>
              {EGRESO_CATEGORIES.map(cat => (
                <tr key={cat} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                  <td style={{ padding: '9px 16px 9px 28px', color: 'var(--text-alt)', position: 'sticky', left: 0, background: colors.card, zIndex: 5 }}>{cat}</td>
                  {allMonths.map(m => (
                    <td key={m.mes} style={{ padding: '9px 10px', textAlign: 'right' }}>
                      {cellVal(m.egresos.subtotales[cat] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
              {/* TOTAL EGRESOS */}
              <tr style={{ background: '#2d1515', borderTop: `1px solid ${colors.red}40` }}>
                <td style={{ padding: '10px 16px', fontWeight: 700, color: colors.red, position: 'sticky', left: 0, background: '#2d1515', zIndex: 5 }}>TOTAL EGRESOS</td>
                {allMonths.map(m => (
                  <td key={m.mes} style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: colors.red }}>
                    {m.egresos.total === 0 ? <span style={{ color: colors.muted }}>—</span> : fmt(m.egresos.total)}
                  </td>
                ))}
              </tr>
              {/* RESULTADO */}
              <tr style={{ background: 'var(--card-deep)', borderTop: `2px solid ${colors.border}` }}>
                <td style={{ padding: '11px 16px', fontWeight: 700, color: 'var(--text-body)', position: 'sticky', left: 0, background: 'var(--card-deep)', zIndex: 5 }}>RESULTADO</td>
                {allMonths.map(m => (
                  <td key={m.mes} style={{ padding: '11px 10px', textAlign: 'right', fontWeight: 700, color: m.resultado >= 0 ? colors.green : colors.red }}>
                    {m.resultado === 0 ? <span style={{ color: colors.muted }}>—</span> : fmt(m.resultado)}
                  </td>
                ))}
              </tr>
              {/* MARGEN */}
              <tr style={{ background: 'var(--card-deep)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: colors.amber, position: 'sticky', left: 0, background: 'var(--card-deep)', zIndex: 5 }}>MARGEN %</td>
                {allMonths.map(m => (
                  <td key={m.mes} style={{ padding: '10px 10px', textAlign: 'right', color: colors.amber }}>
                    {m.margen === 0 ? <span style={{ color: colors.muted }}>—</span> : `${m.margen.toFixed(1)}%`}
                  </td>
                ))}
              </tr>
              {/* SALDO ACUMULADO */}
              <tr style={{ background: 'var(--card-deep)', borderTop: `1px solid ${colors.border}` }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: colors.blue, position: 'sticky', left: 0, background: 'var(--card-deep)', zIndex: 5 }}>SALDO ACUMULADO</td>
                {allMonths.map(m => (
                  <td key={m.mes} style={{ padding: '10px 10px', textAlign: 'right', color: colors.blue }}>
                    {m.saldoAcumulado === 0 ? <span style={{ color: colors.muted }}>—</span> : fmt(m.saldoAcumulado)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
