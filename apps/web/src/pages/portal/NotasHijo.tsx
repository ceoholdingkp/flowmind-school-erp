import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, RefreshCw } from 'lucide-react';
import portalApi from '../../api/portalClient';

interface NotaItem {
  id: string;
  nombreEvaluacion: string;
  tipo: string;
  valor: number;
  ponderacion: number;
  fecha: string;
  semestre: number;
}

interface Asignatura {
  asignatura: string;
  promedio: number;
  notas: NotaItem[];
}

interface Data {
  asignaturas: Asignatura[];
  promedioGeneral: number;
}

const gradeColor = (v: number) =>
  v >= 5 ? '#10b981' : v >= 4 ? '#f59e0b' : '#ef4444';

const gradeBg = (v: number) =>
  v >= 5 ? '#10b98122' : v >= 4 ? '#f59e0b22' : '#ef444422';

export default function NotasHijo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<Data | null>(null);
  const [semestre, setSemestre] = useState('');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchNotas = (sem: string) => {
    setLoading(true);
    portalApi.get(`/portal/hijos/${id}/notas`, { params: sem ? { semestre: sem } : {} })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotas(semestre); }, [id, semestre]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/portal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, flex: 1 }}>Notas</h1>
        <select value={semestre} onChange={(e) => setSemestre(e.target.value)}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)', color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer' }}>
          <option value="">Todos los semestres</option>
          <option value="1">1er Semestre</option>
          <option value="2">2do Semestre</option>
        </select>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <RefreshCw size={28} color="#8b5cf6" className="animate-spin" />
          </div>
        ) : !data || data.asignaturas.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            No hay notas registradas aún.
          </div>
        ) : (
          <>
            {/* Promedio general destacado */}
            <div style={{ background: `linear-gradient(135deg, var(--card) 0%, ${gradeColor(data.promedioGeneral)}11 100%)`, border: `1px solid ${gradeColor(data.promedioGeneral)}44`, borderRadius: 14, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: gradeBg(data.promedioGeneral), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <TrendingUp size={28} color={gradeColor(data.promedioGeneral)} />
              </div>
              <div>
                <p style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 2 }}>Promedio General</p>
                <p style={{ color: gradeColor(data.promedioGeneral), fontSize: 36, fontWeight: 800, lineHeight: 1 }}>
                  {data.promedioGeneral.toFixed(1)}
                </p>
              </div>
            </div>

            {/* Por asignatura */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.asignaturas.map((asig) => (
                <div key={asig.asignatura} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Asignatura header */}
                  <button
                    onClick={() => setExpanded(expanded === asig.asignatura ? null : asig.asignatura)}
                    style={{ width: '100%', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>{asig.asignatura}</span>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>{asig.notas.length} evaluaciones</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Progress bar */}
                      <div style={{ width: 80, height: 6, background: 'var(--bg)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (asig.promedio / 7) * 100)}%`, background: gradeColor(asig.promedio), borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                      <span style={{ color: gradeColor(asig.promedio), fontWeight: 800, fontSize: 22, minWidth: 36, textAlign: 'right' }}>
                        {asig.promedio.toFixed(1)}
                      </span>
                    </div>
                  </button>

                  {/* Notas detalle (expandible) */}
                  {expanded === asig.asignatura && asig.notas.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ background: 'var(--bg)' }}>
                            {['Evaluación', 'Tipo', 'Fecha', 'Nota'].map((h) => (
                              <th key={h} style={{ padding: '8px 16px', textAlign: 'left', color: 'var(--muted)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {asig.notas.map((n, i) => (
                            <tr key={n.id} style={{ borderTop: i > 0 ? '1px solid var(--border)20' : 'none' }}>
                              <td style={{ padding: '10px 16px', color: 'var(--text-primary)' }}>{n.nombreEvaluacion}</td>
                              <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>{n.tipo}</td>
                              <td style={{ padding: '10px 16px', color: 'var(--muted)' }}>
                                {new Date(n.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })}
                              </td>
                              <td style={{ padding: '10px 16px' }}>
                                <span style={{ color: gradeColor(n.valor), fontWeight: 700, fontSize: 16 }}>
                                  {Number(n.valor).toFixed(1)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
