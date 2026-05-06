import React, { useEffect, useState } from 'react';
import { GraduationCap, BookOpen } from 'lucide-react';
import api from '../../api/client';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

interface Asignatura {
  id: string;
  nombre: string;
  codigo: string;
}

interface Evaluacion {
  id: string;
  nombre: string;
  tipo: string;
  ponderacion: number;
  fechaAplicacion: string;
  semestre: number;
}

interface FilaAlumno {
  alumno: { id: string; nombres: string; apellidoPaterno: string };
  notas: Record<string, number | null>;
  promedio: number | null;
}

interface NotasData {
  evaluaciones: Evaluacion[];
  filas: FilaAlumno[];
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function gradeColor(val: number | null): { color: string } {
  if (val === null) return { color: 'var(--muted)' };
  if (val >= 6) return { color: '#15803d' };
  if (val >= 4) return { color: '#b45309' };
  return { color: '#b91c1c' };
}

function promedioBg(val: number | null): React.CSSProperties {
  if (val === null) return { background: 'transparent' };
  if (val >= 6) return { background: '#dcfce7', color: '#15803d' };
  if (val >= 4) return { background: '#fef3c7', color: '#b45309' };
  return { background: '#fee2e2', color: '#b91c1c' };
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function SkeletonTable() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
      overflow: 'hidden',
    }}>
      {[...Array(6)].map((_, i) => (
        <div key={i} style={{
          display: 'flex', gap: 1, padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--border)',
          animation: 'pulse 1.5s ease-in-out infinite',
          opacity: 1 - i * 0.12,
        }}>
          <div style={{ width: 180, height: 14, background: 'var(--border)', borderRadius: 4 }} />
          {[...Array(4)].map((_, j) => (
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

export default function LibroNotas() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [asignaturaId, setAsignaturaId] = useState('');
  const [semestre, setSemestre] = useState<1 | 2>(1);
  const anio = 2026;

  const [notasData, setNotasData] = useState<NotasData | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [error, setError] = useState('');

  // Load cursos + asignaturas on mount
  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoadingInit(true);
      setError('');
      try {
        const [rCursos, rAsigs] = await Promise.all([
          api.get('/sistema/cursos', { params: { anio } }),
          api.get('/academico/asignaturas'),
        ]);
        if (!cancelled) {
          setCursos(rCursos.data?.data ?? rCursos.data ?? []);
          setAsignaturas(Array.isArray(rAsigs.data) ? rAsigs.data : rAsigs.data?.data ?? []);
        }
      } catch {
        if (!cancelled) setError('No se pudieron cargar cursos o asignaturas.');
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    };
    init();
    return () => { cancelled = true; };
  }, []);

  // Load notas when selection is complete
  useEffect(() => {
    if (!cursoId || !asignaturaId) {
      setNotasData(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingNotas(true);
      setError('');
      try {
        const r = await api.get(
          `/academico/notas/curso/${cursoId}/asignatura/${asignaturaId}`,
          { params: { semestre, anio } },
        );
        if (!cancelled) setNotasData(r.data?.data ?? r.data);
      } catch {
        if (!cancelled) {
          setError('No se pudieron cargar las notas.');
          setNotasData(null);
        }
      } finally {
        if (!cancelled) setLoadingNotas(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [cursoId, asignaturaId, semestre]);

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

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1300 }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={24} color="var(--nav-active)" />
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Libro de Notas
          </h1>
        </div>
        <p style={{ margin: '4px 0 0 34px', fontSize: '0.875rem', color: 'var(--muted)' }}>
          Registro de evaluaciones y calificaciones por asignatura
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

        {/* Asignatura */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            ASIGNATURA
          </label>
          <Select value={asignaturaId} onChange={setAsignaturaId} disabled={loadingInit}>
            <option value="">Seleccionar asignatura…</option>
            {asignaturas.map((a) => (
              <option key={a.id} value={a.id}>{a.nombre}</option>
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

      {/* ── Loading skeleton (init) ── */}
      {loadingInit && <SkeletonTable />}

      {/* ── Empty state ── */}
      {!loadingInit && !error && (!cursoId || !asignaturaId) && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '3rem', textAlign: 'center',
        }}>
          <BookOpen size={40} color="var(--muted)" style={{ margin: '0 auto 0.75rem' }} />
          <p style={{ color: 'var(--muted)', margin: 0, fontSize: '0.95rem' }}>
            Selecciona un curso y asignatura para ver el libro de notas.
          </p>
        </div>
      )}

      {/* ── Loading skeleton (notas) ── */}
      {!loadingInit && loadingNotas && <SkeletonTable />}

      {/* ── Notas table ── */}
      {!loadingInit && !loadingNotas && notasData && cursoId && asignaturaId && (
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

                {/* Evaluaciones */}
                {notasData.evaluaciones.map((ev) => (
                  <th key={ev.id} style={{
                    padding: '0.6rem 0.75rem', textAlign: 'center',
                    fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)',
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: 110,
                  }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.8rem', textTransform: 'none', letterSpacing: 0 }}>
                      {ev.nombre}
                    </div>
                    <div style={{ marginTop: 2 }}>
                      <span style={{
                        background: 'var(--nav-hover)', borderRadius: 4,
                        padding: '1px 6px', fontSize: '0.7rem',
                      }}>
                        {ev.tipo}
                      </span>
                      <span style={{ marginLeft: 4 }}>{ev.ponderacion}%</span>
                    </div>
                  </th>
                ))}

                {/* Promedio */}
                <th style={{
                  padding: '0.75rem 1rem', textAlign: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'var(--muted)',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap', minWidth: 90,
                }}>
                  Promedio
                </th>
              </tr>
            </thead>

            <tbody>
              {notasData.filas.length === 0 ? (
                <tr>
                  <td
                    colSpan={notasData.evaluaciones.length + 2}
                    style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}
                  >
                    No hay alumnos registrados para esta selección.
                  </td>
                </tr>
              ) : (
                notasData.filas.map((fila, idx) => (
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
                      {fila.alumno.apellidoPaterno} {fila.alumno.nombres}
                    </td>

                    {/* Notas por evaluación */}
                    {notasData.evaluaciones.map((ev) => {
                      const val = fila.notas[ev.id] ?? null;
                      return (
                        <td key={ev.id} style={{
                          padding: '0.65rem 0.75rem', textAlign: 'center',
                          borderRight: '1px solid var(--border)',
                          fontSize: '0.9rem', fontWeight: 500,
                          ...gradeColor(val),
                        }}>
                          {val !== null ? val.toFixed(1) : (
                            <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>–</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Promedio */}
                    <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block', padding: '3px 10px',
                        borderRadius: 6, fontSize: '0.9rem', fontWeight: 700,
                        ...promedioBg(fila.promedio),
                      }}>
                        {fila.promedio !== null ? fila.promedio.toFixed(1) : (
                          <span style={{ color: 'var(--muted)' }}>–</span>
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
      {notasData && (
        <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--muted)' }}>
          {notasData.filas.length} alumno{notasData.filas.length !== 1 ? 's' : ''} · {notasData.evaluaciones.length} evaluación{notasData.evaluaciones.length !== 1 ? 'es' : ''}
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
