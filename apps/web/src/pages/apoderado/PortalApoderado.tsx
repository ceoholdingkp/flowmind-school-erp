import React, { useEffect, useState } from 'react';
import {
  GraduationCap, BookOpen, CalendarCheck, CreditCard,
  LogOut, RefreshCw, CheckCircle, XCircle, Clock,
  FileText, TrendingUp, User, ChevronDown, AlertCircle,
} from 'lucide-react';
import api from '../../api/client';
import { useAuthStore } from '../../store/auth.store';
import { useNavigate } from 'react-router-dom';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Alumno {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  run: string;
  estadoMatricula: string;
  esPIE: boolean;
  esPrioritario: boolean;
  esPreferente: boolean;
  parentesco: string;
  curso?: { id: string; nombre: string; nivel: string };
}

interface Nota {
  id: string;
  alumnoId: string;
  alumno: { nombres: string; apellidoPaterno: string };
  asignatura: { nombre: string };
  nombreEvaluacion: string;
  tipo: string;
  valor: number;
  ponderacion: number;
  fecha: string;
  semestre: number;
  anio: number;
}

interface Asistencia {
  id: string;
  alumnoId: string;
  alumno: { nombres: string; apellidoPaterno: string };
  curso: { nombre: string };
  fecha: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'ATRASO' | 'JUSTIFICADO' | 'RETIRADO_ANTICIPADO';
}

interface AsistenciaStats {
  alumnoId: string;
  total: number;
  presentes: number;
  ausentes: number;
  atrasos: number;
  justificados: number;
  pctAsistencia: number;
}

interface Pago {
  id: string;
  alumnoId: string;
  alumno: { nombres: string; apellidoPaterno: string };
  monto: number;
  fecha: string;
  metodo: string;
  estado: 'PENDIENTE' | 'PAGADO' | 'RECHAZADO' | 'ANULADO';
  descripcion?: string;
  cuotaNumero?: number;
  mesCorresponde?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const COLORS = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
};

const estadoAsistColor: Record<string, string> = {
  PRESENTE: '#10b981', AUSENTE: '#ef4444',
  ATRASO: '#f59e0b', JUSTIFICADO: '#8b5cf6', RETIRADO_ANTICIPADO: '#06b6d4',
};

const estadoPagoColor: Record<string, { color: string; bg: string }> = {
  PENDIENTE: { color: '#f59e0b', bg: '#f59e0b22' },
  PAGADO: { color: '#10b981', bg: '#10b98122' },
  RECHAZADO: { color: '#ef4444', bg: '#ef444422' },
  ANULADO: { color: 'var(--muted)', bg: '#8899aa22' },
};

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const gradeColor = (v: number) => v >= 5 ? COLORS.green : v >= 4 ? COLORS.amber : COLORS.red;

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: COLORS.purple }}>{icon}</span>
        <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 16, margin: 0 }}>{title}</h3>
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

function AlumnoChip({ alumno, selected, onClick }: {
  alumno: Alumno; selected: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: selected ? `${COLORS.purple}22` : COLORS.bg,
        border: `1px solid ${selected ? COLORS.purple : COLORS.border}`,
        borderRadius: 10, padding: '10px 16px', cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: '50%', background: `${COLORS.purple}33`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <User size={16} color={COLORS.purple} />
      </div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 600 }}>
          {alumno.apellidoPaterno} {alumno.apellidoMaterno}
        </div>
        <div style={{ color: COLORS.muted, fontSize: 12 }}>
          {alumno.curso?.nombre ?? 'Sin curso'} · {alumno.parentesco}
        </div>
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type Tab = 'notas' | 'asistencia' | 'pagos';

export default function PortalApoderado() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const [apoderado, setApoderado] = useState<any>(null);
  const [pupilos, setPupilos] = useState<Alumno[]>([]);
  const [selectedAlumno, setSelectedAlumno] = useState<Alumno | null>(null);
  const [tab, setTab] = useState<Tab>('notas');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [notas, setNotas] = useState<Nota[]>([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [asistencia, setAsistencia] = useState<Asistencia[]>([]);
  const [asistStats, setAsistStats] = useState<AsistenciaStats[]>([]);
  const [asistLoading, setAsistLoading] = useState(false);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [pagosLoading, setPagosLoading] = useState(false);

  // Load apoderado profile
  useEffect(() => {
    const loadMe = async () => {
      setLoading(true);
      try {
        const res = await api.get('/portal/me');
        setApoderado(res.data.data.apoderado);
        setPupilos(res.data.data.pupilos ?? []);
        if (res.data.data.pupilos?.length > 0) {
          setSelectedAlumno(res.data.data.pupilos[0]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message ?? 'Error al cargar datos del portal');
      } finally {
        setLoading(false);
      }
    };
    loadMe();
  }, []);

  // Load tab data when alumno or tab changes
  useEffect(() => {
    if (!selectedAlumno) return;

    if (tab === 'notas') {
      setNotasLoading(true);
      api.get('/portal/notas', { params: { alumnoId: selectedAlumno.id } })
        .then((r) => setNotas(r.data.data ?? []))
        .catch(() => {})
        .finally(() => setNotasLoading(false));
    } else if (tab === 'asistencia') {
      setAsistLoading(true);
      api.get('/portal/asistencia', { params: { alumnoId: selectedAlumno.id } })
        .then((r) => {
          setAsistencia(r.data.data ?? []);
          setAsistStats(r.data.stats ?? []);
        })
        .catch(() => {})
        .finally(() => setAsistLoading(false));
    } else if (tab === 'pagos') {
      setPagosLoading(true);
      api.get('/portal/pagos', { params: { alumnoId: selectedAlumno.id } })
        .then((r) => setPagos(r.data.data ?? []))
        .catch(() => {})
        .finally(() => setPagosLoading(false));
    }
  }, [selectedAlumno, tab]);

  const handleLogout = () => {
    logout();
    navigate('/apoderado/login');
  };

  // ── Notas view ────────────────────────────────────────────────
  const notasFiltradas = selectedAlumno
    ? notas.filter((n) => n.alumnoId === selectedAlumno.id)
    : notas;

  const promediosPorAsig: Record<string, { promedio: number; notas: Nota[] }> = {};
  notasFiltradas.forEach((n) => {
    const asig = n.asignatura.nombre;
    if (!promediosPorAsig[asig]) promediosPorAsig[asig] = { promedio: 0, notas: [] };
    promediosPorAsig[asig].notas.push(n);
  });
  Object.keys(promediosPorAsig).forEach((asig) => {
    const ns = promediosPorAsig[asig].notas;
    const total = ns.reduce((s, n) => s + Number(n.valor), 0);
    promediosPorAsig[asig].promedio = ns.length ? Math.round((total / ns.length) * 10) / 10 : 0;
  });

  // ── Stats for selected alumno ────────────────────────────────
  const selectedStats = asistStats.find((s) => s.alumnoId === selectedAlumno?.id);

  // ── Pagos para alumno seleccionado ───────────────────────────
  const pagosFiltrados = selectedAlumno
    ? pagos.filter((p) => p.alumnoId === selectedAlumno.id)
    : pagos;
  const totalPendiente = pagosFiltrados
    .filter((p) => p.estado === 'PENDIENTE')
    .reduce((s, p) => s + Number(p.monto), 0);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={28} color={COLORS.purple} className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <AlertCircle size={40} color={COLORS.red} />
        <p style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600 }}>{error}</p>
        <p style={{ color: COLORS.muted, fontSize: 14 }}>Comunícate con la secretaría del colegio.</p>
        <button onClick={handleLogout} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, color: COLORS.muted, borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
          Cerrar sesión
        </button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg, fontFamily: 'system-ui, sans-serif' }}>
      {/* ── Nav ── */}
      <header style={{
        background: COLORS.card, borderBottom: `1px solid ${COLORS.border}`,
        padding: '0 32px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', height: 60,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={22} color={COLORS.purple} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>Portal Apoderado</span>
          <span style={{ color: COLORS.muted, fontSize: 13 }}>· Colegio San Andrés</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ color: COLORS.muted, fontSize: 13 }}>
            {apoderado?.nombres} {apoderado?.apellidos}
          </span>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: `1px solid ${COLORS.border}`,
              color: COLORS.muted, borderRadius: 8, padding: '6px 12px',
              cursor: 'pointer', fontSize: 13,
            }}
          >
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* ── Pupilo selector ── */}
        {pupilos.length > 1 && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ color: COLORS.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
              Mis pupilos
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {pupilos.map((p) => (
                <AlumnoChip
                  key={p.id}
                  alumno={p}
                  selected={selectedAlumno?.id === p.id}
                  onClick={() => setSelectedAlumno(p)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Alumno header card ── */}
        {selectedAlumno && (
          <div style={{
            background: `linear-gradient(135deg, ${COLORS.card} 0%, rgba(139,92,246,0.08) 100%)`,
            border: `1px solid ${COLORS.purple}33`,
            borderRadius: 14, padding: '20px 24px', marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: `${COLORS.purple}33`, border: `2px solid ${COLORS.purple}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={24} color={COLORS.purple} />
              </div>
              <div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 700, margin: 0 }}>
                  {selectedAlumno.apellidoPaterno} {selectedAlumno.apellidoMaterno}, {selectedAlumno.nombres}
                </h2>
                <p style={{ color: COLORS.muted, fontSize: 14, margin: '4px 0 0' }}>
                  RUN: {selectedAlumno.run} · {selectedAlumno.curso?.nombre ?? 'Sin curso'} · {selectedAlumno.parentesco}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedAlumno.esPIE && (
                <span style={{ background: `${COLORS.purple}22`, color: COLORS.purple, border: `1px solid ${COLORS.purple}44`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>PIE</span>
              )}
              {selectedAlumno.esPrioritario && (
                <span style={{ background: `${COLORS.amber}22`, color: COLORS.amber, border: `1px solid ${COLORS.amber}44`, borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>Prioritario</span>
              )}
              <span style={{
                background: selectedAlumno.estadoMatricula === 'ACTIVA' ? `${COLORS.green}22` : `${COLORS.muted}22`,
                color: selectedAlumno.estadoMatricula === 'ACTIVA' ? COLORS.green : COLORS.muted,
                border: `1px solid ${selectedAlumno.estadoMatricula === 'ACTIVA' ? COLORS.green : COLORS.muted}44`,
                borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 600,
              }}>
                {selectedAlumno.estadoMatricula}
              </span>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{
          display: 'flex', gap: 4, marginBottom: 24,
          background: COLORS.card, borderRadius: 10, padding: 4,
          border: `1px solid ${COLORS.border}`, width: 'fit-content',
        }}>
          {([
            { key: 'notas', label: 'Notas', icon: <BookOpen size={15} /> },
            { key: 'asistencia', label: 'Asistencia', icon: <CalendarCheck size={15} /> },
            { key: 'pagos', label: 'Pagos', icon: <CreditCard size={15} /> },
          ] as const).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: tab === t.key ? COLORS.purple : 'transparent',
                color: tab === t.key ? '#fff' : COLORS.muted,
                fontWeight: tab === t.key ? 600 : 400,
                fontSize: 14, transition: 'all 0.2s',
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}

        {/* NOTAS */}
        {tab === 'notas' && (
          <div>
            {notasLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: COLORS.muted }}>
                <RefreshCw size={18} style={{ marginRight: 8 }} /> Cargando notas...
              </div>
            ) : notasFiltradas.length === 0 ? (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '40px', textAlign: 'center', color: COLORS.muted }}>
                No hay notas registradas aún.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {Object.entries(promediosPorAsig).map(([asig, { promedio, notas: ns }]) => (
                  <SectionCard key={asig} title={asig} icon={<TrendingUp size={18} />}>
                    {/* Promedio header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                      <span style={{ color: COLORS.muted, fontSize: 13 }}>Promedio</span>
                      <span style={{
                        fontSize: 24, fontWeight: 700,
                        color: gradeColor(promedio),
                      }}>
                        {promedio.toFixed(1)}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ width: '100%', height: 4, background: COLORS.bg, borderRadius: 2, marginBottom: 16, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 2,
                        width: `${Math.min(100, (promedio / 7) * 100)}%`,
                        background: gradeColor(promedio),
                        transition: 'width 0.5s ease',
                      }} />
                    </div>
                    {/* Individual grades */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {ns.slice(0, 6).map((n) => (
                        <div key={n.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ color: 'var(--text-primary)', fontSize: 13 }}>{n.nombreEvaluacion}</span>
                            <span style={{ color: COLORS.muted, fontSize: 11, marginLeft: 8 }}>
                              {new Date(n.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                          <span style={{
                            fontWeight: 700, fontSize: 15,
                            color: gradeColor(Number(n.valor)),
                          }}>
                            {Number(n.valor).toFixed(1)}
                          </span>
                        </div>
                      ))}
                      {ns.length > 6 && (
                        <span style={{ color: COLORS.muted, fontSize: 12, textAlign: 'center' }}>
                          +{ns.length - 6} evaluaciones más
                        </span>
                      )}
                    </div>
                  </SectionCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ASISTENCIA */}
        {tab === 'asistencia' && (
          <div>
            {/* Stats card */}
            {selectedStats && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                {[
                  { label: 'Asistencia', val: `${selectedStats.pctAsistencia}%`, color: selectedStats.pctAsistencia >= 85 ? COLORS.green : selectedStats.pctAsistencia >= 70 ? COLORS.amber : COLORS.red },
                  { label: 'Presentes', val: selectedStats.presentes, color: COLORS.green },
                  { label: 'Ausentes', val: selectedStats.ausentes, color: COLORS.red },
                  { label: 'Atrasos', val: selectedStats.atrasos, color: COLORS.amber },
                  { label: 'Justificados', val: selectedStats.justificados, color: COLORS.purple },
                ].map((s) => (
                  <div key={s.label} style={{
                    flex: 1, minWidth: 100,
                    background: COLORS.card, border: `1px solid ${COLORS.border}`,
                    borderRadius: 10, padding: '14px 16px', textAlign: 'center',
                  }}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ color: COLORS.muted, fontSize: 12, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {asistLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: COLORS.muted }}>
                <RefreshCw size={18} style={{ marginRight: 8 }} /> Cargando asistencia...
              </div>
            ) : asistencia.length === 0 ? (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '40px', textAlign: 'center', color: COLORS.muted }}>
                No hay registros de asistencia.
              </div>
            ) : (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: COLORS.bg }}>
                      {['Fecha', 'Curso', 'Estado'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: COLORS.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {asistencia
                      .filter((a) => !selectedAlumno || a.alumnoId === selectedAlumno.id)
                      .slice(0, 60)
                      .map((a, i) => (
                        <tr key={a.id} style={{ borderTop: i > 0 ? `1px solid ${COLORS.border}20` : 'none' }}>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>
                            {new Date(a.fecha).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' })}
                          </td>
                          <td style={{ padding: '10px 16px', color: COLORS.muted }}>{a.curso.nombre}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              background: `${estadoAsistColor[a.estado] ?? COLORS.muted}22`,
                              color: estadoAsistColor[a.estado] ?? COLORS.muted,
                              border: `1px solid ${estadoAsistColor[a.estado] ?? COLORS.muted}44`,
                              borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                            }}>
                              {a.estado.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* PAGOS */}
        {tab === 'pagos' && (
          <div>
            {/* Summary */}
            {totalPendiente > 0 && (
              <div style={{
                background: `${COLORS.amber}11`, border: `1px solid ${COLORS.amber}44`,
                borderRadius: 10, padding: '14px 20px', marginBottom: 20,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <AlertCircle size={18} color={COLORS.amber} />
                <span style={{ color: COLORS.amber, fontWeight: 600 }}>
                  Saldo pendiente: {fmt(totalPendiente)}
                </span>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>
                  — Comunícate con administración para regularizar.
                </span>
              </div>
            )}

            {pagosLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: COLORS.muted }}>
                <RefreshCw size={18} style={{ marginRight: 8 }} /> Cargando pagos...
              </div>
            ) : pagosFiltrados.length === 0 ? (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '40px', textAlign: 'center', color: COLORS.muted }}>
                No hay registros de pagos.
              </div>
            ) : (
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: COLORS.bg }}>
                      {['Fecha', 'Descripción', 'Monto', 'Método', 'Estado'].map((h) => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: COLORS.muted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: `1px solid ${COLORS.border}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pagosFiltrados.map((p, i) => {
                      const st = estadoPagoColor[p.estado] ?? { color: COLORS.muted, bg: '#8899aa22' };
                      return (
                        <tr key={p.id} style={{ borderTop: i > 0 ? `1px solid ${COLORS.border}20` : 'none' }}>
                          <td style={{ padding: '10px 16px', color: COLORS.muted }}>
                            {new Date(p.fecha).toLocaleDateString('es-CL')}
                          </td>
                          <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>
                            {p.descripcion ?? (p.mesCorresponde ? `Cuota ${MESES[(p.mesCorresponde - 1) % 12]}` : 'Pago mensualidad')}
                            {p.cuotaNumero && <span style={{ color: COLORS.muted, fontSize: 12, marginLeft: 6 }}>#{p.cuotaNumero}</span>}
                          </td>
                          <td style={{ padding: '10px 16px', color: COLORS.green, fontWeight: 600 }}>
                            {fmt(Number(p.monto))}
                          </td>
                          <td style={{ padding: '10px 16px', color: COLORS.muted }}>{p.metodo}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{
                              background: st.bg, color: st.color,
                              border: `1px solid ${st.color}44`,
                              borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600,
                            }}>
                              {p.estado}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
