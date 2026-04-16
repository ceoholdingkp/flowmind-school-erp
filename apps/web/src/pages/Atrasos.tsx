import React, { useEffect, useState, useCallback } from 'react';
import { Clock, AlertTriangle, Search, RefreshCw, ChevronDown, Users } from 'lucide-react';
import api from '../api/client';

const C = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
};

interface AlunoInfo {
  id: string;
  run: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  curso?: { nombre: string };
}

interface Atraso {
  id: string;
  fecha: string;
  horaLlegada: string;
  minutosAtraso: number;
  bloqueHorario: number;
  tipo: string;
  justificado: boolean;
  justificacion?: string;
  alumno: AlunoInfo;
}

interface RankingItem {
  alumno: AlunoInfo;
  atrasosMes: number;
  atrasosAnio: number;
  reiterado: boolean;
}

interface ReporteData {
  periodo: { mes: number; anio: number };
  umbraleReiterado: number;
  ranking: RankingItem[];
  totalConAtrasosMes: number;
  totalReiterados: number;
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function formatTime(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function KpiCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 160 }}>
      <div style={{ background: `${color}22`, borderRadius: 10, padding: 10, color }}>{icon}</div>
      <div>
        <div style={{ color: C.muted, fontSize: 13 }}>{label}</div>
        <div style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

export default function Atrasos() {
  const now = new Date();
  const [tab, setTab] = useState<'listado' | 'reporte'>('listado');

  // Listado state
  const [atrasos, setAtrasos] = useState<Atraso[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [totalList, setTotalList] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const LIMIT = 20;

  // Reporte state
  const [reporte, setReporte] = useState<ReporteData | null>(null);
  const [loadingReporte, setLoadingReporte] = useState(false);
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());

  const fetchListado = useCallback(async () => {
    setLoadingList(true);
    try {
      const params: Record<string, string | number> = { page, limit: LIMIT };
      const res = await api.get('/atrasos', { params });
      setAtrasos(res.data.data ?? []);
      setTotalList(res.data.meta?.total ?? 0);
    } catch {
      setAtrasos([]);
    } finally {
      setLoadingList(false);
    }
  }, [page]);

  const fetchReporte = useCallback(async () => {
    setLoadingReporte(true);
    try {
      const res = await api.get('/atrasos/reporte', { params: { mes, anio } });
      setReporte(res.data.data ?? null);
    } catch {
      setReporte(null);
    } finally {
      setLoadingReporte(false);
    }
  }, [mes, anio]);

  useEffect(() => { if (tab === 'listado') fetchListado(); }, [fetchListado, tab]);
  useEffect(() => { if (tab === 'reporte') fetchReporte(); }, [fetchReporte, tab]);

  const pages = Math.ceil(totalList / LIMIT) || 1;

  const filteredAtrasos = search
    ? atrasos.filter(a =>
        `${a.alumno.nombres} ${a.alumno.apellidoPaterno}`.toLowerCase().includes(search.toLowerCase()) ||
        a.alumno.run.includes(search)
      )
    : atrasos;

  const thStyle: React.CSSProperties = { padding: '10px 14px', color: C.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: `1px solid ${C.border}` };
  const tdStyle: React.CSSProperties = { padding: '12px 14px', color: 'var(--text-body)', fontSize: 13, borderBottom: `1px solid ${C.border}20`, verticalAlign: 'middle' };

  return (
    <div style={{ background: C.bg, minHeight: '100vh', padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ background: `${C.amber}22`, borderRadius: 10, padding: 10 }}>
          <Clock size={22} color={C.amber} />
        </div>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, margin: 0 }}>Control de Atrasos</h1>
          <p style={{ color: C.muted, fontSize: 13, margin: '3px 0 0' }}>Registro y seguimiento de atrasos de alumnos</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: C.card, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${C.border}` }}>
        {(['listado', 'reporte'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 20px', borderRadius: 7, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
            background: tab === t ? C.blue : 'transparent',
            color: tab === t ? '#fff' : C.muted,
            transition: 'all 0.15s',
          }}>
            {t === 'listado' ? 'Listado' : 'Reporte Mensual'}
          </button>
        ))}
      </div>

      {/* ── TAB: LISTADO ── */}
      {tab === 'listado' && (
        <>
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiCard label="Total registros" value={totalList} color={C.blue} icon={<Clock size={20} />} />
            <KpiCard label="Página actual" value={filteredAtrasos.length} color={C.amber} icon={<Users size={20} />} />
          </div>

          {/* Search + Refresh */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: C.muted }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nombre o RUN..."
                style={{ width: '100%', padding: '9px 12px 9px 30px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            <button onClick={fetchListado} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, cursor: 'pointer', fontSize: 13 }}>
              <RefreshCw size={14} style={{ animation: loadingList ? 'spin 1s linear infinite' : 'none' }} />
              Actualizar
            </button>
          </div>

          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--card-deep)' }}>
                    {['Alumno', 'RUN', 'Curso', 'Fecha', 'Hora Llegada', 'Minutos', 'Bloque', 'Tipo', 'Estado'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingList ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '40px 0', color: C.muted }}>
                      <RefreshCw size={16} style={{ display: 'inline', marginRight: 8, animation: 'spin 1s linear infinite' }} /> Cargando...
                    </td></tr>
                  ) : filteredAtrasos.length === 0 ? (
                    <tr><td colSpan={9} style={{ ...tdStyle, textAlign: 'center', padding: '48px 0', color: C.muted }}>
                      Sin atrasos registrados
                    </td></tr>
                  ) : filteredAtrasos.map(a => (
                    <tr key={a.id} style={{ transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a2332aa')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>
                        {a.alumno.apellidoPaterno} {a.alumno.apellidoMaterno}, {a.alumno.nombres}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: C.muted }}>{a.alumno.run}</td>
                      <td style={{ ...tdStyle, color: C.muted }}>{a.alumno.curso?.nombre ?? '—'}</td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>
                        {new Date(a.fecha).toLocaleDateString('es-CL')}
                      </td>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12 }}>{formatTime(a.horaLlegada)}</td>
                      <td style={tdStyle}>
                        <span style={{ color: a.minutosAtraso > 15 ? C.red : a.minutosAtraso > 5 ? C.amber : 'var(--text-body)', fontWeight: 600 }}>
                          {a.minutosAtraso} min
                        </span>
                      </td>
                      <td style={{ ...tdStyle, color: C.muted, textAlign: 'center' }}>{a.bloqueHorario}</td>
                      <td style={tdStyle}>
                        <span style={{ background: `${C.blue}22`, color: C.blue, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                          {a.tipo}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: a.justificado ? `${C.green}22` : `${C.red}22`,
                          color: a.justificado ? C.green : C.red,
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                        }}>
                          {a.justificado ? 'Justificado' : 'Sin justificar'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
              <span style={{ color: C.muted, fontSize: 12 }}>Página {page} de {pages} · {totalList} registros</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  style={{ padding: '6px 14px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.4 : 1 }}>
                  ← Anterior
                </button>
                <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
                  style={{ padding: '6px 14px', fontSize: 12, background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 7, color: C.muted, cursor: page < pages ? 'pointer' : 'not-allowed', opacity: page >= pages ? 0.4 : 1 }}>
                  Siguiente →
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: REPORTE MENSUAL ── */}
      {tab === 'reporte' && (
        <>
          {/* Period selector */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <select value={mes} onChange={e => setMes(Number(e.target.value))}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 28px 8px 12px', color: 'var(--text-primary)', fontSize: 13, appearance: 'none', outline: 'none', cursor: 'pointer' }}>
                {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
            </div>
            <div style={{ position: 'relative' }}>
              <select value={anio} onChange={e => setAnio(Number(e.target.value))}
                style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 28px 8px 12px', color: 'var(--text-primary)', fontSize: 13, appearance: 'none', outline: 'none', cursor: 'pointer' }}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <ChevronDown size={13} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: C.muted, pointerEvents: 'none' }} />
            </div>
            <button onClick={fetchReporte} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 14px', background: C.blue, border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
              Actualizar
            </button>
          </div>

          {loadingReporte ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0' }}>Cargando reporte...</div>
          ) : !reporte ? (
            <div style={{ textAlign: 'center', color: C.muted, padding: '60px 0' }}>Sin datos disponibles</div>
          ) : (
            <>
              {/* KPIs */}
              <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                <KpiCard label="Alumnos con atrasos" value={reporte.totalConAtrasosMes} color={C.amber} icon={<Clock size={20} />} />
                <KpiCard label="Atrasos reiterados" value={reporte.totalReiterados} color={C.red} icon={<AlertTriangle size={20} />} />
              </div>

              {/* Alert for reiterados */}
              {reporte.totalReiterados > 0 && (
                <div style={{ background: '#2d1b1b', border: `1px solid ${C.red}55`, borderRadius: 10, padding: '12px 18px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
                  <AlertTriangle size={18} color={C.red} />
                  <span style={{ color: 'var(--text-body)', fontSize: 13 }}>
                    <strong style={{ color: C.red }}>{reporte.totalReiterados} alumno{reporte.totalReiterados > 1 ? 's' : ''}</strong> {reporte.totalReiterados > 1 ? 'tienen' : 'tiene'} atrasos reiterados (≥{reporte.umbraleReiterado} este mes). Se notificó al apoderado.
                  </span>
                </div>
              )}

              {/* Ranking table */}
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Ranking de Atrasos — {MESES[reporte.periodo.mes - 1]} {reporte.periodo.anio}</span>
                </div>
                {reporte.ranking.length === 0 ? (
                  <div style={{ textAlign: 'center', color: C.muted, padding: '48px 0', fontSize: 14 }}>Sin atrasos en este período</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: 'var(--card-deep)' }}>
                          {['#', 'Alumno', 'RUN', 'Curso', 'Atrasos (mes)', 'Atrasos (año)', 'Estado'].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {reporte.ranking.map((r, i) => (
                          <tr key={r.alumno.id} style={{ background: r.reiterado ? `${C.red}0a` : 'transparent' }}>
                            <td style={{ ...tdStyle, color: C.muted, width: 40 }}>{i + 1}</td>
                            <td style={{ ...tdStyle, fontWeight: 500 }}>
                              {r.alumno.apellidoPaterno} {r.alumno.apellidoMaterno}, {r.alumno.nombres}
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: C.muted }}>{r.alumno.run}</td>
                            <td style={{ ...tdStyle, color: C.muted }}>{r.alumno.curso?.nombre ?? '—'}</td>
                            <td style={{ ...tdStyle, textAlign: 'center' }}>
                              <span style={{ color: r.atrasosMes >= reporte.umbraleReiterado ? C.red : r.atrasosMes >= 3 ? C.amber : 'var(--text-body)', fontWeight: 700, fontSize: 15 }}>
                                {r.atrasosMes}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, textAlign: 'center', color: C.muted }}>{r.atrasosAnio}</td>
                            <td style={tdStyle}>
                              {r.reiterado ? (
                                <span style={{ background: `${C.red}22`, color: C.red, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                                  <AlertTriangle size={11} /> Reiterado
                                </span>
                              ) : (
                                <span style={{ background: `${C.blue}22`, color: C.blue, padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600 }}>
                                  Normal
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
