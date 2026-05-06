import React, { useState, useEffect } from 'react';
import { BarChart2, RefreshCw, Users, TrendingUp } from 'lucide-react';
import api from '../../api/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const colors = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#16a34a',
  red: '#ef4444',
  blue: '#3b82f6',
  amber: '#f59e0b',
};

const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_LARGO = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface MesData {
  mes: number;
  totalHaberes: number;
  totalDescuentos: number;
  totalLiquido: number;
  funcionarios: number;
}

interface ResumenData {
  anio: number;
  porMes: MesData[];
  kpi: {
    totalAnual: number;
    promedioMensual: number;
  };
}

export default function ResumenAnual() {
  const [anio, setAnio] = useState<number>(2026);
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/remuneraciones/resumen', { params: { anio } });
      setData(res.data);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al cargar resumen anual');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [anio]);

  const porMes: MesData[] = data?.porMes ?? [];
  const mesActual = new Date().getMonth() + 1;
  const maxFuncionarios = porMes.length > 0 ? Math.max(...porMes.map(m => m.funcionarios)) : 0;
  const maxHaberes = porMes.length > 0 ? Math.max(...porMes.map(m => m.totalHaberes)) : 1;
  const mesesConDatos = porMes.filter(m => m.funcionarios > 0);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={22} style={{ color: colors.blue }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Resumen Anual de Remuneraciones</h1>
            <p style={{ color: colors.muted, margin: '3px 0 0', fontSize: '13px' }}>Evolución mensual del gasto en remuneraciones</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            style={{ padding: '8px 12px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        <div style={{ background: 'rgba(59,130,246,0.08)', border: `1px solid ${colors.blue}30`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${colors.blue}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <TrendingUp size={16} style={{ color: colors.blue }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Gasto Anual Total</span>
          </div>
          {loading && !data
            ? <div style={{ height: 28, background: `${colors.blue}20`, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
            : <div style={{ fontSize: '22px', fontWeight: 800, color: colors.blue }}>{fmt(data?.kpi.totalAnual ?? 0)}</div>
          }
        </div>
        <div style={{ background: 'rgba(245,158,11,0.08)', border: `1px solid ${colors.amber}30`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${colors.amber}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <BarChart2 size={16} style={{ color: colors.amber }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Promedio Mensual</span>
          </div>
          {loading && !data
            ? <div style={{ height: 28, background: `${colors.amber}20`, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
            : <div style={{ fontSize: '22px', fontWeight: 800, color: colors.amber }}>{fmt(data?.kpi.promedioMensual ?? 0)}</div>
          }
        </div>
        <div style={{ background: 'rgba(22,163,74,0.08)', border: `1px solid ${colors.green}30`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${colors.green}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Users size={16} style={{ color: colors.green }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Funcionarios (máx. mes)</span>
          </div>
          {loading && !data
            ? <div style={{ height: 28, background: `${colors.green}20`, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
            : <div style={{ fontSize: '36px', fontWeight: 800, color: colors.green }}>{maxFuncionarios}</div>
          }
        </div>
      </div>

      {/* Bar Chart */}
      {mesesConDatos.length > 0 && (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px', marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 20px', fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total Haberes por Mes — {anio}
          </h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px', height: 160, paddingBottom: '28px', position: 'relative' }}>
            {/* Y-axis guide lines */}
            {[0, 0.25, 0.5, 0.75, 1].map(pct => (
              <div key={pct} style={{ position: 'absolute', left: 0, right: 0, bottom: `calc(28px + ${pct * 132}px)`, borderTop: `1px dashed ${colors.border}40`, pointerEvents: 'none' }} />
            ))}
            {porMes.map(m => {
              const hasDatos = m.funcionarios > 0;
              const barHeight = hasDatos ? Math.max(4, (m.totalHaberes / maxHaberes) * 132) : 0;
              const isCurrent = m.mes === mesActual && anio === 2026;
              return (
                <div key={m.mes} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%', justifyContent: 'flex-end', position: 'relative' }}>
                  {hasDatos && (
                    <div style={{ fontSize: '10px', color: colors.muted, whiteSpace: 'nowrap', marginBottom: '2px' }}>
                      {m.funcionarios}
                    </div>
                  )}
                  <div
                    title={hasDatos ? `${MESES_LARGO[m.mes]}: ${fmt(m.totalHaberes)}` : `${MESES_LARGO[m.mes]}: sin datos`}
                    style={{
                      width: '100%',
                      height: hasDatos ? barHeight : 2,
                      background: hasDatos ? (isCurrent ? colors.amber : colors.blue) : `${colors.border}40`,
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.4s ease',
                      cursor: hasDatos ? 'default' : 'default',
                      opacity: hasDatos ? 1 : 0.4,
                    }}
                  />
                  <div style={{ position: 'absolute', bottom: 4, fontSize: '10px', color: isCurrent ? colors.amber : colors.muted, fontWeight: isCurrent ? 700 : 400 }}>
                    {MESES_CORTO[m.mes]}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '8px', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.muted }}>
              <div style={{ width: 10, height: 10, background: colors.blue, borderRadius: 2 }} />
              Total Haberes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.muted }}>
              <div style={{ width: 10, height: 10, background: colors.amber, borderRadius: 2 }} />
              Mes actual
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {['Mes', 'N° Func.', 'Total Haberes', 'Total Descuentos', 'Total Líquido'].map(h => (
                  <th key={h} style={{ padding: '12px 18px', textAlign: ['Total Haberes', 'Total Descuentos', 'Total Líquido'].includes(h) ? 'right' : 'left', color: colors.muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loading && !data && Array.from({ length: 12 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                  {Array.from({ length: 5 }).map((__, j) => (
                    <td key={j} style={{ padding: '13px 18px' }}>
                      <div style={{ height: 13, background: `${colors.muted}20`, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite', width: j === 0 ? 80 : 100 }} />
                    </td>
                  ))}
                </tr>
              ))}

              {!loading && porMes.map(m => {
                const hasDatos = m.funcionarios > 0;
                const isCurrent = m.mes === mesActual && anio === 2026;
                return (
                  <tr
                    key={m.mes}
                    style={{
                      borderBottom: `1px solid ${colors.border}20`,
                      background: isCurrent ? `${colors.amber}0a` : 'transparent',
                    }}
                  >
                    <td style={{ padding: '13px 18px', fontWeight: isCurrent ? 700 : 500, color: isCurrent ? colors.amber : 'var(--text-primary)' }}>
                      {MESES_LARGO[m.mes]}
                      {isCurrent && <span style={{ marginLeft: 8, fontSize: '10px', background: `${colors.amber}20`, color: colors.amber, borderRadius: 20, padding: '2px 7px', fontWeight: 600 }}>Actual</span>}
                    </td>
                    <td style={{ padding: '13px 18px', color: hasDatos ? 'var(--text-body)' : colors.muted }}>
                      {hasDatos ? m.funcionarios : '—'}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', color: hasDatos ? colors.blue : colors.muted, fontWeight: hasDatos ? 600 : 400 }}>
                      {hasDatos ? fmt(m.totalHaberes) : '—'}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', color: hasDatos ? colors.red : colors.muted, fontWeight: hasDatos ? 500 : 400 }}>
                      {hasDatos ? fmt(m.totalDescuentos) : '—'}
                    </td>
                    <td style={{ padding: '13px 18px', textAlign: 'right', color: hasDatos ? colors.green : colors.muted, fontWeight: hasDatos ? 600 : 400 }}>
                      {hasDatos ? fmt(m.totalLiquido) : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
