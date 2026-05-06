import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Inbox, PlusCircle, Receipt } from 'lucide-react';
import api from '../../api/client';

const C = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#06b6d4',
  purple: '#8b5cf6',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const MESES = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface SupereducCuenta { codigo: string; nombre: string; tipo: string; }
interface Fondo { id: string; nombre: string; }

interface Movimiento {
  id: string;
  tipo: string;
  categoria: string;
  subcategoria: string | null;
  monto: string;
  fecha: string;
  mes: number;
  anio: number;
  descripcion: string | null;
  numeroFactura: string | null;
  rutProveedor: string | null;
  supereducCuenta: SupereducCuenta | null;
  fondo: Fondo | null;
}

function InputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '8px 12px', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const, ...extra,
  };
}

export default function MovimientosSupereduc() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filtroFondo, setFiltroFondo] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(String(new Date().getFullYear()));
  const [filtroMes, setFiltroMes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (filtroFondo) params.fondoId = filtroFondo;
      if (filtroAnio) params.anio = filtroAnio;
      if (filtroMes) params.mes = filtroMes;
      const res = await api.get('/finanzas/rendicion/supereduc/movimientos', { params });
      setItems(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Error al cargar movimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filtroAnio, filtroMes, filtroFondo]);

  const fondosUnicos = useMemo(() => {
    const map = new Map<string, string>();
    items.forEach(m => { if (m.fondo) map.set(m.fondo.id, m.fondo.nombre); });
    return Array.from(map.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [items]);

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(m =>
      m.supereducCuenta?.codigo.includes(q) ||
      m.supereducCuenta?.nombre.toLowerCase().includes(q) ||
      (m.descripcion ?? '').toLowerCase().includes(q) ||
      (m.numeroFactura ?? '').toLowerCase().includes(q) ||
      (m.rutProveedor ?? '').includes(q),
    );
  }, [items, search]);

  const totalMonto = filtered.reduce((s, m) => s + parseFloat(m.monto || '0'), 0);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: 'var(--text-body)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: C.purple + '20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} style={{ color: C.purple }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Movimientos SuperEduc</h1>
            <p style={{ color: C.muted, margin: '2px 0 0', fontSize: '13px' }}>Egresos vinculados al plan de cuentas SuperEduc 2026</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchData} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', color: 'var(--text-body)', cursor: 'pointer', fontSize: '13px' }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          <button
            onClick={() => navigate('/finanzas/rendicion/movimientos/nuevo')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: C.blue, border: 'none', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}
          >
            <PlusCircle size={13} />
            Nuevo
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: C.red, fontSize: '13px' }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px', marginBottom: '20px' }}>
        {[
          { label: 'Total movimientos', value: filtered.length, fmt: (v: number) => String(v), color: C.blue },
          { label: 'Total registrado', value: totalMonto, fmt: (v: number) => fmt(v), color: C.red },
        ].map(k => (
          <div key={k.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 18px', borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '6px' }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.fmt(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: '180px', maxWidth: '340px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por cuenta, glosa, proveedor…"
            style={{ ...InputStyle(), paddingLeft: '32px' }}
          />
        </div>

        {/* Año */}
        <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} style={InputStyle({ flex: '0 1 110px' })}>
          {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
        </select>

        {/* Mes */}
        <select value={filtroMes} onChange={e => setFiltroMes(e.target.value)} style={InputStyle({ flex: '0 1 130px' })}>
          <option value="">Todos los meses</option>
          {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
        </select>

        {/* Fondo */}
        <select value={filtroFondo} onChange={e => setFiltroFondo(e.target.value)} style={InputStyle({ flex: '0 1 200px' })}>
          <option value="">Todos los fondos</option>
          {fondosUnicos.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px' }}>
          <Inbox size={40} style={{ color: C.muted, marginBottom: '14px', opacity: 0.5 }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin movimientos</div>
          <div style={{ color: C.muted, fontSize: '13px', marginBottom: '18px' }}>No hay movimientos SuperEduc para el período seleccionado.</div>
          <button
            onClick={() => navigate('/finanzas/rendicion/movimientos/nuevo')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: C.blue, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
          >
            <PlusCircle size={13} /> Registrar movimiento
          </button>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Fecha', 'Cuenta', 'Fondo', 'Doc', 'Monto', 'Proveedor', 'Glosa'].map(h => (
                    <th key={h} style={{
                      padding: '11px 14px', textAlign: h === 'Monto' ? 'right' : 'left',
                      color: C.muted, fontWeight: 600, fontSize: '11px',
                      borderBottom: `1px solid ${C.border}`,
                      whiteSpace: 'nowrap', letterSpacing: '0.04em', textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const monto = parseFloat(m.monto || '0');
                  const fechaObj = new Date(m.fecha);
                  const fechaStr = `${String(fechaObj.getUTCDate()).padStart(2, '0')} ${MESES[m.mes]} ${m.anio}`;
                  return (
                    <tr key={m.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                      <td style={{ padding: '10px 14px', color: C.muted, whiteSpace: 'nowrap', fontSize: '12px' }}>
                        {fechaStr}
                      </td>
                      <td style={{ padding: '10px 14px', maxWidth: '220px' }}>
                        <div style={{ fontFamily: 'monospace', color: C.blue, fontSize: '12px', fontWeight: 600 }}>{m.supereducCuenta?.codigo}</div>
                        <div style={{ color: 'var(--text-body)', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                          {m.supereducCuenta?.nombre}
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: C.muted, fontSize: '12px', whiteSpace: 'nowrap' }}>
                        {m.fondo?.nombre ?? '—'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        {m.subcategoria ? (
                          <span style={{ background: C.purple + '20', color: C.purple, border: `1px solid ${C.purple}40`, borderRadius: '4px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                            {m.subcategoria}
                          </span>
                        ) : (
                          <span style={{ color: C.muted, fontSize: '12px' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', color: C.red, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {fmt(monto)}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px' }}>
                        <div style={{ color: 'var(--text-body)' }}>{m.rutProveedor || '—'}</div>
                        {m.numeroFactura && (
                          <div style={{ color: C.muted, fontSize: '11px' }}>{m.numeroFactura}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '12px', color: C.muted, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {m.descripcion || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--card-deep)', borderTop: `2px solid ${C.border}` }}>
                  <td colSpan={4} style={{ padding: '10px 14px', fontSize: '12px', fontWeight: 600, color: C.muted }}>
                    Total — {filtered.length} movimiento{filtered.length !== 1 ? 's' : ''}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right', color: C.red, fontWeight: 700, fontSize: '14px' }}>
                    {fmt(totalMonto)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
