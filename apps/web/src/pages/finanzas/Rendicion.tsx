import React, { useState, useEffect } from 'react';
import { RefreshCw, Send, CheckCircle, Clock, FileText, Inbox } from 'lucide-react';
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
  purple: '#8b5cf6',
};

type EstadoRendicion = 'BORRADOR' | 'EN_REVISION' | 'APROBADA_DIRECTOR' | 'ENVIADA_SUPEREDUC' | 'APROBADA_SUPEREDUC';

interface Rendicion {
  id: string;
  fondoId: string;
  periodo: string;
  mesInicio: number;
  mesFin: number;
  anio: number;
  totalIngresos: string;
  totalGastos: string;
  saldo: string;
  estado: EstadoRendicion;
  fondo: { nombre: string };
}

const estadoConfig: Record<EstadoRendicion, { color: string; label: string; bg: string }> = {
  BORRADOR: { color: colors.muted, label: 'Borrador', bg: 'var(--card)' },
  EN_REVISION: { color: colors.amber, label: 'En Revisión', bg: '#2a1f0a' },
  APROBADA_DIRECTOR: { color: colors.blue, label: 'Aprobada Director', bg: '#0e1f3d' },
  ENVIADA_SUPEREDUC: { color: colors.purple, label: 'Enviada SuperEduc', bg: '#1e1535' },
  APROBADA_SUPEREDUC: { color: colors.green, label: 'Aprobada SuperEduc', bg: '#0e2218' },
};

const ALL_ESTADOS: (EstadoRendicion | 'TODOS')[] = [
  'TODOS', 'BORRADOR', 'EN_REVISION', 'APROBADA_DIRECTOR', 'ENVIADA_SUPEREDUC', 'APROBADA_SUPEREDUC',
];

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Rendicion() {
  const [items, setItems] = useState<Rendicion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoRendicion | 'TODOS'>('TODOS');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/finanzas/rendicion');
      setItems(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar rendiciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAprobar = async (id: string) => {
    setActionLoading(id + '-aprobar');
    try {
      await api.post(`/finanzas/rendicion/${id}/aprobar`);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Error al aprobar');
    } finally {
      setActionLoading(null);
    }
  };

  const handleEnviar = async (id: string) => {
    setActionLoading(id + '-enviar');
    try {
      await api.post(`/finanzas/rendicion/${id}/enviar`);
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Error al enviar');
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filtroEstado === 'TODOS' ? items : items.filter(r => r.estado === filtroEstado);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Rendiciones SEP / Subvención</h1>
          <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Gestión y seguimiento de rendiciones a SuperEduc</p>
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

      {/* Estado filter tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '6px' }}>
        {ALL_ESTADOS.map(est => {
          const cfg = est === 'TODOS' ? { color: colors.blue, label: 'Todos' } : estadoConfig[est];
          const count = est === 'TODOS' ? items.length : items.filter(r => r.estado === est).length;
          const active = filtroEstado === est;
          return (
            <button
              key={est}
              onClick={() => setFiltroEstado(est)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                background: active ? cfg.color + '20' : 'transparent',
                color: active ? cfg.color : colors.muted,
                borderBottom: active ? `2px solid ${cfg.color}` : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {cfg.label}
              <span style={{ background: active ? cfg.color + '30' : 'var(--card-deep)', color: active ? cfg.color : colors.muted, borderRadius: '10px', padding: '1px 7px', fontSize: '11px' }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
          <Inbox size={40} style={{ color: colors.muted, marginBottom: '14px', opacity: 0.5 }} />
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin rendiciones</div>
          <div style={{ color: colors.muted, fontSize: '13px' }}>
            {filtroEstado === 'TODOS' ? 'No hay rendiciones registradas.' : `No hay rendiciones en estado "${estadoConfig[filtroEstado as EstadoRendicion]?.label}".`}
          </div>
        </div>
      ) : (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Fondo', 'Período', 'Ingresos', 'Gastos', 'Saldo', 'Estado', 'Acciones'].map(h => (
                    <th key={h} style={{
                      padding: '12px 16px',
                      textAlign: ['Ingresos', 'Gastos', 'Saldo', 'Acciones'].includes(h) ? 'right' : 'left',
                      color: colors.muted, fontWeight: 600, fontSize: '12px',
                      borderBottom: `1px solid ${colors.border}`,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const cfg = estadoConfig[r.estado];
                  const ingresos = parseFloat(r.totalIngresos) || 0;
                  const gastos = parseFloat(r.totalGastos) || 0;
                  const saldo = parseFloat(r.saldo) || 0;
                  const periodo = r.mesInicio === r.mesFin
                    ? `${MESES[r.mesInicio]} ${r.anio}`
                    : `${MESES[r.mesInicio]} – ${MESES[r.mesFin]} ${r.anio}`;
                  const canAprobar = r.estado === 'BORRADOR' || r.estado === 'EN_REVISION';
                  const canEnviar = r.estado === 'APROBADA_DIRECTOR';

                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '32px', height: '32px', background: 'var(--card-deep)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FileText size={14} style={{ color: colors.blue }} />
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.fondo.nombre}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: colors.muted }}>
                        <div>{periodo}</div>
                        <div style={{ fontSize: '11px', textTransform: 'capitalize', color: colors.muted + '80' }}>{r.periodo}</div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.green, fontWeight: 500 }}>{fmt(ingresos)}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: gastos > 0 ? colors.red : colors.muted, fontWeight: 500 }}>
                        {gastos > 0 ? fmt(gastos) : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: saldo >= 0 ? colors.blue : colors.red, fontWeight: 600 }}>{fmt(saldo)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                          borderRadius: '20px', padding: '4px 11px',
                          fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          {canAprobar && (
                            <button
                              disabled={actionLoading === r.id + '-aprobar'}
                              onClick={() => handleAprobar(r.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '6px 12px', background: colors.green + '20',
                                border: `1px solid ${colors.green}60`, borderRadius: '7px',
                                color: colors.green, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                              }}
                            >
                              <CheckCircle size={12} />
                              Aprobar
                            </button>
                          )}
                          {canEnviar && (
                            <button
                              disabled={actionLoading === r.id + '-enviar'}
                              onClick={() => handleEnviar(r.id)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: '5px',
                                padding: '6px 12px', background: colors.purple + '20',
                                border: `1px solid ${colors.purple}60`, borderRadius: '7px',
                                color: colors.purple, fontWeight: 600, fontSize: '12px', cursor: 'pointer',
                              }}
                            >
                              <Send size={12} />
                              Enviar a SuperEduc
                            </button>
                          )}
                          {!canAprobar && !canEnviar && (
                            <span style={{ color: colors.muted, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Clock size={12} />
                              {r.estado === 'APROBADA_SUPEREDUC' ? 'Finalizada' : 'En curso'}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
