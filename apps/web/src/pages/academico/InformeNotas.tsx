import React, { useEffect, useState } from 'react';
import { GraduationCap, Users, CheckCircle, XCircle, BookOpen } from 'lucide-react';
import api from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

interface AsignaturaInfo {
  id: string;
  nombre: string;
}

interface FilaInforme {
  alumno: {
    id: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
  };
  promediosPorAsignatura: Record<string, number | null>;
  promedioGeneral: number | null;
}

interface Stats {
  promedioCurso: number;
  aprobados: number;
  reprobados: number;
  totalAlumnos: number;
}

interface InformeData {
  curso: { id: string; nombre: string; docenteJefe?: { nombres: string; apellidos: string } };
  asignaturas: AsignaturaInfo[];
  filas: FilaInforme[];
  stats: Stats;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function cellStyle(val: number | null): React.CSSProperties {
  if (val === null) return { color: 'var(--muted)' };
  if (val >= 6) return { background: '#dcfce7', color: '#15803d' };
  if (val >= 4) return { background: '#fef3c7', color: '#b45309' };
  return { background: '#fee2e2', color: '#b91c1c' };
}

function promedioBg(val: number | null): React.CSSProperties {
  if (val === null) return { background: 'transparent', color: 'var(--muted)' };
  if (val >= 6) return { background: '#dcfce7', color: '#15803d' };
  if (val >= 4) return { background: '#fef3c7', color: '#b45309' };
  return { background: '#fee2e2', color: '#b91c1c' };
}

// ── Skeleton components ────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '1.25rem', minHeight: 90, animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

function SkeletonTable() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
      overflow: 'hidden',
    }}>
      {[...Array(7)].map((_, i) => (
        <div key={i} style={{
          display: 'flex', gap: 1, padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 1 - i * 0.1,
        }}>
          <div style={{ width: 180, height: 14, background: 'var(--border)', borderRadius: 4 }} />
          {[...Array(5)].map((_, j) => (
            <div key={j} style={{ flex: 1, height: 14, background: 'var(--border)', borderRadius: 4, marginLeft: 12 }} />
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Select helper ──────────────────────────────────────────────────────────────

function Select({
  value, onChange, disabled, children,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        color: 'var(--text-primary)',
        padding: '0.4rem 0.75rem',
        fontSize: '0.875rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        minWidth: 180,
      }}
    >
      {children}
    </select>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function InformeNotas() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [semestre, setSemestre] = useState<1 | 2>(1);
  const anio = 2026;

  const [informe, setInforme] = useState<InformeData | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingInforme, setLoadingInforme] = useState(false);
  const [error, setError] = useState('');

  // Load cursos on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoadingInit(true);
      setError('');
      try {
        const r = await api.get('/sistema/cursos', { params: { anio } });
        if (!cancelled) setCursos(r.data?.data ?? r.data ?? []);
      } catch {
        if (!cancelled) setError('No se pudieron cargar los cursos.');
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Load informe when curso/semestre changes
  useEffect(() => {
    if (!cursoId) {
      setInforme(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingInforme(true);
      setError('');
      try {
        const r = await api.get(`/academico/notas/informe/${cursoId}`, { params: { semestre, anio } });
        if (!cancelled) setInforme(r.data?.data ?? r.data);
      } catch {
        if (!cancelled) {
          setError('No se pudo cargar el informe de notas.');
          setInforme(null);
        }
      } finally {
        if (!cancelled) setLoadingInforme(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cursoId, semestre]);

  const btnSemestre = (s: 1 | 2): React.CSSProperties => ({
    padding: '0.4rem 1rem',
    borderRadius: 6,
    border: '1px solid var(--border)',
    fontWeight: 600,
    fontSize: '0.875rem',
    cursor: 'pointer',
    background: semestre === s ? 'var(--nav-active)' : 'var(--card)',
    color: semestre === s ? '#fff' : 'var(--text-primary)',
    transition: 'background 0.15s',
  });

  const isLoading = loadingInforme;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1400 }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={24} color="var(--nav-active)" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Informe de Notas
          </h1>
        </div>
        <p style={{ margin: '4px 0 0 34px', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Promedios por asignatura y promedio general por alumno
        </p>
      </div>

      {/* ── Filters ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
        padding: '1rem 1.25rem', marginBottom: '1.25rem',
        display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center',
      }}>
        {/* Curso */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            CURSO
          </label>
          <Select value={cursoId} onChange={setCursoId} disabled={loadingInit}>
            <option value="">Seleccionar curso…</option>
            {cursos.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </Select>
        </div>

        {/* Semestre */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            SEMESTRE
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={btnSemestre(1)} onClick={() => setSemestre(1)}>1°</button>
            <button style={btnSemestre(2)} onClick={() => setSemestre(2)}>2°</button>
          </div>
        </div>

        {/* Año */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            AÑO
          </label>
          <span style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.4rem 0.75rem', fontSize: '0.875rem', color: 'var(--text-primary)',
          }}>
            {anio}
          </span>
        </div>

        {/* Docente jefe label */}
        {informe?.curso?.docenteJefe && (
          <div style={{ marginLeft: 'auto', fontSize: '0.83rem', color: 'var(--muted)' }}>
            Docente jefe:{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
              {informe.curso.docenteJefe.nombres} {informe.curso.docenteJefe.apellidos}
            </span>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '0.75rem 1rem', color: '#b91c1c', fontSize: '0.875rem',
          marginBottom: '1rem',
        }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loadingInit && !error && !cursoId && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '3rem', textAlign: 'center',
        }}>
          <BookOpen size={40} color="var(--muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>
            Selecciona un curso para ver el informe de notas.
          </p>
        </div>
      )}

      {/* ── Stat cards (loading) ── */}
      {cursoId && isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* ── Stat cards ── */}
      {!isLoading && informe && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>

          {/* Promedio Curso */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '1.1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <GraduationCap size={18} color="var(--nav-active)" />
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Promedio Curso
              </span>
            </div>
            <span style={{
              fontSize: '2rem', fontWeight: 800,
              ...promedioBg(informe.stats.promedioCurso),
              background: 'transparent',
            }}>
              {informe.stats.promedioCurso.toFixed(1)}
            </span>
          </div>

          {/* Aprobados */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '1.1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <CheckCircle size={18} color="#15803d" />
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Alumnos Aprobados
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#15803d' }}>
                {informe.stats.aprobados}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                / {informe.stats.totalAlumnos}
              </span>
            </div>
          </div>

          {/* Reprobados */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '1.1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <XCircle size={18} color="#b91c1c" />
              <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Alumnos Reprobados
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: '#b91c1c' }}>
                {informe.stats.reprobados}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
                / {informe.stats.totalAlumnos}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Table loading ── */}
      {cursoId && isLoading && <SkeletonTable />}

      {/* ── Informe table ── */}
      {!isLoading && informe && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          overflowX: 'auto',
        }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 600 }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {/* Alumno header – sticky */}
                <th style={{
                  position: 'sticky', left: 0, zIndex: 2,
                  background: 'var(--sidebar)',
                  padding: '0.75rem 1rem',
                  textAlign: 'left', fontSize: '0.75rem', fontWeight: 700,
                  color: 'var(--muted)', letterSpacing: '0.05em', textTransform: 'uppercase',
                  borderRight: '1px solid var(--border)',
                  whiteSpace: 'nowrap', minWidth: 200,
                }}>
                  Alumno
                </th>

                {/* Asignaturas */}
                {informe.asignaturas.map((asig) => (
                  <th key={asig.id} style={{
                    padding: '0.75rem 0.75rem', textAlign: 'center',
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: 110,
                  }}>
                    {asig.nombre}
                  </th>
                ))}

                {/* Promedio general */}
                <th style={{
                  padding: '0.75rem 1rem', textAlign: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', minWidth: 105,
                }}>
                  Prom. General
                </th>
              </tr>
            </thead>

            <tbody>
              {informe.filas.length === 0 ? (
                <tr>
                  <td
                    colSpan={informe.asignaturas.length + 2}
                    style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}
                  >
                    No hay alumnos registrados para este curso.
                  </td>
                </tr>
              ) : (
                informe.filas.map((fila, idx) => (
                  <tr
                    key={fila.alumno.id}
                    style={{ background: idx % 2 === 0 ? 'var(--card)' : 'var(--sidebar)' }}
                  >
                    {/* Alumno – sticky */}
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1,
                      background: idx % 2 === 0 ? 'var(--card)' : 'var(--sidebar)',
                      padding: '0.65rem 1rem',
                      borderRight: '1px solid var(--border)',
                      fontSize: '0.875rem', color: 'var(--text-primary)',
                      fontWeight: 500, whiteSpace: 'nowrap',
                    }}>
                      {fila.alumno.apellidoPaterno}{fila.alumno.apellidoMaterno ? ` ${fila.alumno.apellidoMaterno}` : ''}, {fila.alumno.nombres}
                    </td>

                    {/* Promedio por asignatura */}
                    {informe.asignaturas.map((asig) => {
                      const val = fila.promediosPorAsignatura[asig.id] ?? null;
                      const cs = cellStyle(val);
                      return (
                        <td key={asig.id} style={{
                          padding: '0.5rem 0.5rem', textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                        }}>
                          <span style={{
                            display: 'inline-block', padding: '2px 8px',
                            borderRadius: 5, fontSize: '0.875rem', fontWeight: 600,
                            ...(val !== null ? cs : {}),
                          }}>
                            {val !== null ? val.toFixed(1) : (
                              <span style={{ color: 'var(--muted)', fontWeight: 400 }}>–</span>
                            )}
                          </span>
                        </td>
                      );
                    })}

                    {/* Promedio general */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: 6, fontSize: '0.9rem', fontWeight: 700,
                        ...promedioBg(fila.promedioGeneral),
                      }}>
                        {fila.promedioGeneral !== null ? fila.promedioGeneral.toFixed(1) : (
                          <span style={{ color: 'var(--muted)', fontWeight: 400 }}>–</span>
                        )}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Footer info ── */}
      {informe && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
          {informe.filas.length} alumno{informe.filas.length !== 1 ? 's' : ''} · {informe.asignaturas.length} asignatura{informe.asignaturas.length !== 1 ? 's' : ''}
          {informe.curso?.nombre ? ` · ${informe.curso.nombre}` : ''}
        </p>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
