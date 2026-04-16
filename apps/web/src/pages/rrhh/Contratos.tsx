import React, { useState, useEffect } from 'react';
import {
  FileText, AlertTriangle, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, Eye, Infinity
} from 'lucide-react';
import api from '../../api/client';

const COLORS = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
};

interface Funcionario {
  id: string;
  run: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  tipo: string;
  tipoContrato: string;
  fechaIngreso: string;
  estado: string;
  fechaTerminoContrato?: string;
}

interface Contrato {
  id: string;
  funcionarioId: string;
  tipoContrato: string;
  fechaInicio: string;
  fechaTermino?: string;
  estado: string;
  horasSemanales?: number;
  cargo?: string;
}

interface ContratoVencer {
  funcionarioId: string;
  funcionarioNombre: string;
  run: string;
  cargo: string;
  tipoContrato: string;
  fechaTermino: string;
  diasRestantes: number;
}

function calcDiasRestantes(fechaTermino?: string): number | null {
  if (!fechaTermino) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const term = new Date(fechaTermino);
  term.setHours(0, 0, 0, 0);
  return Math.round((term.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function DiasRestantesBadge({ dias }: { dias: number | null }) {
  if (dias === null) return <span style={{ color: COLORS.muted }}>—</span>;

  let color = COLORS.green, bg = '#10b98122', label = '';
  if (dias < 0)  { color = COLORS.red;   bg = '#ef444422'; label = `Vencido (${Math.abs(dias)} días)`; }
  else if (dias <= 7)  { color = COLORS.red;   bg = '#ef444422'; label = `${dias} días`; }
  else if (dias <= 30) { color = COLORS.amber; bg = '#f59e0b22'; label = `${dias} días`; }
  else { label = `${dias} días`; }

  return (
    <span style={{
      background: bg, color, padding: '2px 10px',
      borderRadius: 9999, fontSize: 12, fontWeight: 600,
    }}>
      {label}
    </span>
  );
}

function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      background: bg, color, padding: '2px 10px',
      borderRadius: 9999, fontSize: 12, fontWeight: 600, display: 'inline-block',
    }}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
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
        <div style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function ContratoHistorial({ funcionarioId, onClose }: { funcionarioId: string; onClose: () => void }) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/rrhh/funcionarios/${funcionarioId}/contratos`);
        setContratos(res.data?.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [funcionarioId]);

  const thStyle: React.CSSProperties = {
    color: COLORS.muted, fontSize: 11, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '10px 14px', textAlign: 'left',
    borderBottom: `1px solid ${COLORS.border}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: '10px 14px', color: '#fff', fontSize: 13,
    borderBottom: `1px solid ${COLORS.border}20`, verticalAlign: 'middle',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
      background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`,
      zIndex: 100, overflowY: 'auto', padding: 28,
      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Historial de Contratos</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, fontSize: 20, lineHeight: 1 }}
        >
          ×
        </button>
      </div>

      {loading ? (
        <p style={{ color: COLORS.muted }}>Cargando contratos...</p>
      ) : contratos.length === 0 ? (
        <p style={{ color: COLORS.muted, textAlign: 'center', marginTop: 60 }}>No hay contratos registrados</p>
      ) : (
        <div style={{ background: COLORS.bg, borderRadius: 10, overflow: 'hidden', border: `1px solid ${COLORS.border}` }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Inicio</th>
                <th style={thStyle}>Término</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Días rest.</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map((c) => {
                const dias = calcDiasRestantes(c.fechaTermino);
                const esIndefinido = c.tipoContrato === 'INDEFINIDO';
                let rowBg = 'transparent';
                if (esIndefinido) rowBg = `${COLORS.green}0a`;
                else if (dias !== null && dias < 0) rowBg = `${COLORS.red}0a`;
                else if (dias !== null && dias <= 30) rowBg = `${COLORS.amber}0a`;

                return (
                  <tr key={c.id} style={{ background: rowBg }}>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>{c.tipoContrato}</span>
                    </td>
                    <td style={{ ...tdStyle, color: COLORS.muted, fontFamily: 'monospace', fontSize: 12 }}>
                      {new Date(c.fechaInicio).toLocaleDateString('es-CL')}
                    </td>
                    <td style={{ ...tdStyle, color: COLORS.muted, fontFamily: 'monospace', fontSize: 12 }}>
                      {esIndefinido ? (
                        <span style={{ color: COLORS.green, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Infinity size={14} /> Indefinido
                        </span>
                      ) : c.fechaTermino ? new Date(c.fechaTermino).toLocaleDateString('es-CL') : '—'}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: 12, color: c.estado === 'VIGENTE' ? COLORS.green : COLORS.muted }}>
                        {c.estado}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      {esIndefinido ? (
                        <span style={{ color: COLORS.green, fontSize: 12 }}>—</span>
                      ) : (
                        <DiasRestantesBadge dias={dias} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function Contratos() {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [porVencer, setPorVencer] = useState<ContratoVencer[]>([]);
  const [loading, setLoading] = useState(false);
  const [historialId, setHistorialId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [funcsRes, vencerRes] = await Promise.all([
          api.get('/rrhh/funcionarios'),
          api.get('/rrhh/contratos/por-vencer'),
        ]);
        setFuncionarios(funcsRes.data?.data ?? []);
        setPorVencer(vencerRes.data?.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // KPIs
  const vigentes = funcionarios.filter(f => {
    if (f.tipoContrato === 'INDEFINIDO') return true;
    const dias = calcDiasRestantes(f.fechaTerminoContrato);
    return dias !== null && dias >= 0;
  }).length;
  const porVencer30 = porVencer.length;
  const terminados = funcionarios.filter(f => {
    if (f.tipoContrato === 'INDEFINIDO') return false;
    const dias = calcDiasRestantes(f.fechaTerminoContrato);
    return dias !== null && dias < 0;
  }).length;

  function getRowStyle(f: Funcionario): React.CSSProperties {
    if (f.tipoContrato === 'INDEFINIDO') return { background: `${COLORS.green}08` };
    const dias = calcDiasRestantes(f.fechaTerminoContrato);
    if (dias === null) return {};
    if (dias < 0) return { background: `${COLORS.red}0d` };
    if (dias <= 30) return { background: `${COLORS.amber}0d` };
    return {};
  }

  function getEstadoContrato(f: Funcionario): { label: string; color: string; bg: string } {
    if (f.tipoContrato === 'INDEFINIDO') return { label: 'Indefinido', color: COLORS.green, bg: '#10b98122' };
    const dias = calcDiasRestantes(f.fechaTerminoContrato);
    if (dias === null) return { label: 'Sin término', color: COLORS.muted, bg: '#8899aa22' };
    if (dias < 0) return { label: 'Terminado', color: COLORS.red, bg: '#ef444422' };
    if (dias <= 30) return { label: 'Por vencer', color: COLORS.amber, bg: '#f59e0b22' };
    return { label: 'Vigente', color: COLORS.green, bg: '#10b98122' };
  }

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

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '32px 40px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ background: `${COLORS.amber}22`, borderRadius: 10, padding: 10 }}>
          <FileText size={24} color={COLORS.amber} />
        </div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Contratos Laborales</h1>
      </div>

      {/* Alert Banner */}
      {porVencer30 > 0 && (
        <div style={{
          background: porVencer30 > 5 ? `${COLORS.red}18` : `${COLORS.amber}18`,
          border: `1px solid ${porVencer30 > 5 ? COLORS.red : COLORS.amber}44`,
          borderRadius: 10, padding: '14px 20px', marginBottom: 24,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={20} color={porVencer30 > 5 ? COLORS.red : COLORS.amber} />
          <div>
            <span style={{ color: '#fff', fontWeight: 600 }}>
              {porVencer30} {porVencer30 === 1 ? 'contrato vence' : 'contratos vencen'} en los próximos 30 días
            </span>
            {porVencer.slice(0, 3).map((c, i) => (
              <span key={i} style={{ color: COLORS.muted, fontSize: 13, marginLeft: 8 }}>
                • {c.funcionarioNombre} ({c.diasRestantes}d)
              </span>
            ))}
            {porVencer.length > 3 && (
              <span style={{ color: COLORS.muted, fontSize: 13, marginLeft: 8 }}>
                y {porVencer.length - 3} más...
              </span>
            )}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard label="Contratos Vigentes"   value={vigentes}    icon={CheckCircle}    color={COLORS.green} />
        <KpiCard label="Por Vencer (30 días)" value={porVencer30} icon={Clock}          color={COLORS.amber} />
        <KpiCard label="Terminados"           value={terminados}  icon={XCircle}        color={COLORS.red} />
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { color: COLORS.green, label: 'Contrato indefinido' },
          { color: COLORS.amber, label: 'Vence en ≤ 30 días' },
          { color: COLORS.red,   label: 'Vencido / Terminado' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: `${color}44`, border: `1px solid ${color}88` }} />
            <span style={{ color: COLORS.muted, fontSize: 13 }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                <th style={thStyle}>Funcionario</th>
                <th style={thStyle}>RUN</th>
                <th style={thStyle}>Tipo Contrato</th>
                <th style={thStyle}>Fecha Inicio</th>
                <th style={thStyle}>Fecha Término</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Días Restantes</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    Cargando contratos...
                  </td>
                </tr>
              ) : funcionarios.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    No hay funcionarios registrados
                  </td>
                </tr>
              ) : (
                funcionarios.map((f) => {
                  const diasRestantes = f.tipoContrato === 'INDEFINIDO'
                    ? null
                    : calcDiasRestantes(f.fechaTerminoContrato);
                  const estadoContrato = getEstadoContrato(f);
                  const esIndefinido = f.tipoContrato === 'INDEFINIDO';

                  return (
                    <tr
                      key={f.id}
                      style={{ ...getRowStyle(f), transition: 'filter 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}
                    >
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        <div>{f.nombres} {f.apellidos}</div>
                        <div style={{ color: COLORS.muted, fontSize: 12 }}>{f.cargo}</div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.muted }}>
                        {f.run}
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {esIndefinido && <Infinity size={14} color={COLORS.green} />}
                          <span style={{ fontSize: 13 }}>{f.tipoContrato}</span>
                        </div>
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.muted }}>
                        {new Date(f.fechaIngreso).toLocaleDateString('es-CL')}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.muted }}>
                        {esIndefinido ? (
                          <span style={{ color: COLORS.green }}>Indefinido</span>
                        ) : f.fechaTerminoContrato ? (
                          new Date(f.fechaTerminoContrato).toLocaleDateString('es-CL')
                        ) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <Badge {...estadoContrato} />
                      </td>
                      <td style={tdStyle}>
                        {esIndefinido ? (
                          <span style={{ color: COLORS.green, fontSize: 13 }}>—</span>
                        ) : (
                          <DiasRestantesBadge dias={diasRestantes} />
                        )}
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setHistorialId(f.id)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            background: `${COLORS.blue}22`, color: COLORS.blue,
                            border: 'none', borderRadius: 6, padding: '6px 12px',
                            cursor: 'pointer', fontSize: 13, fontWeight: 500,
                          }}
                        >
                          <Eye size={14} /> Ver contratos
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historial side panel */}
      {historialId && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
            onClick={() => setHistorialId(null)}
          />
          <ContratoHistorial
            funcionarioId={historialId}
            onClose={() => setHistorialId(null)}
          />
        </>
      )}
    </div>
  );
}
