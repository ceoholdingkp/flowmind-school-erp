import React, { useState, useEffect, useCallback } from 'react';
import {
  DollarSign, Download, ChevronDown, ChevronUp,
  CheckCircle, AlertCircle, CreditCard, TrendingDown, Banknote, FileText, Printer
} from 'lucide-react';
import api from '../../api/client';
import { exportToCSV, printAsPDF } from '../../utils/export';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const COLORS = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
};

type EstadoLiq = 'GENERADA' | 'APROBADA' | 'PAGADA';

interface DetalleItem {
  concepto: string;
  monto: number;
}

interface FondoItem {
  fondo: string;
  porcentaje: number;
  monto: number;
}

interface Liquidacion {
  id: string;
  funcionarioId: string;
  funcionarioNombre?: string;
  mes: number;
  anio: number;
  sueldoBase: string;
  totalHaberes: string;
  totalDescuentos: string;
  liquidoAPago: string;
  estado: EstadoLiq;
  detalleHaberes: DetalleItem[];
  detalleDescuentos: DetalleItem[];
  fondoImputacion: FondoItem[];
}

const estadoBadge: Record<EstadoLiq, { label: string; color: string; bg: string }> = {
  GENERADA: { label: 'Generada', color: COLORS.amber, bg: '#f59e0b22' },
  APROBADA: { label: 'Aprobada', color: COLORS.green, bg: '#10b98122' },
  PAGADA:   { label: 'Pagada',   color: COLORS.blue,  bg: '#3b82f622' },
};

function Badge({ config }: { config: { label: string; color: string; bg: string } }) {
  return (
    <span style={{
      background: config.bg, color: config.color,
      padding: '2px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: 600, display: 'inline-block',
    }}>
      {config.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1,
    }}>
      <div style={{ background: `${color}22`, borderRadius: 10, padding: 12 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function MiniTable({ rows, columns }: {
  rows: Record<string, React.ReactNode>[];
  columns: { key: string; label: string; align?: 'left' | 'right' }[];
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key} style={{
              color: COLORS.muted, fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5,
              padding: '8px 12px', textAlign: col.align ?? 'left',
              borderBottom: `1px solid ${COLORS.border}`,
            }}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {columns.map(col => (
              <td key={col.key} style={{
                padding: '8px 12px', fontSize: 13, color: '#fff',
                textAlign: col.align ?? 'left',
                borderBottom: i < rows.length - 1 ? `1px solid ${COLORS.border}20` : 'none',
              }}>
                {row[col.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AprobarModal({ liq, onClose, onDone }: {
  liq: Liquidacion;
  onClose: () => void;
  onDone: () => void;
}) {
  const [fechaPago, setFechaPago] = useState(() => {
    const d = new Date();
    d.setDate(28);
    return d.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleAprobar = async () => {
    setLoading(true);
    setErr('');
    try {
      await api.post(`/rrhh/remuneraciones/${liq.id}/aprobar`, { fechaPago });
      onDone();
      onClose();
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? 'Error al aprobar liquidación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: 32, width: 400, maxWidth: '90vw' }}>
        <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 18, margin: '0 0 8px' }}>Aprobar Liquidación</h3>
        <p style={{ color: COLORS.muted, fontSize: 14, margin: '0 0 20px' }}>
          Funcionario: <span style={{ color: '#fff' }}>{liq.funcionarioNombre ?? liq.funcionarioId}</span><br />
          Líquido a pago: <span style={{ color: COLORS.green, fontWeight: 600 }}>{fmt(Number(liq.liquidoAPago))}</span>
        </p>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: COLORS.muted, fontSize: 13, display: 'block', marginBottom: 6 }}>Fecha de Pago</label>
          <input
            type="date"
            value={fechaPago}
            onChange={(e) => setFechaPago(e.target.value)}
            style={{
              width: '100%', background: COLORS.bg, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        {err && (
          <div style={{ color: COLORS.red, fontSize: 13, marginBottom: 16 }}>{err}</div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: `1px solid ${COLORS.border}`,
              color: COLORS.muted, borderRadius: 8, padding: '9px 18px',
              cursor: 'pointer', fontSize: 14,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleAprobar}
            disabled={loading || !fechaPago}
            style={{
              background: COLORS.green, color: '#fff', border: 'none',
              borderRadius: 8, padding: '9px 18px', cursor: 'pointer',
              fontWeight: 600, fontSize: 14, opacity: loading ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <CheckCircle size={16} /> {loading ? 'Aprobando...' : 'Confirmar Aprobación'}
          </button>
        </div>
      </div>
    </div>
  );
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function Remuneraciones() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [aprobarTarget, setAprobarTarget] = useState<Liquidacion | null>(null);
  const [exportLoading, setExportLoading] = useState<'previred' | 'lre' | null>(null);

  const fetchLiquidaciones = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/rrhh/remuneraciones?mes=${mes}&anio=${anio}`);
      setLiquidaciones(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [mes, anio]);

  useEffect(() => {
    fetchLiquidaciones();
  }, [fetchLiquidaciones]);

  const handleExport = async (tipo: 'previred' | 'lre') => {
    setExportLoading(tipo);
    try {
      const res = await api.get(`/rrhh/remuneraciones/export/${tipo}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tipo}_${anio}_${mes}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExportLoading(null);
    }
  };

  // KPIs
  const totalGeneradas = liquidaciones.length;
  const totalBruto = liquidaciones.reduce((s, l) => s + Number(l.totalHaberes), 0);
  const totalDesc = liquidaciones.reduce((s, l) => s + Number(l.totalDescuentos), 0);
  const totalLiquido = liquidaciones.reduce((s, l) => s + Number(l.liquidoAPago), 0);

  const thStyle: React.CSSProperties = {
    color: COLORS.muted, fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${COLORS.border}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', color: '#fff', fontSize: 14,
    borderBottom: `1px solid ${COLORS.border}20`, verticalAlign: 'middle',
  };
  const selectStyle: React.CSSProperties = {
    background: COLORS.card, border: `1px solid ${COLORS.border}`,
    borderRadius: 8, padding: '9px 12px', color: '#fff',
    fontSize: 14, outline: 'none', cursor: 'pointer',
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '32px 40px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: `${COLORS.green}22`, borderRadius: 10, padding: 10 }}>
            <DollarSign size={24} color={COLORS.green} />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Remuneraciones</h1>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Month/Year selectors */}
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))} style={selectStyle}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))} style={selectStyle}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Export buttons */}
          <button
            onClick={() => handleExport('previred')}
            disabled={exportLoading !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: `${COLORS.blue}22`, color: COLORS.blue,
              border: `1px solid ${COLORS.blue}44`, borderRadius: 8,
              padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              opacity: exportLoading !== null ? 0.6 : 1,
            }}
          >
            <Download size={15} />
            {exportLoading === 'previred' ? 'Exportando...' : 'Previred'}
          </button>
          <button
            onClick={() => handleExport('lre')}
            disabled={exportLoading !== null}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: `${COLORS.purple}22`, color: COLORS.purple,
              border: `1px solid ${COLORS.purple}44`, borderRadius: 8,
              padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
              opacity: exportLoading !== null ? 0.6 : 1,
            }}
          >
            <FileText size={15} />
            {exportLoading === 'lre' ? 'Exportando...' : 'LRE'}
          </button>
          <button
            onClick={() => exportToCSV(
              liquidaciones.map((l) => ({
                Funcionario: l.funcionarioNombre ?? l.funcionarioId,
                Mes: MESES[l.mes - 1],
                Año: l.anio,
                'Sueldo Base': Number(l.sueldoBase),
                'Total Haberes': Number(l.totalHaberes),
                'Total Descuentos': Number(l.totalDescuentos),
                'Líquido a Pago': Number(l.liquidoAPago),
                Estado: l.estado,
              })),
              `liquidaciones-${MESES[mes - 1]}-${anio}`,
            )}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#10b981', color: '#fff',
              border: 'none', borderRadius: 8,
              padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            <Download size={15} /> Exportar Excel
          </button>
          <button
            onClick={printAsPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: `${COLORS.amber}22`, color: COLORS.amber,
              border: `1px solid ${COLORS.amber}44`, borderRadius: 8,
              padding: '9px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
            }}
          >
            <Printer size={15} /> Exportar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard label="Liquidaciones"   value={String(totalGeneradas)}  icon={CreditCard}    color={COLORS.blue} />
        <KpiCard label="Total Bruto"     value={fmt(totalBruto)}         icon={Banknote}      color={COLORS.green} />
        <KpiCard label="Total Descuentos" value={fmt(totalDesc)}         icon={TrendingDown}  color={COLORS.red} />
        <KpiCard label="Total Líquido"   value={fmt(totalLiquido)}       icon={DollarSign}    color={COLORS.cyan} />
      </div>

      {/* Table */}
      <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                <th style={{ ...thStyle, width: 32 }}></th>
                <th style={thStyle}>Funcionario</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Sueldo Base</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Haberes</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Descuentos</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Líquido</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    Cargando liquidaciones...
                  </td>
                </tr>
              ) : liquidaciones.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No hay liquidaciones para este período
                  </td>
                </tr>
              ) : (
                liquidaciones.map((liq) => {
                  const isExpanded = expandedId === liq.id;
                  return (
                    <React.Fragment key={liq.id}>
                      <tr
                        style={{ cursor: 'pointer', transition: 'background 0.15s', background: isExpanded ? `${COLORS.border}40` : 'transparent' }}
                        onClick={() => setExpandedId(isExpanded ? null : liq.id)}
                        onMouseEnter={(e) => { if (!isExpanded) e.currentTarget.style.background = `${COLORS.border}25`; }}
                        onMouseLeave={(e) => { if (!isExpanded) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td style={{ ...tdStyle, color: COLORS.muted, paddingLeft: 16 }}>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>
                          {liq.funcionarioNombre ?? liq.funcionarioId}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: 13 }}>
                          {fmt(Number(liq.sueldoBase))}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: COLORS.green }}>
                          {fmt(Number(liq.totalHaberes))}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontSize: 13, color: COLORS.red }}>
                          {fmt(Number(liq.totalDescuentos))}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: COLORS.cyan }}>
                          {fmt(Number(liq.liquidoAPago))}
                        </td>
                        <td style={tdStyle}>
                          <Badge config={estadoBadge[liq.estado] ?? estadoBadge.GENERADA} />
                        </td>
                        <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                          {liq.estado === 'GENERADA' && (
                            <button
                              onClick={() => setAprobarTarget(liq)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: `${COLORS.green}22`, color: COLORS.green,
                                border: 'none', borderRadius: 6, padding: '6px 12px',
                                cursor: 'pointer', fontSize: 13, fontWeight: 500,
                              }}
                            >
                              <CheckCircle size={14} /> Aprobar
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expanded accordion */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} style={{ padding: 0, borderBottom: `1px solid ${COLORS.border}` }}>
                            <div style={{ padding: '20px 24px', background: COLORS.bg, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                              {/* Haberes */}
                              <div style={{ background: COLORS.card, borderRadius: 10, padding: 16 }}>
                                <h4 style={{ color: COLORS.green, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                                  Detalle Haberes
                                </h4>
                                <MiniTable
                                  columns={[
                                    { key: 'concepto', label: 'Concepto' },
                                    { key: 'monto', label: 'Monto', align: 'right' },
                                  ]}
                                  rows={(liq.detalleHaberes ?? []).map(d => ({
                                    concepto: d.concepto,
                                    monto: <span style={{ color: COLORS.green, fontFamily: 'monospace' }}>{fmt(d.monto)}</span>,
                                  }))}
                                />
                              </div>

                              {/* Descuentos */}
                              <div style={{ background: COLORS.card, borderRadius: 10, padding: 16 }}>
                                <h4 style={{ color: COLORS.red, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                                  Detalle Descuentos
                                </h4>
                                <MiniTable
                                  columns={[
                                    { key: 'concepto', label: 'Concepto' },
                                    { key: 'monto', label: 'Monto', align: 'right' },
                                  ]}
                                  rows={(liq.detalleDescuentos ?? []).map(d => ({
                                    concepto: d.concepto,
                                    monto: <span style={{ color: COLORS.red, fontFamily: 'monospace' }}>{fmt(d.monto)}</span>,
                                  }))}
                                />
                              </div>

                              {/* Fondo Imputación */}
                              <div style={{ background: COLORS.card, borderRadius: 10, padding: 16 }}>
                                <h4 style={{ color: COLORS.purple, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 12px' }}>
                                  Fondo Imputación
                                </h4>
                                <MiniTable
                                  columns={[
                                    { key: 'fondo', label: 'Fondo' },
                                    { key: 'pct', label: '%', align: 'right' },
                                    { key: 'monto', label: 'Monto', align: 'right' },
                                  ]}
                                  rows={(liq.fondoImputacion ?? []).map(f => ({
                                    fondo: f.fondo,
                                    pct: <span style={{ color: COLORS.muted }}>{f.porcentaje}%</span>,
                                    monto: <span style={{ color: COLORS.purple, fontFamily: 'monospace' }}>{fmt(f.monto)}</span>,
                                  }))}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Aprobar modal */}
      {aprobarTarget && (
        <AprobarModal
          liq={aprobarTarget}
          onClose={() => setAprobarTarget(null)}
          onDone={fetchLiquidaciones}
        />
      )}
    </div>
  );
}
