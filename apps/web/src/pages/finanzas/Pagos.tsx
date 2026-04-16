import React, { useState, useEffect } from 'react';
import { RefreshCw, DollarSign, AlertTriangle, Users, Inbox } from 'lucide-react';
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

type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'MOROSO';
type TabType = 'todos' | 'morosos';

interface Alumno {
  id: string;
  nombre?: string;
  apellido?: string;
  rut?: string;
  curso?: string;
}

interface Pago {
  id: string;
  alumnoId: string;
  mes: number;
  anio: number;
  monto: number;
  estado: EstadoPago;
  metodo?: string;
  fechaPago?: string;
  alumno: Alumno;
}

const estadoConfig: Record<EstadoPago, { color: string; label: string; bg: string }> = {
  PAGADO: { color: colors.green, label: 'Pagado', bg: '#0e2218' },
  PENDIENTE: { color: colors.amber, label: 'Pendiente', bg: '#2a1f0a' },
  MOROSO: { color: colors.red, label: 'Moroso', bg: '#2d1515' },
};

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_SHORT = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const METODOS: Record<string, string> = {
  TRANSFERENCIA: 'Transferencia',
  EFECTIVO: 'Efectivo',
  CHEQUE: 'Cheque',
  WEBPAY: 'WebPay',
};

export default function Pagos() {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [morosos, setMorosos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('todos');
  const [filtroMes, setFiltroMes] = useState<number>(0);
  const [filtroAnio, setFiltroAnio] = useState<number>(2026);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pagosRes, morososRes] = await Promise.all([
        api.get('/finanzas/pagos'),
        api.get('/finanzas/pagos/morosos'),
      ]);
      setPagos(pagosRes.data.data ?? []);
      setMorosos(morososRes.data.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const baseItems = tab === 'todos' ? pagos : morosos;

  const filtered = baseItems.filter(p => {
    if (filtroMes && p.mes !== filtroMes) return false;
    if (filtroAnio && p.anio !== filtroAnio) return false;
    return true;
  });

  const totalRecaudado = pagos.filter(p => p.estado === 'PAGADO').reduce((s, p) => s + p.monto, 0);
  const totalMorosoMonto = morosos.reduce((s, p) => s + p.monto, 0);

  const alumnoNombre = (a: Alumno) =>
    a.nombre ? `${a.nombre} ${a.apellido || ''}`.trim() : `Alumno ${a.id.slice(0, 6)}`;

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Pagos de Aranceles</h1>
          <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Recaudación y seguimiento de pagos de apoderados</p>
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

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${colors.green}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <DollarSign size={16} style={{ color: colors.green }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Total Recaudado</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: colors.green }}>{fmt(totalRecaudado)}</div>
        </div>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${colors.red}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} style={{ color: colors.red }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Total Morosos</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, color: colors.red }}>{morosos.length}</span>
            <span style={{ fontSize: '13px', color: colors.muted }}>alumnos</span>
          </div>
          <div style={{ fontSize: '14px', color: colors.red + 'cc', marginTop: '4px', fontWeight: 600 }}>{fmt(totalMorosoMonto)}</div>
        </div>
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', padding: '18px', borderLeft: `3px solid ${colors.blue}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Users size={16} style={{ color: colors.blue }} />
            <span style={{ color: colors.muted, fontSize: '12px', fontWeight: 500 }}>Total Registros</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: colors.blue }}>{pagos.length}</div>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '9px', padding: '4px' }}>
          {([
            { key: 'todos', label: 'Todos', count: pagos.length },
            { key: 'morosos', label: 'Morosos', count: morosos.length, color: colors.red },
          ] as { key: TabType; label: string; count: number; color?: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 16px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                background: tab === t.key ? (t.color ? t.color + '20' : colors.blue + '20') : 'transparent',
                color: tab === t.key ? (t.color ?? colors.blue) : colors.muted,
              }}
            >
              {t.label}
              <span style={{
                background: tab === t.key ? (t.color ?? colors.blue) + '30' : 'var(--card-deep)',
                color: tab === t.key ? (t.color ?? colors.blue) : colors.muted,
                borderRadius: '10px', padding: '1px 7px', fontSize: '11px',
              }}>
                {t.count}
              </span>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <select
            value={filtroMes}
            onChange={e => setFiltroMes(Number(e.target.value))}
            style={{ padding: '8px 12px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px', cursor: 'pointer' }}
          >
            <option value={0}>Todos los meses</option>
            {MESES.slice(1).map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={filtroAnio}
            onChange={e => setFiltroAnio(Number(e.target.value))}
            style={{ padding: '8px 12px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px', cursor: 'pointer' }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
          <Inbox size={40} style={{ color: colors.muted, marginBottom: '14px', opacity: 0.5 }} />
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin pagos</div>
          <div style={{ color: colors.muted, fontSize: '13px' }}>
            {tab === 'morosos' ? 'No hay alumnos morosos con los filtros seleccionados.' : 'No hay pagos registrados con los filtros seleccionados.'}
          </div>
        </div>
      ) : (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Alumno', 'Período', 'Monto', 'Método', 'Estado', 'Fecha Pago', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: ['Monto', 'Acciones'].includes(h) ? 'right' : ['Estado'].includes(h) ? 'center' : 'left',
                      color: colors.muted, fontWeight: 600, fontSize: '12px',
                      borderBottom: `1px solid ${colors.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const cfg = estadoConfig[p.estado] ?? estadoConfig.PENDIENTE;
                  return (
                    <tr key={p.id} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{alumnoNombre(p.alumno)}</div>
                          {p.alumno.rut && <div style={{ fontSize: '11px', color: colors.muted, fontFamily: 'monospace' }}>{p.alumno.rut}</div>}
                          {p.alumno.curso && <div style={{ fontSize: '11px', color: colors.blue }}>{p.alumno.curso}</div>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.muted }}>
                        {MESES_SHORT[p.mes]} {p.anio}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: 'var(--text-body)' }}>
                        {fmt(p.monto)}
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.muted }}>
                        {p.metodo ? (METODOS[p.metodo] ?? p.metodo) : <span style={{ color: colors.muted }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                          borderRadius: '20px', padding: '3px 11px',
                          fontSize: '11px', fontWeight: 700,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.muted, fontSize: '12px' }}>
                        {p.fechaPago
                          ? new Date(p.fechaPago).toLocaleDateString('es-CL')
                          : <span style={{ color: colors.muted }}>—</span>
                        }
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {p.estado === 'MOROSO' && (
                          <button style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', background: colors.amber + '20',
                            border: `1px solid ${colors.amber}60`, borderRadius: '7px',
                            color: colors.amber, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                          }}>
                            Notificar
                          </button>
                        )}
                        {p.estado === 'PENDIENTE' && (
                          <button style={{
                            display: 'inline-flex', alignItems: 'center', gap: '5px',
                            padding: '6px 12px', background: colors.green + '20',
                            border: `1px solid ${colors.green}60`, borderRadius: '7px',
                            color: colors.green, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                          }}>
                            Marcar Pagado
                          </button>
                        )}
                        {p.estado === 'PAGADO' && (
                          <span style={{ color: colors.muted, fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${colors.border}`, color: colors.muted, fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Mostrando {filtered.length} registros</span>
            <span>
              {filtroMes > 0 && `${MESES[filtroMes]} `}
              {filtroAnio}
            </span>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        select option { background: #1a2332; color: #e2e8f0; }
      `}</style>
    </div>
  );
}
