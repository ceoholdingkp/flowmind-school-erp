import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
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

interface Fondo {
  id: string;
  nombre: string;
  presupuestoAnual: number;
  gastoEjecutado: number;
  saldoDisponible: number;
  porcentajeEjecucion: number;
  estado: 'VERDE' | 'AMARILLO' | 'ROJO';
}

interface SemáforoData {
  anio: number;
  fondos: Fondo[];
}

const estadoConfig = {
  VERDE: { color: colors.green, label: 'Verde', bg: '#0e2218' },
  AMARILLO: { color: colors.amber, label: 'Amarillo', bg: '#2a1f0a' },
  ROJO: { color: colors.red, label: 'Rojo', bg: '#2d1515' },
};

export default function SaludFinanciera() {
  const [data, setData] = useState<SemáforoData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/finanzas/fondos/semaforo');
      setData(res.data.data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const fondos = data?.fondos ?? [];
  const countVerde = fondos.filter(f => f.estado === 'VERDE').length;
  const countAmarillo = fondos.filter(f => f.estado === 'AMARILLO').length;
  const countRojo = fondos.filter(f => f.estado === 'ROJO').length;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Salud Financiera</h1>
            <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Semáforo de ejecución presupuestaria por fondo</p>
          </div>
          {data && (
            <span style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '20px', padding: '4px 12px', fontSize: '13px', color: colors.blue, fontWeight: 600 }}>
              {data.anio}
            </span>
          )}
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

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Fondos en Verde', count: countVerde, color: colors.green, Icon: CheckCircle, bg: '#0e2218' },
          { label: 'Fondos en Amarillo', count: countAmarillo, color: colors.amber, Icon: AlertTriangle, bg: '#2a1f0a' },
          { label: 'Fondos en Rojo', count: countRojo, color: colors.red, Icon: XCircle, bg: '#2d1515' },
        ].map(({ label, count, color, Icon, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}40`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Icon size={18} style={{ color }} />
              <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>{label}</span>
            </div>
            <div style={{ fontSize: '36px', fontWeight: 800, color }}>{count}</div>
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && !data && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px', color: colors.muted }}>
          <Activity size={24} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
      )}

      {/* Fondo Cards Grid */}
      {fondos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {fondos.map(fondo => {
            const cfg = estadoConfig[fondo.estado];
            const pct = Math.min(fondo.porcentajeEjecucion, 100);
            const isAlert = fondo.estado === 'ROJO' || fondo.estado === 'AMARILLO';

            return (
              <div
                key={fondo.id}
                style={{
                  background: colors.card,
                  border: `1px solid ${isAlert ? cfg.color + '60' : colors.border}`,
                  borderRadius: '14px',
                  padding: '22px',
                  borderLeft: `4px solid ${cfg.color}`,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{fondo.nombre}</h3>
                      {isAlert && <AlertTriangle size={16} style={{ color: cfg.color }} />}
                    </div>
                  </div>
                  <span style={{
                    background: cfg.bg,
                    color: cfg.color,
                    border: `1px solid ${cfg.color}60`,
                    borderRadius: '20px',
                    padding: '3px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                  }}>
                    {cfg.label.toUpperCase()}
                  </span>
                </div>

                {/* % grande */}
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <span style={{ fontSize: '48px', fontWeight: 800, color: cfg.color, lineHeight: 1 }}>
                    {fondo.porcentajeEjecucion.toFixed(1)}%
                  </span>
                  <div style={{ color: colors.muted, fontSize: '12px', marginTop: '4px' }}>ejecución presupuestaria</div>
                </div>

                {/* Progress bar */}
                <div style={{ background: colors.bg, borderRadius: '100px', height: '10px', marginBottom: '18px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: cfg.color,
                    borderRadius: '100px',
                    transition: 'width 0.5s ease',
                  }} />
                </div>

                {/* Finance details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {[
                    { label: 'Presupuesto Anual', value: fmt(fondo.presupuestoAnual), color: 'var(--text-body)' },
                    { label: 'Gasto Ejecutado', value: fmt(fondo.gastoEjecutado), color: cfg.color },
                    { label: 'Saldo Disponible', value: fmt(fondo.saldoDisponible), color: colors.blue },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: colors.muted, fontSize: '13px' }}>{label}</span>
                      <span style={{ color, fontWeight: 600, fontSize: '13px' }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!loading && fondos.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: colors.muted }}>
          <Activity size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }} />
          <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-body)' }}>Sin datos de fondos</div>
          <div style={{ fontSize: '14px' }}>No se encontraron fondos registrados para el año actual.</div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
