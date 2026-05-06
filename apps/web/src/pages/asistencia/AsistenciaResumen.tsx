import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Calendar, CheckCircle } from 'lucide-react';
import api from '../../api/client';

interface CursoRow {
  cursoId: string;
  cursoNombre: string;
  nivel: string;
  totalAlumnos: number;
  totalPresencias: number;
  totalAusencias: number;
  porcentaje: number;
  registrosDias: number;
}

interface Alerta {
  tipo: string;
  mensaje: string;
  cursoId?: string;
}

interface ResumenData {
  mes: number;
  anio: number;
  totalDias: number;
  porcentajeGeneral: number;
  porCurso: CursoRow[];
  alertas: Alerta[];
}

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function estadoBadge(porcentaje: number) {
  if (porcentaje >= 90) {
    return (
      <span style={{
        background: '#dcfce7', color: '#15803d',
        padding: '2px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700,
      }}>
        Óptimo
      </span>
    );
  }
  if (porcentaje >= 80) {
    return (
      <span style={{
        background: '#fef3c7', color: '#b45309',
        padding: '2px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700,
      }}>
        Regular
      </span>
    );
  }
  return (
    <span style={{
      background: '#fee2e2', color: '#b91c1c',
      padding: '2px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700,
    }}>
      Crítico
    </span>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
      padding: '1rem', minHeight: 90, animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

export default function AsistenciaResumen() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const r = await api.get('/asistencia/resumen/mensual', { params: { mes, anio } });
      setData(r.data.data);
    } catch {
      setError('No se pudo cargar el resumen de asistencia.');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const mejorCurso = data?.porCurso.reduce(
    (best, c) => (c.porcentaje > (best?.porcentaje ?? -1) ? c : best),
    null as CursoRow | null,
  );
  const peorCurso = data?.porCurso.reduce(
    (worst, c) => (c.porcentaje < (worst?.porcentaje ?? 101) ? c : worst),
    null as CursoRow | null,
  );
  const maxPorcentaje = data?.porCurso.length
    ? Math.max(...data.porCurso.map(c => c.porcentaje), 1)
    : 1;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Resumen de Asistencia
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: '0.875rem' }}>
            Estadísticas mensuales por curso
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.7rem', background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-body)', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            style={{
              padding: '0.4rem 0.7rem', background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 6, color: 'var(--text-body)', fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            {[2024, 2025, 2026].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={load}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '0.45rem 1rem', background: 'var(--accent,#6366f1)', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem',
            }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8,
          padding: '0.75rem 1rem', color: '#b91c1c', marginBottom: '1.5rem', fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[0, 1, 2, 3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : data ? (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem', marginBottom: '1.5rem',
        }}>
          {/* % General */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>% Asistencia General</div>
                <div style={{
                  fontSize: '1.8rem', fontWeight: 700,
                  color: data.porcentajeGeneral >= 90 ? '#16a34a' : data.porcentajeGeneral >= 80 ? '#b45309' : '#b91c1c',
                }}>
                  {data.porcentajeGeneral.toFixed(1)}%
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a',
              }}>
                <CheckCircle size={20} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
              {MESES[data.mes - 1]} {data.anio}
            </div>
          </div>

          {/* Mejor curso */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>Mejor Curso</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                  {mejorCurso ? mejorCurso.cursoNombre : '—'}
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#dcfce7',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a',
              }}>
                <TrendingUp size={20} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
              {mejorCurso ? `${mejorCurso.porcentaje}% asistencia` : 'Sin datos'}
            </div>
          </div>

          {/* Peor curso */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>Curso con Menor Asistencia</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b91c1c' }}>
                  {peorCurso ? peorCurso.cursoNombre : '—'}
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#fee2e2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b91c1c',
              }}>
                <TrendingDown size={20} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
              {peorCurso ? `${peorCurso.porcentaje}% asistencia` : 'Sin datos'}
            </div>
          </div>

          {/* Total días */}
          <div style={{
            background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>Días Registrados</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--accent,#6366f1)' }}>
                  {data.totalDias}
                </div>
              </div>
              <div style={{
                width: 36, height: 36, borderRadius: 8, background: '#ede9fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1',
              }}>
                <Calendar size={20} />
              </div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
              Días con registro de asistencia
            </div>
          </div>
        </div>
      ) : null}

      {/* Bar chart per course */}
      {loading ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '1.25rem', marginBottom: '1.5rem', minHeight: 180,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : data && data.porCurso.length > 0 ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '1.25rem', marginBottom: '1.5rem',
        }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            Asistencia por Curso (%)
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[...data.porCurso]
              .sort((a, b) => b.porcentaje - a.porcentaje)
              .map(c => (
                <div key={c.cursoId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 48, fontSize: '0.82rem', color: 'var(--text-body)',
                    flexShrink: 0, textAlign: 'right', fontWeight: 600,
                  }}>
                    {c.cursoNombre}
                  </div>
                  <div style={{
                    flex: 1, background: 'var(--border)', borderRadius: 4, height: 22, overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${(c.porcentaje / 100) * 100}%`,
                      background: c.porcentaje >= 90 ? '#16a34a' : c.porcentaje >= 80 ? '#b45309' : '#b91c1c',
                      height: '100%', borderRadius: 4,
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{
                    width: 44, fontSize: '0.82rem', fontWeight: 700,
                    color: c.porcentaje >= 90 ? '#16a34a' : c.porcentaje >= 80 ? '#b45309' : '#b91c1c',
                    textAlign: 'right',
                  }}>
                    {c.porcentaje}%
                  </div>
                </div>
              ))}
          </div>
          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: '0.78rem', color: 'var(--muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#16a34a', display: 'inline-block' }} />
              &ge;90% Óptimo
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#b45309', display: 'inline-block' }} />
              80-89% Regular
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: '#b91c1c', display: 'inline-block' }} />
              &lt;80% Crítico
            </span>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {loading ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          minHeight: 200, animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : data ? (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          overflow: 'hidden', marginBottom: '1.5rem',
        }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>
              Detalle por Curso — {MESES[data.mes - 1]} {data.anio}
            </h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-deep,var(--card))' }}>
                {['Curso', 'Nivel', 'Alumnos', '% Asistencia', 'Días Registrados', 'Estado'].map(h => (
                  <th key={h} style={{
                    padding: '0.6rem 0.75rem', textAlign: 'left',
                    fontWeight: 600, color: 'var(--muted)', fontSize: '0.78rem',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.porCurso.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--muted)' }}>
                    Sin registros de asistencia para este período.
                  </td>
                </tr>
              ) : data.porCurso.map(row => (
                <tr
                  key={row.cursoId}
                  style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {row.cursoNombre}
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.nivel}</td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.totalAlumnos}</td>
                  <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700,
                    color: row.porcentaje >= 90 ? '#16a34a' : row.porcentaje >= 80 ? '#b45309' : '#b91c1c',
                  }}>
                    {row.porcentaje}%
                  </td>
                  <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.registrosDias}</td>
                  <td style={{ padding: '0.6rem 0.75rem' }}>{estadoBadge(row.porcentaje)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '3rem', textAlign: 'center', color: 'var(--muted)', marginBottom: '1.5rem',
        }}>
          <Calendar size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>Sin datos para este período</p>
          <p style={{ margin: '6px 0 0', fontSize: '0.875rem' }}>
            Selecciona un mes y año con registros de asistencia.
          </p>
        </div>
      )}

      {/* Alertas */}
      {!loading && data && data.alertas && data.alertas.length > 0 && (
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem',
        }}>
          <h3 style={{ margin: '0 0 0.75rem', color: 'var(--text-primary)', fontSize: '1rem' }}>
            Alertas
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.alertas.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                background: '#fefce8', border: '1px solid #fde68a', borderRadius: 6,
                padding: '0.65rem 0.9rem',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠</span>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#92400e', marginBottom: 2 }}>
                    {a.tipo.replace(/_/g, ' ')}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#78350f' }}>{a.mensaje}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
