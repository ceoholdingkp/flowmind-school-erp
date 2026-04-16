import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock, LogIn, LogOut, Calendar, ChevronDown,
  AlertCircle, Activity, Timer, TrendingUp, Minus
} from 'lucide-react';
import api from '../../api/client';

const COLORS = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
};

type TipoDia = 'NORMAL' | 'LICENCIA_MEDICA' | 'AUSENTE_INJUSTIFICADO' | 'FERIADO';

interface Funcionario {
  id: string;
  run: string;
  nombres: string;
  apellidos: string;
  tipo: string;
  cargo: string;
}

interface MarcaAsistencia {
  id: string;
  funcionarioId: string;
  fecha: string;
  horaEntrada: string | null;
  horaSalida: string | null;
  horasTrabajadas: number;
  horasExtra: number;
  atrasoMinutos: number;
  tipoDia: TipoDia;
}

const tipoDiaBadge: Record<TipoDia, { label: string; color: string; bg: string }> = {
  NORMAL:                  { label: 'Normal',                color: COLORS.muted,   bg: '#8899aa22' },
  LICENCIA_MEDICA:         { label: 'Licencia Médica',       color: COLORS.amber,   bg: '#f59e0b22' },
  AUSENTE_INJUSTIFICADO:   { label: 'Ausente Injustificado', color: COLORS.red,     bg: '#ef444422' },
  FERIADO:                 { label: 'Feriado',               color: COLORS.purple,  bg: '#8b5cf622' },
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

function KpiCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: number | string; unit?: string; icon: React.ElementType; color: string;
}) {
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
        <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>
          {value}<span style={{ fontSize: 14, color: COLORS.muted, marginLeft: 4 }}>{unit}</span>
        </div>
      </div>
    </div>
  );
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

export default function AsistenciaRRHH() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [marcas, setMarcas] = useState<MarcaAsistencia[]>([]);
  const [loadingFuncs, setLoadingFuncs] = useState(false);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load funcionarios
  useEffect(() => {
    const fetchFuncionarios = async () => {
      setLoadingFuncs(true);
      try {
        const res = await api.get('/rrhh/funcionarios');
        setFuncionarios(res.data?.data ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingFuncs(false);
      }
    };
    fetchFuncionarios();
  }, []);

  // Load attendance for selected funcionario
  const fetchMarcas = useCallback(async () => {
    if (!selectedId) return;
    setLoadingMarcas(true);
    try {
      const res = await api.get(`/rrhh/asistencia/${selectedId}?mes=${mes}&anio=${anio}`);
      setMarcas(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMarcas(false);
    }
  }, [selectedId, mes, anio]);

  useEffect(() => {
    fetchMarcas();
  }, [fetchMarcas]);

  const handleEntrada = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.post(`/rrhh/asistencia/${selectedId}/entrada`, {});
      setActionMsg({ type: 'ok', text: 'Entrada registrada correctamente' });
      fetchMarcas();
    } catch (e: any) {
      setActionMsg({ type: 'err', text: e?.response?.data?.message ?? 'Error al registrar entrada' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSalida = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setActionMsg(null);
    try {
      await api.post(`/rrhh/asistencia/${selectedId}/salida`, {});
      setActionMsg({ type: 'ok', text: 'Salida registrada correctamente' });
      fetchMarcas();
    } catch (e: any) {
      setActionMsg({ type: 'err', text: e?.response?.data?.message ?? 'Error al registrar salida' });
    } finally {
      setActionLoading(false);
    }
  };

  // KPIs computed from marcas
  const diasTrabajados = marcas.filter(m => m.tipoDia === 'NORMAL' && m.horaEntrada).length;
  const totalHoras = marcas.reduce((s, m) => s + (m.horasTrabajadas || 0), 0);
  const totalExtra = marcas.reduce((s, m) => s + (m.horasExtra || 0), 0);
  const totalAtrasos = marcas.reduce((s, m) => s + (m.atrasoMinutos || 0), 0);

  const selectedFuncionario = funcionarios.find(f => f.id === selectedId);

  const thStyle: React.CSSProperties = {
    color: COLORS.muted, fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${COLORS.border}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: '13px 16px', color: '#fff', fontSize: 14,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <div style={{ background: `${COLORS.cyan}22`, borderRadius: 10, padding: 10 }}>
          <Clock size={24} color={COLORS.cyan} />
        </div>
        <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Asistencia RR.HH.</h1>
      </div>

      {/* Controls Row */}
      <div style={{
        background: COLORS.card, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        {/* Month selector */}
        <div>
          <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Mes</div>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            style={selectStyle}
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>

        {/* Year selector */}
        <div>
          <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Año</div>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            style={selectStyle}
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {/* Funcionario selector */}
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Funcionario</div>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={{ ...selectStyle, width: '100%' }}
            disabled={loadingFuncs}
          >
            <option value="">— Seleccionar funcionario —</option>
            {funcionarios.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nombres} {f.apellidos} ({f.run})
              </option>
            ))}
          </select>
        </div>

        {/* Quick actions */}
        {selectedId && (
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
            <button
              onClick={handleEntrada}
              disabled={actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: `${COLORS.green}22`, color: COLORS.green,
                border: `1px solid ${COLORS.green}44`, borderRadius: 8,
                padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              <LogIn size={16} /> Marcar Entrada
            </button>
            <button
              onClick={handleSalida}
              disabled={actionLoading}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: `${COLORS.amber}22`, color: COLORS.amber,
                border: `1px solid ${COLORS.amber}44`, borderRadius: 8,
                padding: '9px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14,
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              <LogOut size={16} /> Marcar Salida
            </button>
          </div>
        )}
      </div>

      {/* Action feedback */}
      {actionMsg && (
        <div style={{
          background: actionMsg.type === 'ok' ? `${COLORS.green}22` : `${COLORS.red}22`,
          border: `1px solid ${actionMsg.type === 'ok' ? COLORS.green : COLORS.red}44`,
          color: actionMsg.type === 'ok' ? COLORS.green : COLORS.red,
          borderRadius: 8, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {actionMsg.type === 'ok' ? <Activity size={16} /> : <AlertCircle size={16} />}
          {actionMsg.text}
          <button
            onClick={() => setActionMsg(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >×</button>
        </div>
      )}

      {/* KPI Cards */}
      {selectedId && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
          <KpiCard label="Días Trabajados" value={diasTrabajados} unit="días"  icon={Calendar}    color={COLORS.blue} />
          <KpiCard label="Horas Totales"   value={totalHoras.toFixed(1)} unit="hrs" icon={Clock}     color={COLORS.green} />
          <KpiCard label="Horas Extra"     value={totalExtra.toFixed(1)} unit="hrs" icon={TrendingUp} color={COLORS.amber} />
          <KpiCard label="Atrasos"         value={totalAtrasos}          unit="min" icon={Timer}      color={COLORS.red} />
        </div>
      )}

      {/* Table */}
      {!selectedId ? (
        <div style={{
          background: COLORS.card, border: `1px solid ${COLORS.border}`,
          borderRadius: 12, padding: '60px 40px', textAlign: 'center',
        }}>
          <ChevronDown size={36} color={COLORS.muted} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ color: COLORS.muted, margin: 0, fontSize: 15 }}>
            Selecciona un funcionario para ver su registro de asistencia
          </p>
        </div>
      ) : (
        <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
          {selectedFuncionario && (
            <div style={{
              padding: '16px 24px', borderBottom: `1px solid ${COLORS.border}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{ background: `${COLORS.blue}22`, borderRadius: 8, padding: 8 }}>
                <Activity size={16} color={COLORS.blue} />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 15 }}>
                  {selectedFuncionario.nombres} {selectedFuncionario.apellidos}
                </div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>{selectedFuncionario.cargo}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: COLORS.muted, fontSize: 14 }}>
                {MESES[mes - 1]} {anio}
              </div>
            </div>
          )}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: COLORS.bg }}>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Día</th>
                  <th style={thStyle}>Hora Entrada</th>
                  <th style={thStyle}>Hora Salida</th>
                  <th style={thStyle}>Horas Trabajadas</th>
                  <th style={thStyle}>Horas Extra</th>
                  <th style={thStyle}>Atraso (min)</th>
                  <th style={thStyle}>Tipo Día</th>
                </tr>
              </thead>
              <tbody>
                {loadingMarcas ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                      Cargando registros...
                    </td>
                  </tr>
                ) : marcas.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                      <AlertCircle size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                      Sin registros para este período
                    </td>
                  </tr>
                ) : (
                  marcas.map((m) => {
                    const fecha = new Date(m.fecha);
                    const esFeriado = m.tipoDia === 'FERIADO';
                    const esAusente = m.tipoDia === 'AUSENTE_INJUSTIFICADO';
                    const rowBg = esFeriado ? `${COLORS.purple}11` : esAusente ? `${COLORS.red}11` : 'transparent';

                    return (
                      <tr
                        key={m.id}
                        style={{ background: rowBg, transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = rowBg || `${COLORS.border}30`)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = rowBg)}
                      >
                        <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13 }}>
                          {fecha.toLocaleDateString('es-CL')}
                        </td>
                        <td style={{ ...tdStyle, color: COLORS.muted }}>
                          {DIAS[fecha.getDay()]}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: COLORS.green }}>
                          {m.horaEntrada ?? <Minus size={14} color={COLORS.muted} />}
                        </td>
                        <td style={{ ...tdStyle, fontFamily: 'monospace', color: COLORS.amber }}>
                          {m.horaSalida ?? <Minus size={14} color={COLORS.muted} />}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>
                          {m.horasTrabajadas ? `${m.horasTrabajadas.toFixed(1)} hrs` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: m.horasExtra > 0 ? COLORS.amber : COLORS.muted }}>
                          {m.horasExtra > 0 ? `+${m.horasExtra.toFixed(1)} hrs` : '—'}
                        </td>
                        <td style={{ ...tdStyle, textAlign: 'center', color: m.atrasoMinutos > 0 ? COLORS.red : COLORS.muted }}>
                          {m.atrasoMinutos > 0 ? m.atrasoMinutos : '—'}
                        </td>
                        <td style={tdStyle}>
                          <Badge config={tipoDiaBadge[m.tipoDia] ?? tipoDiaBadge.NORMAL} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
