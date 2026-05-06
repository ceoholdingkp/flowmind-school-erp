import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Search, Inbox, X, ChevronRight, List, BookOpen } from 'lucide-react';
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

interface Subvencion { subvencion: string; }
interface Documento { tipoDoc: string; }

interface Cuenta {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  esAgrupadora: boolean;
  codigoPadre: string | null;
  subvenciones: Subvencion[];
  documentos: Documento[];
}

interface CuentaDetalle extends Cuenta {
  padre?: { codigo: string; nombre: string } | null;
  hijas?: { codigo: string; nombre: string; tipo: string; esAgrupadora: boolean }[];
}

const TIPO_COLORS: Record<string, string> = {
  GASTO: C.red,
  INGRESO: C.green,
  AJUSTE: C.amber,
};

function Badge({ label, color, small }: { label: string; color: string; small?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: color + '20', color, border: `1px solid ${color}40`,
      borderRadius: '20px', padding: small ? '2px 8px' : '4px 10px',
      fontSize: small ? '10px' : '11px', fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function InputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '8px 12px', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const, ...extra,
  };
}

function DrawerDetalle({ cuenta, onClose }: { cuenta: CuentaDetalle; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex' }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.45)' }} onClick={onClose} />
      <div style={{
        width: '420px', maxWidth: '90vw', background: C.card,
        borderLeft: `1px solid ${C.border}`, height: '100vh',
        overflowY: 'auto', padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: '20px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '12px', color: C.muted, marginBottom: '4px', fontWeight: 600, letterSpacing: '0.05em' }}>PLAN DE CUENTAS SUPEREDUC</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>{cuenta.codigo}</div>
            <div style={{ fontSize: '13px', color: 'var(--text-body)', marginTop: '4px' }}>{cuenta.nombre}</div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: C.muted }}>
            <X size={18} />
          </button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Badge label={cuenta.tipo} color={TIPO_COLORS[cuenta.tipo] ?? C.muted} />
          <Badge
            label={cuenta.esAgrupadora ? 'Agrupadora' : 'Operativa'}
            color={cuenta.esAgrupadora ? C.amber : C.blue}
          />
        </div>

        {/* Padre */}
        {cuenta.padre && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuenta padre</div>
            <div style={{ background: 'var(--card-deep)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px' }}>
              <span style={{ color: C.blue, fontWeight: 600 }}>{cuenta.padre.codigo}</span>
              <span style={{ color: C.muted, marginLeft: '8px' }}>{cuenta.padre.nombre}</span>
            </div>
          </div>
        )}

        {/* Subvenciones */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Subvenciones habilitadas ({cuenta.subvenciones.length})
          </div>
          {cuenta.subvenciones.length === 0 ? (
            <div style={{ color: C.muted, fontSize: '13px', fontStyle: 'italic' }}>Ninguna</div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {cuenta.subvenciones.map(s => (
                <Badge key={s.subvencion} label={s.subvencion} color={C.cyan} />
              ))}
            </div>
          )}
        </div>

        {/* Documentos */}
        <div>
          <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Documentos aceptados ({cuenta.documentos.length})
          </div>
          {cuenta.documentos.length === 0 ? (
            <div style={{ color: C.muted, fontSize: '13px', fontStyle: 'italic' }}>Ninguno</div>
          ) : (
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {cuenta.documentos.map(d => (
                <Badge key={d.tipoDoc} label={d.tipoDoc} color={C.purple} />
              ))}
            </div>
          )}
        </div>

        {/* Cuentas hijas */}
        {cuenta.hijas && cuenta.hijas.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cuentas hijas ({cuenta.hijas.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {cuenta.hijas.map(h => (
                <div key={h.codigo} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'var(--card-deep)', borderRadius: '8px' }}>
                  <ChevronRight size={12} style={{ color: C.muted }} />
                  <span style={{ color: C.blue, fontSize: '12px', fontWeight: 600 }}>{h.codigo}</span>
                  <span style={{ color: 'var(--text-body)', fontSize: '12px', flex: 1 }}>{h.nombre}</span>
                  <Badge label={h.esAgrupadora ? 'AG' : 'OP'} color={h.esAgrupadora ? C.amber : C.green} small />
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={onClose} style={{
          marginTop: 'auto', padding: '10px', background: 'var(--card-deep)',
          border: `1px solid ${C.border}`, borderRadius: '8px',
          color: 'var(--text-body)', cursor: 'pointer', fontSize: '13px',
        }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default function PlanCuentasSupereduc() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroSubv, setFiltroSubv] = useState('');
  const [includeAgrupadoras, setIncludeAgrupadoras] = useState(false);
  const [drawerCuenta, setDrawerCuenta] = useState<CuentaDetalle | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/finanzas/rendicion/supereduc/cuentas', {
        params: { includeAgrupadoras: includeAgrupadoras ? 'true' : 'false' },
      });
      setCuentas(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Error al cargar cuentas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [includeAgrupadoras]);

  const openDetalle = async (codigo: string) => {
    try {
      const res = await api.get(`/finanzas/rendicion/supereduc/cuentas/${codigo}`);
      setDrawerCuenta(res.data.data);
    } catch { /* ignore */ }
  };

  const allSubvs = useMemo(() => {
    const s = new Set<string>();
    cuentas.forEach(c => c.subvenciones.forEach(sv => s.add(sv.subvencion)));
    return Array.from(s).sort();
  }, [cuentas]);

  const filtered = useMemo(() => {
    return cuentas.filter(c => {
      if (filtroTipo && c.tipo !== filtroTipo) return false;
      if (filtroSubv && !c.subvenciones.some(s => s.subvencion === filtroSubv)) return false;
      if (search) {
        const q = search.toLowerCase();
        return c.codigo.includes(q) || c.nombre.toLowerCase().includes(q);
      }
      return true;
    });
  }, [cuentas, filtroTipo, filtroSubv, search]);

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: 'var(--text-body)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{ width: '36px', height: '36px', background: C.blue + '20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={18} style={{ color: C.blue }} />
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Plan de Cuentas SuperEduc</h1>
          </div>
          <p style={{ color: C.muted, margin: '0 0 0 46px', fontSize: '13px' }}>
            {cuentas.length} cuentas cargadas · Año 2026
          </p>
        </div>
        <button
          onClick={fetchData} disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', color: 'var(--text-body)', cursor: 'pointer', fontSize: '13px' }}
        >
          <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
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
          { label: 'Total cuentas', value: cuentas.length, color: C.blue },
          { label: 'Operativas', value: cuentas.filter(c => !c.esAgrupadora).length, color: C.green },
          { label: 'Agrupadoras', value: cuentas.filter(c => c.esAgrupadora).length, color: C.amber },
          { label: 'Filtradas', value: filtered.length, color: C.purple },
        ].map(k => (
          <div key={k.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 18px', borderLeft: `3px solid ${k.color}` }}>
            <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '6px' }}>{k.label.toUpperCase()}</div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '18px' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: '200px', maxWidth: '380px' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código o nombre…"
            style={{ ...InputStyle(), paddingLeft: '32px' }}
          />
        </div>

        {/* Tipo */}
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} style={{ ...InputStyle({ flex: '0 1 150px' }) }}>
          <option value="">Todos los tipos</option>
          <option value="GASTO">GASTO</option>
          <option value="INGRESO">INGRESO</option>
          <option value="AJUSTE">AJUSTE</option>
        </select>

        {/* Subvención */}
        <select value={filtroSubv} onChange={e => setFiltroSubv(e.target.value)} style={{ ...InputStyle({ flex: '0 1 200px' }) }}>
          <option value="">Todas las subvenciones</option>
          {allSubvs.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {/* Toggle agrupadoras */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--text-body)', cursor: 'pointer', whiteSpace: 'nowrap' }}>
          <input
            type="checkbox" checked={includeAgrupadoras}
            onChange={e => setIncludeAgrupadoras(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          Incluir agrupadoras
        </label>
      </div>

      {/* Table */}
      {filtered.length === 0 && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px' }}>
          <Inbox size={40} style={{ color: C.muted, marginBottom: '14px', opacity: 0.5 }} />
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin resultados</div>
          <div style={{ color: C.muted, fontSize: '13px' }}>Ajusta los filtros de búsqueda.</div>
        </div>
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Código', 'Nombre', 'Tipo', 'Subvenciones', 'Documentos', ''].map(h => (
                    <th key={h} style={{
                      padding: '11px 16px', textAlign: 'left',
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
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: `1px solid ${C.border}20`, cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => openDetalle(c.codigo)}
                  >
                    <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: C.blue, fontWeight: 600, fontSize: '13px' }}>
                      {c.codigo}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {c.esAgrupadora && (
                          <List size={13} style={{ color: C.amber, flexShrink: 0 }} />
                        )}
                        <span style={{ color: 'var(--text-primary)', fontSize: '13px' }}>{c.nombre}</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <Badge label={c.tipo} color={TIPO_COLORS[c.tipo] ?? C.muted} small />
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {c.subvenciones.length === 0 ? (
                        <span style={{ color: C.muted, fontSize: '12px' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {c.subvenciones.slice(0, 3).map(s => (
                            <Badge key={s.subvencion} label={s.subvencion} color={C.cyan} small />
                          ))}
                          {c.subvenciones.length > 3 && (
                            <span style={{ color: C.muted, fontSize: '11px', alignSelf: 'center' }}>+{c.subvenciones.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      {c.documentos.length === 0 ? (
                        <span style={{ color: C.muted, fontSize: '12px' }}>—</span>
                      ) : (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {c.documentos.slice(0, 4).map(d => (
                            <Badge key={d.tipoDoc} label={d.tipoDoc} color={C.purple} small />
                          ))}
                          {c.documentos.length > 4 && (
                            <span style={{ color: C.muted, fontSize: '11px', alignSelf: 'center' }}>+{c.documentos.length - 4}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                      <ChevronRight size={14} style={{ color: C.muted }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, fontSize: '12px', color: C.muted }}>
            Mostrando {filtered.length} de {cuentas.length} cuentas · Click en una fila para ver detalle
          </div>
        </div>
      )}

      {drawerCuenta && <DrawerDetalle cuenta={drawerCuenta} onClose={() => setDrawerCuenta(null)} />}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
