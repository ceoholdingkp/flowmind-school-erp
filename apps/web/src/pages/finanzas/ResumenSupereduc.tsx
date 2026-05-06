import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, Download, BarChart2, AlertTriangle, CheckCircle, PlayCircle, Inbox } from 'lucide-react';
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

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface Fondo { id: string; nombre: string; }
interface ResumenCuenta { codigo: string; nombre: string; tipo: string; total: number; cantidad: number; }
interface ValidationError { code: string; message: string; }

interface GenerarResult {
  csv: string;
  periodo: string;
  fondoId: string;
  subvencion: string;
  totalMovimientos: number;
  totalMonto: number;
}

function InputStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    padding: '8px 12px', background: C.card, border: `1px solid ${C.border}`,
    borderRadius: '8px', color: 'var(--text-body)', fontSize: '13px',
    outline: 'none', width: '100%', boxSizing: 'border-box' as const, ...extra,
  };
}

export default function ResumenSupereduc() {
  const [fondos, setFondos] = useState<Fondo[]>([]);
  const [resumen, setResumen] = useState<ResumenCuenta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filtroFondo, setFiltroFondo] = useState('');
  const [filtroAnio, setFiltroAnio] = useState(String(new Date().getFullYear()));
  const [filtroMesInicio, setFiltroMesInicio] = useState('1');
  const [filtroMesFin, setFiltroMesFin] = useState(String(new Date().getMonth() + 1));

  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ valid: boolean; errors: ValidationError[] } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<GenerarResult | null>(null);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Load fondos once
  useEffect(() => {
    api.get('/finanzas/fondos').then(r => setFondos(r.data.data ?? [])).catch(() => {});
  }, []);

  const fetchResumen = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { anio: filtroAnio, mesInicio: filtroMesInicio, mesFin: filtroMesFin };
      if (filtroFondo) params.fondoId = filtroFondo;
      const res = await api.get('/finanzas/rendicion/supereduc/resumen', { params });
      setResumen(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Error al cargar resumen');
    } finally {
      setLoading(false);
    }
  }, [filtroFondo, filtroAnio, filtroMesInicio, filtroMesFin]);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);

  const totalMonto = resumen.reduce((s, r) => s + r.total, 0);
  const totalMovimientos = resumen.reduce((s, r) => s + r.cantidad, 0);

  const handleValidar = async () => {
    if (!filtroFondo) { setError('Selecciona un fondo para validar'); return; }
    setValidating(true);
    setValidationResult(null);
    setGenerateResult(null);
    setGenerateError(null);
    try {
      const res = await api.post('/finanzas/rendicion/supereduc/validar', {
        fondoId: filtroFondo,
        subvencion: 'General',
        mesInicio: parseInt(filtroMesInicio),
        mesFin: parseInt(filtroMesFin),
        anio: parseInt(filtroAnio),
      });
      setValidationResult(res.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message || e?.message || 'Error al validar');
    } finally {
      setValidating(false);
    }
  };

  const handleGenerar = async () => {
    if (!filtroFondo) { setError('Selecciona un fondo para generar la rendición'); return; }
    setGenerating(true);
    setGenerateResult(null);
    setGenerateError(null);
    try {
      const res = await api.post('/finanzas/rendicion/supereduc/generar', {
        fondoId: filtroFondo,
        subvencion: 'General',
        mesInicio: parseInt(filtroMesInicio),
        mesFin: parseInt(filtroMesFin),
        anio: parseInt(filtroAnio),
      });
      setGenerateResult(res.data.data);
    } catch (e: any) {
      const resp = e?.response?.data?.error;
      const errDetails = resp?.details;
      if (errDetails?.length > 0) {
        setGenerateError(errDetails.map((d: ValidationError) => `[${d.code}] ${d.message}`).join(' | '));
      } else {
        setGenerateError(resp?.message || e?.message || 'Error al generar rendición');
      }
    } finally {
      setGenerating(false);
    }
  };

  const downloadCSV = () => {
    if (!generateResult) return;
    const blob = new Blob([generateResult.csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const fondoNombre = fondos.find(f => f.id === filtroFondo)?.nombre ?? 'fondo';
    a.download = `rendicion_supereduc_${fondoNombre.replace(/\s+/g, '_')}_${filtroAnio}_M${filtroMesInicio}-${filtroMesFin}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const periodoLabel = `${MESES_CORTO[parseInt(filtroMesInicio)]}–${MESES_CORTO[parseInt(filtroMesFin)]} ${filtroAnio}`;

  return (
    <div style={{ minHeight: '100vh', background: C.bg, padding: '24px', color: 'var(--text-body)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', background: C.blue + '20', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart2 size={18} style={{ color: C.blue }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>Resumen y Rendición SuperEduc</h1>
            <p style={{ color: C.muted, margin: '2px 0 0', fontSize: '13px' }}>
              Revisa gastos por cuenta y genera el archivo de rendición
            </p>
          </div>
        </div>
        <button
          onClick={fetchResumen} disabled={loading}
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '20px', alignItems: 'start' }}>

        {/* Main content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Filters */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '18px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>Período de consulta</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '5px' }}>FONDO</label>
                <select value={filtroFondo} onChange={e => { setFiltroFondo(e.target.value); setValidationResult(null); setGenerateResult(null); }} style={InputStyle()}>
                  <option value="">Todos los fondos</option>
                  {fondos.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '5px' }}>AÑO</label>
                <select value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)} style={InputStyle()}>
                  {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '5px' }}>DESDE</label>
                <select value={filtroMesInicio} onChange={e => setFiltroMesInicio(e.target.value)} style={InputStyle()}>
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '5px' }}>HASTA</label>
                <select value={filtroMesFin} onChange={e => setFiltroMesFin(e.target.value)} style={InputStyle()}>
                  {MESES.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
            {[
              { label: 'Cuentas con movimientos', value: resumen.length, fmt: String, color: C.blue },
              { label: 'Total movimientos', value: totalMovimientos, fmt: String, color: C.purple },
              { label: 'Total acumulado', value: totalMonto, fmt: (v: number) => fmt(v), color: C.red },
            ].map(k => (
              <div key={k.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px 18px', borderLeft: `3px solid ${k.color}` }}>
                <div style={{ fontSize: '11px', color: C.muted, fontWeight: 600, marginBottom: '6px' }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: k.color }}>{k.fmt(k.value as any)}</div>
              </div>
            ))}
          </div>

          {/* Resumen table */}
          {resumen.length === 0 && !loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 20px', background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px' }}>
              <Inbox size={36} style={{ color: C.muted, marginBottom: '12px', opacity: 0.5 }} />
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin datos para el período</div>
              <div style={{ color: C.muted, fontSize: '13px' }}>No hay movimientos SuperEduc registrados en {periodoLabel}.</div>
            </div>
          ) : (
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Resumen por cuenta — {periodoLabel}
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'var(--card-deep)' }}>
                      {['Código', 'Nombre', 'Tipo', 'Movimientos', 'Total'].map(h => (
                        <th key={h} style={{
                          padding: '10px 16px', textAlign: ['Movimientos', 'Total'].includes(h) ? 'right' : 'left',
                          color: C.muted, fontWeight: 600, fontSize: '11px',
                          borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap',
                          textTransform: 'uppercase', letterSpacing: '0.04em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.map(r => {
                      const pct = totalMonto > 0 ? (r.total / totalMonto) * 100 : 0;
                      return (
                        <tr key={r.codigo} style={{ borderBottom: `1px solid ${C.border}20` }}>
                          <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: C.blue, fontSize: '12px', fontWeight: 600 }}>
                            {r.codigo}
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <div style={{ color: 'var(--text-primary)', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {r.nombre}
                            </div>
                            {/* Progress bar */}
                            <div style={{ marginTop: '4px', background: 'var(--card-deep)', borderRadius: '2px', height: '3px', maxWidth: '200px' }}>
                              <div style={{ height: '3px', borderRadius: '2px', background: C.blue, width: `${pct}%` }} />
                            </div>
                          </td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              background: (r.tipo === 'GASTO' ? C.red : r.tipo === 'INGRESO' ? C.green : C.amber) + '20',
                              color: r.tipo === 'GASTO' ? C.red : r.tipo === 'INGRESO' ? C.green : C.amber,
                              borderRadius: '20px', padding: '2px 9px', fontSize: '11px', fontWeight: 600,
                            }}>
                              {r.tipo}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: C.muted, fontSize: '12px' }}>
                            {r.cantidad}
                          </td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: C.red, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {fmt(r.total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--card-deep)', borderTop: `2px solid ${C.border}` }}>
                      <td colSpan={3} style={{ padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: C.muted }}>
                        TOTAL — {resumen.length} cuenta{resumen.length !== 1 ? 's' : ''}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color: C.muted }}>
                        {totalMovimientos}
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right', color: C.red, fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap' }}>
                        {fmt(totalMonto)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Right panel: generate rendicion */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Generate card */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>Generar Rendición</div>
            <div style={{ fontSize: '12px', color: C.muted, marginBottom: '18px' }}>Exporta el archivo CSV para cargar en el sistema SuperEduc.</div>

            {/* Validation */}
            <button
              onClick={handleValidar}
              disabled={validating || !filtroFondo}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '10px', background: C.amber + '15', border: `1px solid ${C.amber}50`,
                borderRadius: '8px', color: C.amber, fontWeight: 600, fontSize: '13px',
                cursor: !filtroFondo ? 'not-allowed' : 'pointer', opacity: !filtroFondo ? 0.5 : 1,
                marginBottom: '8px',
              }}
            >
              {validating ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <AlertTriangle size={13} />}
              Validar período
            </button>

            {/* Generate */}
            <button
              onClick={handleGenerar}
              disabled={generating || !filtroFondo}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '10px', background: C.blue,
                border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px',
                cursor: !filtroFondo ? 'not-allowed' : 'pointer', opacity: !filtroFondo ? 0.5 : 1,
              }}
            >
              {generating ? <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <PlayCircle size={13} />}
              {generating ? 'Generando…' : 'Generar rendición'}
            </button>

            {!filtroFondo && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: C.muted, textAlign: 'center' }}>
                Selecciona un fondo para continuar
              </div>
            )}
          </div>

          {/* Validation result */}
          {validationResult && (
            <div style={{
              background: validationResult.valid ? C.green + '12' : '#2d1b1b',
              border: `1px solid ${validationResult.valid ? C.green + '40' : C.red + '50'}`,
              borderRadius: '10px', padding: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: validationResult.errors.length > 0 ? '10px' : 0 }}>
                {validationResult.valid
                  ? <CheckCircle size={14} style={{ color: C.green }} />
                  : <AlertTriangle size={14} style={{ color: C.red }} />}
                <span style={{ fontSize: '13px', fontWeight: 600, color: validationResult.valid ? C.green : C.red }}>
                  {validationResult.valid ? 'Período válido para rendición' : 'Hay problemas en el período'}
                </span>
              </div>
              {validationResult.errors.map(e => (
                <div key={e.code} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ background: C.red + '30', color: C.red, borderRadius: '4px', padding: '1px 5px', fontSize: '10px', fontWeight: 700, flexShrink: 0 }}>
                    {e.code}
                  </span>
                  <span style={{ color: 'var(--text-body)', fontSize: '12px' }}>{e.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Generate error */}
          {generateError && (
            <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}50`, borderRadius: '10px', padding: '14px', fontSize: '12px', color: C.red }}>
              {generateError}
            </div>
          )}

          {/* Generate result */}
          {generateResult && (
            <div style={{ background: C.green + '10', border: `1px solid ${C.green}30`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <CheckCircle size={15} style={{ color: C.green }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: C.green }}>Rendición generada</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                {[
                  { label: 'Período', value: generateResult.periodo },
                  { label: 'Movimientos', value: generateResult.totalMovimientos },
                  { label: 'Total', value: fmt(generateResult.totalMonto) },
                ].map(d => (
                  <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ color: C.muted }}>{d.label}</span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={downloadCSV}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                  padding: '10px', background: C.green,
                  border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                }}
              >
                <Download size={13} />
                Descargar CSV
              </button>

              {/* Preview */}
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '6px' }}>VISTA PREVIA</div>
                <div style={{
                  background: 'var(--card-deep)', borderRadius: '6px', padding: '10px',
                  fontSize: '10px', fontFamily: 'monospace', color: C.muted,
                  maxHeight: '120px', overflowY: 'auto', whiteSpace: 'pre', overflowX: 'auto',
                }}>
                  {generateResult.csv.split('\n').slice(0, 6).join('\n')}
                  {generateResult.csv.split('\n').length > 6 && '\n…'}
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '14px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: C.muted, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Formato CSV
            </div>
            <div style={{ fontSize: '11px', color: C.muted, lineHeight: '1.6' }}>
              El archivo generado contiene las columnas:<br />
              <code style={{ color: C.cyan, fontSize: '10px' }}>codigo_cuenta; nombre_cuenta; tipo_cuenta; fecha; monto; tipo_documento; descripcion; numero_factura; rut_proveedor</code>
              <br /><br />
              Delimitador: punto y coma (;)
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
