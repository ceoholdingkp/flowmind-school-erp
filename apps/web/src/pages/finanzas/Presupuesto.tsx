import React, { useState, useEffect } from 'react';
import { RefreshCw, PlusCircle, AlertTriangle, XCircle, CheckCircle, TrendingUp } from 'lucide-react';
import api from '../../api/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const colors = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
};

interface Linea {
  categoria: string;
  presupuestado: number;
  ejecutado: number;
  diferencia: number;
  pct: number;
  alerta: 'CERCA_LIMITE' | 'SUPERADO' | null;
}

interface PresupuestoData {
  anio: number;
  mensaje?: string;
  lineas: Linea[];
}

const alertaConfig = {
  SUPERADO: { color: colors.red, label: 'Superado', Icon: XCircle, bg: '#2d1515' },
  CERCA_LIMITE: { color: colors.amber, label: 'Cerca del límite', Icon: AlertTriangle, bg: '#2a1f0a' },
  null: { color: colors.green, label: 'Normal', Icon: CheckCircle, bg: '#0e2218' },
};

export default function Presupuesto() {
  const [anio, setAnio] = useState(2026);
  const [data, setData] = useState<PresupuestoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/finanzas/presupuesto/comparativa?anio=${anio}`);
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [anio]);

  const lineas = data?.lineas ?? [];
  const isEmpty = lineas.length === 0;

  const totalPresupuestado = lineas.reduce((s, l) => s + l.presupuestado, 0);
  const totalEjecutado = lineas.reduce((s, l) => s + l.ejecutado, 0);
  const totalDiferencia = totalPresupuestado - totalEjecutado;
  const totalPct = totalPresupuestado ? (totalEjecutado / totalPresupuestado) * 100 : 0;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Presupuesto vs Ejecutado</h1>
          <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Comparativa de ejecución presupuestaria</p>
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

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && isEmpty && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '16px' }}>
          <div style={{ width: '72px', height: '72px', background: 'var(--card-deep)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
            <TrendingUp size={32} style={{ color: colors.blue }} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
            {data?.mensaje || `No existe presupuesto para ${anio}`}
          </h3>
          <p style={{ color: colors.muted, fontSize: '14px', marginBottom: '28px', textAlign: 'center', maxWidth: '380px' }}>
            Crea un presupuesto para comenzar a hacer seguimiento de la ejecución financiera del año.
          </p>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', background: colors.blue, border: 'none',
            borderRadius: '10px', color: '#fff', fontWeight: 600, fontSize: '15px', cursor: 'pointer',
          }}>
            <PlusCircle size={18} />
            Crear Presupuesto {anio}
          </button>
        </div>
      )}

      {/* KPIs + Table */}
      {!isEmpty && (
        <>
          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Presupuestado', value: fmt(totalPresupuestado), color: colors.blue },
              { label: 'Total Ejecutado', value: fmt(totalEjecutado), color: totalPct > 100 ? colors.red : colors.green },
              { label: 'Diferencia', value: fmt(totalDiferencia), color: totalDiferencia >= 0 ? colors.green : colors.red },
              { label: '% Ejecución', value: `${totalPct.toFixed(1)}%`, color: totalPct > 100 ? colors.red : totalPct > 85 ? colors.amber : colors.green },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${color}` }}>
                <div style={{ color: colors.muted, fontSize: '12px', fontWeight: 500, marginBottom: '8px' }}>{label}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Table */}
          <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Categoría', 'Presupuestado', 'Ejecutado', 'Diferencia', '% Ejecución', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: h === 'Categoría' ? 'left' : 'right', color: colors.muted, fontWeight: 600, fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lineas.map((linea, i) => {
                  const cfg = alertaConfig[linea.alerta as keyof typeof alertaConfig] ?? alertaConfig.null;
                  const pct = Math.min(linea.pct, 100);
                  return (
                    <tr key={i} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                      <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-body)' }}>{linea.categoria}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.blue }}>{fmt(linea.presupuestado)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: cfg.color }}>{fmt(linea.ejecutado)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: linea.diferencia >= 0 ? colors.green : colors.red }}>
                        {fmt(linea.diferencia)}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', minWidth: '140px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                          <div style={{ flex: 1, maxWidth: '80px', background: colors.bg, borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: cfg.color, borderRadius: '100px' }} />
                          </div>
                          <span style={{ color: cfg.color, fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>
                            {linea.pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                          borderRadius: '20px', padding: '3px 10px',
                          fontSize: '11px', fontWeight: 600,
                        }}>
                          <cfg.Icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
