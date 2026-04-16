import React, { useState, useEffect } from 'react';
import {
  RefreshCw, AlertTriangle, Search, ExternalLink,
  Building2, Inbox, FileText, Plus, X, Clock,
} from 'lucide-react';
import api from '../../api/client';

const C = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)',
  muted: 'var(--muted)', green: '#10b981', amber: '#f59e0b',
  red: '#ef4444', blue: '#3b82f6',
};

// ─── Backend shapes ───────────────────────────────────────────────────────────

interface ContratoProveedor {
  id: string;
  tipoServicio?: string;
  fechaTermino?: string;   // backend uses fechaTermino, not fechaVencimiento
  estado?: string;
}

interface Proveedor {
  id: string;
  rut: string;
  razonSocial: string;
  giro?: string;
  email?: string;
  contratos: ContratoProveedor[];
}

interface ContratoVencer {
  id: string;
  proveedorId: string;
  fechaTermino?: string;
  diasRestantes: number;
  proveedor?: { id: string; rut: string; razonSocial: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

function proximoVencimiento(contratos: ContratoProveedor[]) {
  const upcoming = contratos
    .filter(c => c.fechaTermino)
    .map(c => ({ fecha: c.fechaTermino!, dias: daysUntil(c.fechaTermino) ?? 9999 }))
    .filter(c => c.dias >= 0)
    .sort((a, b) => a.dias - b.dias);
  return upcoming[0] ?? null;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LoadingRow() {
  return (
    <tr>
      <td colSpan={7} style={{ padding: '56px 0', textAlign: 'center', color: C.muted }}>
        <RefreshCw
          size={20}
          style={{ display: 'inline', marginRight: 10, animation: 'spin 1s linear infinite' }}
        />
        Cargando proveedores...
      </td>
    </tr>
  );
}

function EmptyState({ search, onNew }: { search: string; onNew: () => void }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '64px 24px', background: C.card,
      border: `1px solid ${C.border}`, borderRadius: 12,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 12, background: `${C.blue}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
      }}>
        <Inbox size={26} style={{ color: C.blue, opacity: 0.7 }} />
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
        {search ? 'Sin resultados' : 'Sin proveedores registrados'}
      </div>
      <div style={{ color: C.muted, fontSize: 13, marginBottom: 24, textAlign: 'center' }}>
        {search
          ? `No se encontraron proveedores para "${search}".`
          : 'Agrega el primer proveedor para comenzar a gestionar contratos.'}
      </div>
      {!search && (
        <button
          onClick={onNew}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: C.blue, color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 20px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Plus size={15} /> Nuevo Proveedor
        </button>
      )}
    </div>
  );
}

// ─── Modal: Nuevo Proveedor ───────────────────────────────────────────────────

const EMPTY_PROV = { rut: '', razonSocial: '', giro: '', direccion: '', telefono: '', email: '', contactoNombre: '', banco: '' };

function ModalNuevoProveedor({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_PROV });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.rut.trim() || !form.razonSocial.trim()) { setErr('RUT y Razón Social son obligatorios.'); return; }
    setSaving(true); setErr(null);
    try {
      const body: Record<string, string> = { rut: form.rut, razonSocial: form.razonSocial };
      if (form.giro) body.giro = form.giro;
      if (form.direccion) body.direccion = form.direccion;
      if (form.telefono) body.telefono = form.telefono;
      if (form.email) body.email = form.email;
      if (form.contactoNombre) body.contactoNombre = form.contactoNombre;
      if (form.banco) body.banco = form.banco;
      await api.post('/finanzas/proveedores', body);
      onSaved();
      onClose();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? ex?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--card-deep)', border: `1px solid ${C.border}`,
    borderRadius: 7, color: 'var(--text-body)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4, display: 'block' };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 520, padding: 28, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo Proveedor</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        {err && <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}60`, borderRadius: 7, padding: '9px 14px', color: C.red, fontSize: 12, marginBottom: 14 }}>{err}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={fieldStyle}>
              <label style={labelStyle}>RUT *</label>
              <input style={inputStyle} value={form.rut} onChange={set('rut')} placeholder="76.123.456-7" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Razón Social *</label>
              <input style={inputStyle} value={form.razonSocial} onChange={set('razonSocial')} placeholder="Empresa Ltda." required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Giro</label>
              <input style={inputStyle} value={form.giro} onChange={set('giro')} placeholder="Servicios educacionales" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Dirección</label>
              <input style={inputStyle} value={form.direccion} onChange={set('direccion')} placeholder="Av. Ejemplo 123" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} value={form.telefono} onChange={set('telefono')} placeholder="+56 9 1234 5678" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={set('email')} placeholder="contacto@empresa.cl" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Nombre Contacto</label>
              <input style={inputStyle} value={form.contactoNombre} onChange={set('contactoNombre')} placeholder="Juan Pérez" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Banco</label>
              <input style={inputStyle} value={form.banco} onChange={set('banco')} placeholder="Banco de Chile" />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: 'var(--text-body)', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal: Nuevo Contrato ────────────────────────────────────────────────────

const FONDOS = ['Subvención General', 'SEP', 'PIE', 'FAEP'];
const EMPTY_CONTRATO = { tipoServicio: '', numeroContrato: '', montoTotal: '', montoMensual: '', fechaInicio: '', fechaTermino: '', fondoImputacion: '' };

function ModalNuevoContrato({ proveedor, onClose, onSaved }: { proveedor: Proveedor; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ ...EMPTY_CONTRATO });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.tipoServicio.trim() || !form.fechaInicio) { setErr('Tipo de Servicio y Fecha de Inicio son obligatorios.'); return; }
    setSaving(true); setErr(null);
    try {
      const body: Record<string, string | number> = { tipoServicio: form.tipoServicio, fechaInicio: form.fechaInicio };
      if (form.numeroContrato) body.numeroContrato = form.numeroContrato;
      if (form.montoTotal) body.montoTotal = Number(form.montoTotal);
      if (form.montoMensual) body.montoMensual = Number(form.montoMensual);
      if (form.fechaTermino) body.fechaTermino = form.fechaTermino;
      if (form.fondoImputacion) body.fondoImputacion = form.fondoImputacion;
      await api.post(`/finanzas/proveedores/${proveedor.id}/contratos`, body);
      onSaved();
      onClose();
    } catch (ex: any) {
      setErr(ex?.response?.data?.message ?? ex?.message ?? 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px',
    background: 'var(--card-deep)', border: `1px solid ${C.border}`,
    borderRadius: 7, color: 'var(--text-body)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 4, display: 'block' };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, width: '100%', maxWidth: 520, padding: 28, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)' }}>Nuevo Contrato</h2>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <p style={{ margin: '0 0 18px', fontSize: 12, color: C.muted }}>Proveedor: <strong style={{ color: 'var(--text-body)' }}>{proveedor.razonSocial}</strong></p>
        {err && <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}60`, borderRadius: 7, padding: '9px 14px', color: C.red, fontSize: 12, marginBottom: 14 }}>{err}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ ...fieldStyle, gridColumn: '1 / -1' }}>
              <label style={labelStyle}>Tipo de Servicio *</label>
              <input style={inputStyle} value={form.tipoServicio} onChange={set('tipoServicio')} placeholder="Ej: Mantención de equipos" required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>N° de Contrato</label>
              <input style={inputStyle} value={form.numeroContrato} onChange={set('numeroContrato')} placeholder="CTR-2024-001" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fondo de Imputación</label>
              <select style={{ ...inputStyle }} value={form.fondoImputacion} onChange={set('fondoImputacion')}>
                <option value="">Sin fondo</option>
                {FONDOS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Monto Total</label>
              <input style={inputStyle} type="number" min="0" value={form.montoTotal} onChange={set('montoTotal')} placeholder="0" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Monto Mensual</label>
              <input style={inputStyle} type="number" min="0" value={form.montoMensual} onChange={set('montoMensual')} placeholder="0" />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fecha de Inicio *</label>
              <input style={inputStyle} type="date" value={form.fechaInicio} onChange={set('fechaInicio')} required />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle}>Fecha de Término</label>
              <input style={inputStyle} type="date" value={form.fechaTermino} onChange={set('fechaTermino')} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 18px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 8, color: 'var(--text-body)', fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving} style={{ padding: '9px 20px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [porVencer, setPorVencer] = useState<ContratoVencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [detalle, setDetalle] = useState<Proveedor | null>(null);
  const [showNuevoProveedor, setShowNuevoProveedor] = useState(false);
  const [contratoTarget, setContratoTarget] = useState<Proveedor | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Run both fetches; tolerate failure of por-vencer (non-critical)
      const provRes = await api.get('/finanzas/proveedores');
      setProveedores(provRes.data.data ?? []);

      try {
        const vencRes = await api.get('/finanzas/proveedores/contratos/por-vencer');
        // Backend returns { data: { contratos: [...], total: N } }
        const payload = vencRes.data?.data;
        const arr: ContratoVencer[] = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.contratos)
            ? payload.contratos
            : [];
        setPorVencer(arr);
      } catch {
        setPorVencer([]);
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Error al cargar proveedores';
      setError(String(msg));
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filtered = proveedores.filter(p =>
    p.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
    p.rut.includes(search) ||
    (p.giro ?? '').toLowerCase().includes(search.toLowerCase())
  );

  // Build a Set of proveedorIds that have contracts about to expire
  const proveedoresEnAlerta = new Set(
    porVencer.map(c => c.proveedorId ?? c.proveedor?.id).filter(Boolean)
  );

  const thStyle: React.CSSProperties = {
    padding: '11px 16px', textAlign: 'left',
    color: C.muted, fontWeight: 600, fontSize: 12,
    borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
  };
  const tdStyle: React.CSSProperties = {
    padding: '13px 16px', fontSize: 13,
    borderBottom: `1px solid ${C.border}20`, verticalAlign: 'middle',
  };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px', color: 'var(--text-body)' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Proveedores y Contratos
          </h1>
          <p style={{ color: C.muted, margin: '4px 0 0', fontSize: 13 }}>
            Gestión de proveedores y seguimiento contractual
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={fetchData}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 14px', background: C.card,
              border: `1px solid ${C.border}`, borderRadius: 8,
              color: 'var(--text-body)', cursor: 'pointer', fontSize: 13,
            }}
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Actualizar
          </button>
          <button
            onClick={() => setShowNuevoProveedor(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', background: C.blue,
              border: 'none', borderRadius: 8,
              color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}
          >
            <Plus size={14} /> Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* ── Alert por vencer ── */}
      {porVencer.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: '#2a1f0a', border: `1px solid ${C.amber}60`,
          borderRadius: 10, padding: '13px 18px', marginBottom: 20,
        }}>
          <AlertTriangle size={18} style={{ color: C.amber, flexShrink: 0 }} />
          <span style={{ color: 'var(--text-body)', fontSize: 13 }}>
            <strong style={{ color: C.amber }}>Atención: </strong>
            {porVencer.length} contrato{porVencer.length > 1 ? 's' : ''} próximo{porVencer.length > 1 ? 's' : ''} a vencer en los próximos 30 días.
          </span>
        </div>
      )}

      {/* ── Error banner ── */}
      {error && (
        <div style={{
          background: '#2d1b1b', border: `1px solid ${C.red}60`,
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <AlertTriangle size={15} />
          {error}
        </div>
      )}

      {/* ── Search ── */}
      <div style={{ position: 'relative', marginBottom: 20, maxWidth: 380 }}>
        <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por razón social, RUT o giro..."
          style={{
            width: '100%', padding: '9px 12px 9px 34px',
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 8, color: 'var(--text-body)', fontSize: 13,
            outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* ── Content ── */}
      {!loading && filtered.length === 0 ? (
        <EmptyState search={search} onNew={() => setShowNuevoProveedor(true)} />
      ) : (
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  <th style={thStyle}>RUT</th>
                  <th style={thStyle}>Razón Social</th>
                  <th style={thStyle}>Giro</th>
                  <th style={thStyle}>Email</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Contratos</th>
                  <th style={thStyle}>Próx. Vencimiento</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <LoadingRow />
                ) : (
                  filtered.map(p => {
                    const prox = proximoVencimiento(p.contratos ?? []);
                    const isNearExpiry = prox !== null && prox.dias <= 30;
                    const hasAlert = proveedoresEnAlerta.has(p.id);

                    return (
                      <tr
                        key={p.id}
                        style={{
                          borderBottom: `1px solid ${C.border}20`,
                          background: hasAlert ? `${C.amber}08` : 'transparent',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => !hasAlert && (e.currentTarget.style.background = 'rgba(42,58,74,0.3)')}
                        onMouseLeave={e => (e.currentTarget.style.background = hasAlert ? `${C.amber}08` : 'transparent')}
                      >
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: C.muted }}>
                          {p.rut}
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, background: 'var(--card-deep)', borderRadius: 8,
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Building2 size={14} color={C.blue} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.razonSocial}</div>
                              {hasAlert && (
                                <div style={{ fontSize: 11, color: C.amber, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                  <AlertTriangle size={10} /> Contrato por vencer
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={{ ...tdStyle, color: C.muted, maxWidth: 160 }}>
                          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {p.giro || '—'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, color: C.blue, fontSize: 12 }}>
                          {p.email || <span style={{ color: C.muted }}>—</span>}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'var(--card-deep)',
                            color: (p.contratos?.length ?? 0) > 0 ? C.green : C.muted,
                            borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                          }}>
                            <FileText size={11} />
                            {p.contratos?.length ?? 0}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {prox ? (
                            <div>
                              <div style={{ color: isNearExpiry ? C.amber : 'var(--text-body)', fontSize: 13, fontWeight: 500 }}>
                                {new Date(prox.fecha).toLocaleDateString('es-CL')}
                              </div>
                              <div style={{ fontSize: 11, color: isNearExpiry ? C.amber : C.muted, display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
                                {isNearExpiry && <Clock size={10} />}
                                {isNearExpiry ? `${prox.dias} días restantes` : `en ${prox.dias} días`}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: C.muted }}>—</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6 }}>
                            <button
                              onClick={() => setDetalle(detalle?.id === p.id ? null : p)}
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', background: `${C.blue}20`,
                                border: `1px solid ${C.blue}60`, borderRadius: 7,
                                color: C.blue, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                              }}
                            >
                              <ExternalLink size={12} /> Ver detalle
                            </button>
                            <button
                              onClick={() => setContratoTarget(p)}
                              title="Agregar Contrato"
                              style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '6px 12px', background: `${C.green}20`,
                                border: `1px solid ${C.green}60`, borderRadius: 7,
                                color: C.green, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                              }}
                            >
                              <Plus size={12} /> Contrato
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          {!loading && (
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${C.border}`, color: C.muted, fontSize: 12 }}>
              {filtered.length} proveedor{filtered.length !== 1 ? 'es' : ''} · {proveedores.length} en total
            </div>
          )}
        </div>
      )}

      {/* ── Detalle panel ── */}
      {detalle && (
        <div style={{
          marginTop: 20, background: C.card,
          border: `1px solid ${C.blue}40`, borderRadius: 12, padding: 20,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
              {detalle.razonSocial} — Contratos vigentes
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => setContratoTarget(detalle)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', background: `${C.green}20`,
                  border: `1px solid ${C.green}60`, borderRadius: 7,
                  color: C.green, fontWeight: 600, fontSize: 12, cursor: 'pointer',
                }}
              >
                <Plus size={12} /> Agregar Contrato
              </button>
              <button onClick={() => setDetalle(null)} style={{ background: 'transparent', border: 'none', color: C.muted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>
                <X size={18} />
              </button>
            </div>
          </div>
          {!detalle.contratos?.length ? (
            <p style={{ color: C.muted, margin: 0, fontSize: 13 }}>Sin contratos registrados.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detalle.contratos.map(c => {
                const dias = daysUntil(c.fechaTermino);
                const isNear = dias !== null && dias <= 30;
                return (
                  <div key={c.id} style={{
                    background: 'var(--card-deep)', borderRadius: 8, padding: '12px 16px',
                    border: `1px solid ${isNear ? C.amber + '50' : C.border}`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-body)', fontSize: 13 }}>
                        {c.tipoServicio || `Contrato ${c.id.slice(0, 8)}`}
                      </span>
                      {c.fechaTermino && (
                        <span style={{ color: isNear ? C.amber : C.muted, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {isNear && <AlertTriangle size={11} />}
                          Vence: {new Date(c.fechaTermino).toLocaleDateString('es-CL')}
                          {dias !== null && <span style={{ marginLeft: 4 }}>({dias}d)</span>}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {showNuevoProveedor && (
        <ModalNuevoProveedor
          onClose={() => setShowNuevoProveedor(false)}
          onSaved={fetchData}
        />
      )}

      {contratoTarget && (
        <ModalNuevoContrato
          proveedor={contratoTarget}
          onClose={() => setContratoTarget(null)}
          onSaved={() => {
            fetchData();
            // Refresh detalle if it matches the target
            if (detalle?.id === contratoTarget.id) {
              setDetalle(null);
            }
          }}
        />
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
