import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, AlertTriangle, CheckCircle, ChevronLeft, PlusCircle,
  Sparkles, Search, Star, Loader2,
} from 'lucide-react';
import api from '../../api/client';
import { useToastStore } from '../../store/toast.store';

// ── Constants ────────────────────────────────────────────────────

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

// ── Types ────────────────────────────────────────────────────────

interface CuentaBasica {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  subvenciones: { subvencion: string }[];
  documentos: { tipoDoc: string }[];
}

interface Proveedor {
  id: string;
  rut: string;
  razonSocial: string;
  giro?: string;
}

interface CuentaFrecuente {
  id: string;
  frecuencia: number;
  ultimoUso: string;
  cuenta: CuentaBasica;
}

interface Sugerencia {
  codigo: string;
  nombre: string;
  confianza: number;
  razon: string;
}

interface ValidationError {
  code: string;
  message: string;
}

interface Fondo {
  id: string;
  nombre: string;
}

// ── Helper components ─────────────────────────────────────────────

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: C.muted, marginBottom: '6px', letterSpacing: '0.03em' }}>
        {label.toUpperCase()}{required && <span style={{ color: C.red }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function IS(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '9px 12px', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const, ...extra,
  };
}

// Searchable select for proveedores
function ProveedorSelect({
  proveedores,
  value,
  onChange,
}: {
  proveedores: Proveedor[];
  value: string;
  onChange: (id: string, rut: string, nombre: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = proveedores.find(p => p.id === value);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const filtered = search
    ? proveedores.filter(p =>
        p.razonSocial.toLowerCase().includes(search.toLowerCase()) ||
        p.rut.includes(search),
      )
    : proveedores;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{ ...IS(), cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <span style={{ color: selected ? 'var(--text-body)' : C.muted }}>
          {selected ? `${selected.razonSocial} (${selected.rut})` : '— Selecciona un proveedor —'}
        </span>
        <span style={{ color: C.muted, fontSize: '10px' }}>▾</span>
      </div>
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)', marginTop: '4px',
          maxHeight: '280px', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '8px', borderBottom: `1px solid ${C.border}`, position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre o RUT…"
              style={{ ...IS({ paddingLeft: '34px', border: 'none', background: 'var(--card-deep)', borderRadius: '6px' }) }}
              onClick={e => e.stopPropagation()}
            />
          </div>
          {/* Clear option */}
          <div
            onClick={() => { onChange('', '', ''); setOpen(false); setSearch(''); }}
            style={{ padding: '9px 14px', fontSize: '13px', color: C.muted, cursor: 'pointer', borderBottom: `1px solid ${C.border}20` }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Sin proveedor
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: C.muted, fontSize: '13px' }}>Sin resultados</div>
            ) : (
              filtered.map(p => (
                <div
                  key={p.id}
                  onClick={() => { onChange(p.id, p.rut, p.razonSocial); setOpen(false); setSearch(''); }}
                  style={{ padding: '9px 14px', cursor: 'pointer', background: p.id === value ? C.blue + '15' : 'transparent' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = p.id === value ? C.blue + '15' : 'transparent')}
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: p.id === value ? 600 : 400 }}>{p.razonSocial}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{p.rut}{p.giro ? ` · ${p.giro}` : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────

export default function NuevoMovimientoSupereduc() {
  const navigate = useNavigate();
  const toast = useToastStore();

  // Data
  const [cuentas, setCuentas] = useState<CuentaBasica[]>([]);
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);

  // Form
  const [form, setForm] = useState({
    supereducCuentaCodigo: '',
    fondoId: '',
    subvencion: '',
    tipoDocumento: '',
    monto: '',
    fecha: new Date().toISOString().split('T')[0],
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    descripcion: '',
    numeroFactura: '',
    rutProveedor: '',
    proveedorId: '',
  });

  // Proveedor-related
  const [cuentasFrecuentes, setCuentasFrecuentes] = useState<CuentaFrecuente[]>([]);
  const [loadingFrecuentes, setLoadingFrecuentes] = useState(false);

  // AI suggestion
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [loadingIA, setLoadingIA] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Submit state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [validationOk, setValidationOk] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Init load ───────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoadingInit(true);
      try {
        const [cRes, fRes, pRes] = await Promise.all([
          api.get('/finanzas/rendicion/supereduc/cuentas'),
          api.get('/finanzas/fondos'),
          api.get('/finanzas/proveedores'),
        ]);
        setCuentas(cRes.data.data ?? []);
        setFondos(fRes.data.data ?? []);
        setProveedores(pRes.data.data ?? []);
      } catch { /* ignore */ }
      finally { setLoadingInit(false); }
    };
    load();
  }, []);

  // ── Derived ─────────────────────────────────────────────────────

  const selectedCuenta = useMemo(
    () => cuentas.find(c => c.codigo === form.supereducCuentaCodigo) ?? null,
    [cuentas, form.supereducCuentaCodigo],
  );

  // Merge: frecuentes first, then rest of cuentas
  const cuentasOrdenadas = useMemo(() => {
    if (cuentasFrecuentes.length === 0) return { frecuentes: [], todas: cuentas };
    const frecCodigos = new Set(cuentasFrecuentes.map(f => f.cuenta.codigo));
    return {
      frecuentes: cuentasFrecuentes,
      todas: cuentas.filter(c => !frecCodigos.has(c.codigo)),
    };
  }, [cuentas, cuentasFrecuentes]);

  // ── Side effects ────────────────────────────────────────────────

  // When cuenta changes, reset dependent fields + clear validation
  useEffect(() => {
    setForm(f => ({ ...f, subvencion: '', tipoDocumento: '' }));
    setValidationErrors([]);
    setValidationOk(false);
  }, [form.supereducCuentaCodigo]);

  // When fecha changes, sync mes/anio
  useEffect(() => {
    if (form.fecha) {
      const d = new Date(form.fecha + 'T12:00:00');
      setForm(f => ({ ...f, mes: d.getMonth() + 1, anio: d.getFullYear() }));
    }
  }, [form.fecha]);

  // When proveedor changes, load cuentas frecuentes
  useEffect(() => {
    if (!form.proveedorId) { setCuentasFrecuentes([]); return; }
    setLoadingFrecuentes(true);
    api.get(`/finanzas/proveedores/${form.proveedorId}/cuentas-frecuentes`)
      .then(r => {
        const list = r.data.data ?? [];
        setCuentasFrecuentes(list);
        // Auto-select top frecuente if no cuenta chosen yet
        if (list.length > 0 && !form.supereducCuentaCodigo) {
          setForm(f => ({ ...f, supereducCuentaCodigo: list[0].cuenta.codigo }));
        }
      })
      .catch(() => setCuentasFrecuentes([]))
      .finally(() => setLoadingFrecuentes(false));
  }, [form.proveedorId]);

  // ── AI suggestion on glosa (debounced) ─────────────────────────

  const triggerIA = useCallback((glosa: string) => {
    if (!glosa.trim() || glosa.length < 10) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoadingIA(true);
      try {
        const res = await api.post('/finanzas/rendicion/supereduc/sugerir-cuenta', {
          glosa,
          ...(form.proveedorId ? { proveedorId: form.proveedorId } : {}),
        });
        const data = res.data.data;
        setSugerencias(data.sugerencias ?? []);
        // Auto-select if top confidence > 90 and no cuenta selected
        if (data.topSugerencia && data.sugerencias[0]?.confianza >= 90 && !form.supereducCuentaCodigo) {
          setForm(f => ({ ...f, supereducCuentaCodigo: data.topSugerencia }));
        }
      } catch { setSugerencias([]); }
      finally { setLoadingIA(false); }
    }, 1800);
  }, [form.proveedorId, form.supereducCuentaCodigo]);

  const handleGlosaBlur = () => { triggerIA(form.descripcion); };
  const handleGlosaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setForm(f => ({ ...f, descripcion: v }));
    if (v.length > 10) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => triggerIA(v), 1800);
    }
  };

  // ── Handlers ─────────────────────────────────────────────────

  const set = (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const handleProveedorChange = (id: string, rut: string, _nombre: string) => {
    setForm(f => ({ ...f, proveedorId: id, rutProveedor: rut }));
    setSugerencias([]);
  };

  const applySugerencia = (codigo: string) => {
    setForm(f => ({ ...f, supereducCuentaCodigo: codigo }));
  };

  const clientValidate = (): ValidationError[] => {
    const errs: ValidationError[] = [];
    if (!form.supereducCuentaCodigo) errs.push({ code: 'R001', message: 'Debe seleccionar una cuenta SuperEduc' });
    if (!form.fondoId) errs.push({ code: 'R006', message: 'Debe seleccionar un fondo' });
    if (!form.monto || parseFloat(form.monto) <= 0) errs.push({ code: 'R004', message: 'El monto debe ser mayor a 0' });
    if (!form.fecha) errs.push({ code: 'R005', message: 'Debe ingresar una fecha' });
    else if (new Date(form.fecha) > new Date()) errs.push({ code: 'R005', message: 'La fecha no puede ser futura' });
    if (!form.subvencion) errs.push({ code: 'R002', message: 'Debe seleccionar una subvención' });
    if (!form.tipoDocumento) errs.push({ code: 'R003', message: 'Debe seleccionar un tipo de documento' });
    return errs;
  };

  const handleValidar = () => {
    const errs = clientValidate();
    setValidationErrors(errs);
    setValidationOk(errs.length === 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = clientValidate();
    if (errs.length > 0) { setValidationErrors(errs); setValidationOk(false); return; }

    setSaving(true);
    setSaveError(null);
    setValidationErrors([]);
    try {
      await api.post('/finanzas/rendicion/supereduc/movimientos', {
        supereducCuentaCodigo: form.supereducCuentaCodigo,
        fondoId: form.fondoId,
        subvencion: form.subvencion,
        tipoDocumento: form.tipoDocumento,
        monto: parseFloat(form.monto),
        fecha: form.fecha,
        mes: Number(form.mes),
        anio: Number(form.anio),
        descripcion: form.descripcion || undefined,
        numeroFactura: form.numeroFactura || undefined,
        rutProveedor: form.rutProveedor || undefined,
        proveedorId: form.proveedorId || undefined,
      });
      setSuccess(true);
      toast.success('Movimiento registrado exitosamente');
      setSugerencias([]);
      // Refresh cuentas frecuentes after successful save
      if (form.proveedorId) {
        api.get(`/finanzas/proveedores/${form.proveedorId}/cuentas-frecuentes`)
          .then(r => setCuentasFrecuentes(r.data.data ?? []))
          .catch(() => {});
      }
      setForm(f => ({ ...f, supereducCuentaCodigo: '', subvencion: '', tipoDocumento: '', monto: '', descripcion: '', numeroFactura: '' }));
    } catch (ex: any) {
      const resp = ex?.response?.data?.error;
      if (resp?.details?.length > 0) setValidationErrors(resp.details);
      else {
        const msg = resp?.message ?? ex?.message ?? 'Error al guardar';
        setSaveError(msg);
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────

  if (loadingInit) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={24} style={{ color: C.muted, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: 'var(--text-body)' }}>

      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/finanzas/rendicion/movimientos')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '13px', color: C.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px', marginBottom: '4px' }}
        >
          <ChevronLeft size={14} /> Volver a movimientos
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: C.green + '20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PlusCircle size={18} style={{ color: C.green }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Registrar Movimiento SuperEduc</h1>
            <p style={{ color: C.muted, margin: '2px 0 0', fontSize: '13px' }}>El sistema sugiere la cuenta automáticamente según proveedor e historial</p>
          </div>
        </div>
      </div>

      {/* Success banner */}
      {success && (
        <div style={{ background: C.green + '15', border: `1px solid ${C.green}40`, borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <CheckCircle size={16} style={{ color: C.green, flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: C.green }}>Movimiento registrado</div>
            <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>
              Puedes registrar otro, o{' '}
              <button onClick={() => navigate('/finanzas/rendicion/movimientos')} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', textDecoration: 'underline', fontSize: '12px', padding: 0 }}>
                ver todos los movimientos
              </button>.
            </div>
          </div>
          <button onClick={() => setSuccess(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, padding: '2px' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>

        {/* ── FORM ─────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', paddingBottom: '14px', borderBottom: `1px solid ${C.border}` }}>
              Datos del movimiento
            </div>

            {/* 1. Proveedor — searchable */}
            <Field label="Proveedor">
              <ProveedorSelect
                proveedores={proveedores}
                value={form.proveedorId}
                onChange={handleProveedorChange}
              />
              {loadingFrecuentes && (
                <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <RefreshCw size={10} style={{ animation: 'spin 1s linear infinite' }} />
                  Cargando cuentas frecuentes…
                </div>
              )}
              {cuentasFrecuentes.length > 0 && !loadingFrecuentes && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: C.cyan, display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Star size={10} />
                  {cuentasFrecuentes.length} cuenta{cuentasFrecuentes.length > 1 ? 's' : ''} frecuente{cuentasFrecuentes.length > 1 ? 's' : ''} disponible{cuentasFrecuentes.length > 1 ? 's' : ''}
                </div>
              )}
            </Field>

            {/* 2. Glosa — triggers AI */}
            <Field label="Glosa / Descripción">
              <textarea
                value={form.descripcion}
                onChange={handleGlosaChange}
                onBlur={handleGlosaBlur}
                placeholder="Describe el gasto para que la IA sugiera la cuenta…"
                rows={2}
                style={{ ...IS(), resize: 'vertical', fontFamily: 'inherit' }}
              />
              {loadingIA && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '12px', color: C.purple }}>
                  <Sparkles size={12} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                  Analizando con IA…
                </div>
              )}
            </Field>

            {/* 3. Cuenta SuperEduc — with frecuentes + sugerencias merged */}
            <Field label="Cuenta SuperEduc" required>
              <select
                value={form.supereducCuentaCodigo}
                onChange={set('supereducCuentaCodigo')}
                style={IS()}
                required
              >
                <option value="">— Selecciona una cuenta —</option>

                {/* Frecuentes group */}
                {cuentasOrdenadas.frecuentes.length > 0 && (
                  <>
                    <option disabled>─── Cuentas frecuentes ───</option>
                    {cuentasOrdenadas.frecuentes.map(f => (
                      <option key={f.cuenta.codigo} value={f.cuenta.codigo}>
                        ★ {f.cuenta.codigo} — {f.cuenta.nombre} (usado {f.frecuencia}×)
                      </option>
                    ))}
                    <option disabled>─── Todas las cuentas ───</option>
                  </>
                )}

                {/* Sugerencias IA group (only if no frecuentes) */}
                {cuentasOrdenadas.frecuentes.length === 0 && sugerencias.length > 0 && (
                  <>
                    <option disabled>─── Sugeridas por IA ───</option>
                    {sugerencias.map(s => (
                      <option key={s.codigo} value={s.codigo}>
                        ✦ {s.codigo} — {s.nombre} ({s.confianza}% conf.)
                      </option>
                    ))}
                    <option disabled>─── Todas las cuentas ───</option>
                  </>
                )}

                {/* All operativas */}
                {cuentasOrdenadas.todas.map(c => (
                  <option key={c.id} value={c.codigo}>{c.codigo} — {c.nombre}</option>
                ))}
              </select>

              {selectedCuenta && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: C.muted, display: 'flex', gap: '8px' }}>
                  <span style={{ color: selectedCuenta.tipo === 'GASTO' ? C.red : C.green, fontWeight: 600 }}>{selectedCuenta.tipo}</span>
                  <span>·</span><span>{selectedCuenta.subvenciones.length} subvenciones</span>
                  <span>·</span><span>{selectedCuenta.documentos.length} docs</span>
                </div>
              )}
            </Field>

            {/* 4. Fondo */}
            <Field label="Fondo" required>
              <select value={form.fondoId} onChange={set('fondoId')} style={IS()} required>
                <option value="">— Selecciona un fondo —</option>
                {fondos.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
              </select>
            </Field>

            {/* 5. Subvención + Tipo Doc */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Subvención" required>
                <select
                  value={form.subvencion} onChange={set('subvencion')}
                  style={IS({ opacity: selectedCuenta ? 1 : 0.5 })}
                  required disabled={!selectedCuenta}
                >
                  <option value="">— Selecciona —</option>
                  {(selectedCuenta?.subvenciones ?? []).map(s => (
                    <option key={s.subvencion} value={s.subvencion}>{s.subvencion}</option>
                  ))}
                </select>
              </Field>
              <Field label="Tipo Documento" required>
                <select
                  value={form.tipoDocumento} onChange={set('tipoDocumento')}
                  style={IS({ opacity: selectedCuenta ? 1 : 0.5 })}
                  required disabled={!selectedCuenta}
                >
                  <option value="">— Selecciona —</option>
                  {(selectedCuenta?.documentos ?? []).map(d => (
                    <option key={d.tipoDoc} value={d.tipoDoc}>{d.tipoDoc}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* 6. Monto + Fecha */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <Field label="Monto (CLP)" required>
                <input
                  type="number" min="1" step="1" value={form.monto}
                  onChange={set('monto')} placeholder="150000"
                  style={IS()} required
                />
              </Field>
              <Field label="Fecha" required>
                <input
                  type="date" value={form.fecha}
                  max={new Date().toISOString().split('T')[0]}
                  onChange={set('fecha')}
                  style={IS()} required
                />
              </Field>
            </div>

            {/* 7. N° Documento */}
            <Field label="N° Documento / Factura">
              <input type="text" value={form.numeroFactura} onChange={set('numeroFactura')} placeholder="F-001234" style={IS()} />
            </Field>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', paddingTop: '16px', borderTop: `1px solid ${C.border}` }}>
              <button
                type="button" onClick={handleValidar}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 18px', background: C.amber + '15', border: `1px solid ${C.amber}50`, borderRadius: '8px', color: C.amber, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
              >
                <AlertTriangle size={13} /> Validar
              </button>
              <button
                type="submit" disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '9px 22px', background: C.blue, border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
              >
                {saving ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <CheckCircle size={13} />}
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>

        {/* ── SIDE PANEL ───────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* AI Sugerencias */}
          {(sugerencias.length > 0 || loadingIA) && (
            <div style={{ background: C.card, border: `1px solid ${C.purple}40`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                <Sparkles size={14} style={{ color: C.purple }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.purple }}>Sugerencia IA</span>
                {loadingIA && <RefreshCw size={11} style={{ color: C.muted, animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />}
              </div>
              {sugerencias.map((s, i) => (
                <div
                  key={s.codigo}
                  onClick={() => applySugerencia(s.codigo)}
                  style={{
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', marginBottom: '6px',
                    background: form.supereducCuentaCodigo === s.codigo ? C.purple + '20' : 'var(--card-deep)',
                    border: `1px solid ${form.supereducCuentaCodigo === s.codigo ? C.purple + '60' : 'transparent'}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.purple + '15')}
                  onMouseLeave={e => (e.currentTarget.style.background = form.supereducCuentaCodigo === s.codigo ? C.purple + '20' : 'var(--card-deep)')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <span style={{ fontFamily: 'monospace', color: C.blue, fontSize: '12px', fontWeight: 600 }}>{s.codigo}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: 700,
                      color: s.confianza >= 80 ? C.green : s.confianza >= 50 ? C.amber : C.muted,
                      background: (s.confianza >= 80 ? C.green : s.confianza >= 50 ? C.amber : C.muted) + '20',
                      borderRadius: '10px', padding: '1px 7px',
                    }}>
                      {s.confianza}%
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginBottom: '3px' }}>{s.nombre}</div>
                  <div style={{ fontSize: '11px', color: C.muted, lineHeight: '1.4' }}>{s.razon}</div>
                  {i === 0 && s.confianza >= 90 && (
                    <div style={{ fontSize: '10px', color: C.purple, marginTop: '4px', fontWeight: 600 }}>✓ Preseleccionada automáticamente</div>
                  )}
                </div>
              ))}
              <div style={{ fontSize: '11px', color: C.muted, marginTop: '4px' }}>Click para aplicar una sugerencia</div>
            </div>
          )}

          {/* Cuentas frecuentes del proveedor */}
          {cuentasFrecuentes.length > 0 && (
            <div style={{ background: C.card, border: `1px solid ${C.cyan}30`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                <Star size={13} style={{ color: C.cyan }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.cyan }}>Historial del proveedor</span>
              </div>
              {cuentasFrecuentes.slice(0, 5).map(f => (
                <div
                  key={f.id}
                  onClick={() => setForm(ff => ({ ...ff, supereducCuentaCodigo: f.cuenta.codigo }))}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px',
                    borderRadius: '7px', cursor: 'pointer', marginBottom: '4px',
                    background: form.supereducCuentaCodigo === f.cuenta.codigo ? C.cyan + '15' : 'var(--card-deep)',
                    border: `1px solid ${form.supereducCuentaCodigo === f.cuenta.codigo ? C.cyan + '40' : 'transparent'}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = C.cyan + '10')}
                  onMouseLeave={e => (e.currentTarget.style.background = form.supereducCuentaCodigo === f.cuenta.codigo ? C.cyan + '15' : 'var(--card-deep)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: C.blue, fontWeight: 600, fontFamily: 'monospace' }}>{f.cuenta.codigo}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.cuenta.nombre}</div>
                  </div>
                  <span style={{ background: C.cyan + '20', color: C.cyan, borderRadius: '20px', padding: '2px 8px', fontSize: '10px', fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {f.frecuencia}×
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Validation result */}
          {(validationErrors.length > 0 || validationOk) && (
            <div style={{ background: validationOk ? C.green + '12' : '#2d1b1b', border: `1px solid ${validationOk ? C.green + '40' : C.red + '50'}`, borderRadius: '10px', padding: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: validationErrors.length > 0 ? '10px' : 0 }}>
                {validationOk ? <CheckCircle size={14} style={{ color: C.green }} /> : <AlertTriangle size={14} style={{ color: C.red }} />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: validationOk ? C.green : C.red }}>
                  {validationOk ? 'Validación exitosa' : `${validationErrors.length} error${validationErrors.length > 1 ? 'es' : ''}`}
                </span>
              </div>
              {validationErrors.map(e => (
                <div key={e.code} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ background: C.red + '30', color: C.red, borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>{e.code}</span>
                  <span style={{ color: 'var(--text-body)', fontSize: '12px' }}>{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Save error */}
          {saveError && (
            <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}50`, borderRadius: '10px', padding: '14px', fontSize: '13px', color: C.red }}>
              {saveError}
            </div>
          )}

          {/* Cuenta info */}
          {selectedCuenta && (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cuenta seleccionada</div>
              <div style={{ fontFamily: 'monospace', fontSize: '16px', fontWeight: 700, color: C.blue, marginBottom: '2px' }}>{selectedCuenta.codigo}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>{selectedCuenta.nombre}</div>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px', fontWeight: 600 }}>SUBVENCIONES</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
                {selectedCuenta.subvenciones.map(s => (
                  <span key={s.subvencion} style={{ background: form.subvencion === s.subvencion ? C.cyan + '30' : 'var(--card-deep)', color: form.subvencion === s.subvencion ? C.cyan : C.muted, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600, border: `1px solid ${form.subvencion === s.subvencion ? C.cyan + '50' : 'transparent'}` }}>
                    {s.subvencion}
                  </span>
                ))}
              </div>
              <div style={{ fontSize: '11px', color: C.muted, marginBottom: '4px', fontWeight: 600 }}>DOCUMENTOS</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {selectedCuenta.documentos.map(d => (
                  <span key={d.tipoDoc} style={{ background: form.tipoDocumento === d.tipoDoc ? C.purple + '30' : 'var(--card-deep)', color: form.tipoDocumento === d.tipoDoc ? C.purple : C.muted, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600, border: `1px solid ${form.tipoDocumento === d.tipoDoc ? C.purple + '50' : 'transparent'}` }}>
                    {d.tipoDoc}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
}
