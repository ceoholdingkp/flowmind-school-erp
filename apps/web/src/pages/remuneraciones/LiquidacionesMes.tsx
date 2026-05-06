import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DollarSign, RefreshCw, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
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
  gray: '#6b7280',
};

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  BORRADOR: { color: colors.gray, bg: 'rgba(107,114,128,0.12)', label: 'Borrador' },
  APROBADA: { color: colors.blue, bg: 'rgba(59,130,246,0.12)', label: 'Aprobada' },
  PAGADA: { color: colors.green, bg: 'rgba(22,163,74,0.12)', label: 'Pagada' },
};

interface Funcionario {
  nombres: string;
  apellidos: string;
  cargo: string;
  tipo: string;
}

interface Liquidacion {
  id: string;
  funcionario: Funcionario;
  sueldoBase: number;
  totalHaberes: number;
  totalDescuentos: number;
  sueldoLiquido: number;
  afp: string;
  salud: string;
  estado: string;
}

interface Totales {
  totalHaberes: number;
  totalLiquido: number;
  totalDescuentos: number;
}

interface LiquidacionesData {
  liquidaciones: Liquidacion[];
  totales: Totales;
}

export default function LiquidacionesMes() {
  const navigate = useNavigate();
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [anio, setAnio] = useState<number>(2026);
  const [data, setData] = useState<LiquidacionesData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/remuneraciones/liquidaciones', { params: { mes, anio } });
      setData(res.data);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al cargar liquidaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [mes, anio]);

  const handleGenerar = async () => {
    setActionLoading('generar');
    try {
      await api.post('/remuneraciones/liquidaciones/generar', { mes, anio });
      await fetchData();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al generar liquidaciones');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAprobar = async () => {
    setActionLoading('aprobar');
    try {
      await api.post('/remuneraciones/liquidaciones/aprobar', { mes, anio });
      await fetchData();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al aprobar liquidaciones');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarcarPagadas = async () => {
    setActionLoading('pagar');
    try {
      await api.post('/remuneraciones/liquidaciones/marcar-pagadas', { mes, anio });
      await fetchData();
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al marcar como pagadas');
    } finally {
      setActionLoading(null);
    }
  };

  const liquidaciones = data?.liquidaciones ?? [];
  const totales = data?.totales;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={22} style={{ color: colors.blue }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Liquidaciones de Sueldo</h1>
            <p style={{ color: colors.muted, margin: '3px 0 0', fontSize: '13px' }}>Gestión mensual de remuneraciones</p>
          </div>
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

      {/* Selectors */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mes</label>
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '8px 12px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', minWidth: 140 }}
          >
            {MESES.slice(1).map((nombre, idx) => (
              <option key={idx + 1} value={idx + 1}>{nombre}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Año</label>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            style={{ padding: '8px 12px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', minWidth: 100 }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
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
        {[
          { label: 'Total Haberes', value: totales?.totalHaberes ?? 0, color: colors.blue, Icon: TrendingUp, bg: 'rgba(59,130,246,0.08)' },
          { label: 'Total Descuentos', value: totales?.totalDescuentos ?? 0, color: colors.red, Icon: TrendingDown, bg: 'rgba(239,68,68,0.08)' },
          { label: 'Total Líquido', value: totales?.totalLiquido ?? 0, color: colors.green, Icon: CheckCircle, bg: 'rgba(22,163,74,0.08)' },
        ].map(({ label, value, color, Icon, bg }) => (
          <div key={label} style={{ background: bg, border: `1px solid ${color}30`, borderRadius: '12px', padding: '20px', borderLeft: `3px solid ${color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Icon size={16} style={{ color }} />
              <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>{label}</span>
            </div>
            {loading && !data
              ? <div style={{ height: 28, background: `${color}20`, borderRadius: 6, animation: 'pulse 1.5s ease-in-out infinite' }} />
              : <div style={{ fontSize: '22px', fontWeight: 800, color }}>{fmt(value)}</div>
            }
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <button
          onClick={handleGenerar}
          disabled={!!actionLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: colors.blue, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading === 'generar' ? 0.7 : 1 }}
        >
          {actionLoading === 'generar' ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <DollarSign size={14} />}
          Generar Mes
        </button>
        <button
          onClick={handleAprobar}
          disabled={!!actionLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'rgba(59,130,246,0.15)', border: `1px solid ${colors.blue}50`, borderRadius: '8px', color: colors.blue, fontWeight: 600, fontSize: '14px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading === 'aprobar' ? 0.7 : 1 }}
        >
          {actionLoading === 'aprobar' ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
          Aprobar Todas
        </button>
        <button
          onClick={handleMarcarPagadas}
          disabled={!!actionLoading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: 'rgba(22,163,74,0.15)', border: `1px solid ${colors.green}50`, borderRadius: '8px', color: colors.green, fontWeight: 600, fontSize: '14px', cursor: actionLoading ? 'not-allowed' : 'pointer', opacity: actionLoading === 'pagar' ? 0.7 : 1 }}
        >
          {actionLoading === 'pagar' ? <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={14} />}
          Marcar Pagadas
        </button>
      </div>

      {/* Table */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {['Funcionario', 'Cargo', 'Tipo', 'Sueldo Base', 'Haberes', 'Descuentos', 'Líquido', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: ['Sueldo Base', 'Haberes', 'Descuentos', 'Líquido'].includes(h) ? 'right' : 'left', color: colors.muted, fontWeight: 600, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loading && !data && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                  {Array.from({ length: 9 }).map((__, j) => (
                    <td key={j} style={{ padding: '14px 16px' }}>
                      <div style={{ height: 14, background: `${colors.muted}20`, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite', width: j === 0 ? 140 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Data rows */}
              {!loading && liquidaciones.map(liq => {
                const cfg = ESTADO_CONFIG[liq.estado] ?? ESTADO_CONFIG['BORRADOR'];
                return (
                  <tr
                    key={liq.id}
                    onClick={() => navigate(`/remuneraciones/liquidaciones/${liq.id}`)}
                    style={{ borderBottom: `1px solid ${colors.border}20`, cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{liq.funcionario.apellidos}, {liq.funcionario.nombres}</div>
                    </td>
                    <td style={{ padding: '13px 16px', color: 'var(--text-body)' }}>{liq.funcionario.cargo}</td>
                    <td style={{ padding: '13px 16px', color: colors.muted, fontSize: '12px' }}>{liq.funcionario.tipo}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: 'var(--text-body)', fontWeight: 500 }}>{fmt(liq.sueldoBase)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.blue, fontWeight: 500 }}>{fmt(liq.totalHaberes)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.red, fontWeight: 500 }}>{fmt(liq.totalDescuentos)}</td>
                    <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.green, fontWeight: 700 }}>{fmt(liq.sueldoLiquido)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-block', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); navigate(`/remuneraciones/liquidaciones/${liq.id}`); }}
                        style={{ padding: '5px 12px', background: 'rgba(59,130,246,0.12)', border: `1px solid ${colors.blue}40`, borderRadius: '6px', color: colors.blue, fontWeight: 600, fontSize: '12px', cursor: 'pointer' }}
                      >
                        Ver
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Totals row */}
              {!loading && totales && liquidaciones.length > 0 && (
                <tr style={{ background: 'var(--sidebar)', borderTop: `2px solid ${colors.border}` }}>
                  <td colSpan={4} style={{ padding: '13px 16px', fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px' }}>TOTALES ({liquidaciones.length} funcionarios)</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.blue, fontWeight: 700 }}>{fmt(totales.totalHaberes)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.red, fontWeight: 700 }}>{fmt(totales.totalDescuentos)}</td>
                  <td style={{ padding: '13px 16px', textAlign: 'right', color: colors.green, fontWeight: 800 }}>{fmt(totales.totalLiquido)}</td>
                  <td colSpan={2} />
                </tr>
              )}

              {/* Empty */}
              {!loading && liquidaciones.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '60px 20px', textAlign: 'center', color: colors.muted }}>
                    <DollarSign size={36} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: 6, color: 'var(--text-body)' }}>Sin liquidaciones</div>
                    <div style={{ fontSize: '13px' }}>No hay liquidaciones para {MESES[mes]} {anio}. Use "Generar Mes" para crearlas.</div>
                  </td>
                </tr>
              )}
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
