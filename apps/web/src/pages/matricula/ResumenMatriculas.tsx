import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RefreshCw, Users, UserCheck, UserMinus, GraduationCap } from 'lucide-react';
import api from '../../api/client';

interface Totales {
  total: number; vigentes: number; retirados: number;
  trasladados: number; egresados: number; pie: number;
  prioritarios: number; preferentes: number;
}

interface CursoRow {
  curso: string; nivel: string; total: number;
  hombres: number; mujeres: number;
  prioritarios: number; preferentes: number; pie: number; retirados: number;
}

export default function ResumenMatriculas() {
  const navigate = useNavigate();
  const [totales, setTotales] = useState<Totales | null>(null);
  const [porCurso, setPorCurso] = useState<CursoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportando, setExportando] = useState(false);
  const [anio] = useState(2026);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get('/matriculas/resumen', { params: { anio } });
      const d = r.data.data;
      setTotales(d.totales);
      setPorCurso(d.porCurso ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exportarSige = async () => {
    setExportando(true);
    try {
      const r = await api.get('/matriculas/reporte-sige', { params: { anio } });
      const { filas } = r.data.data;
      if (!filas?.length) { alert('Sin datos para exportar'); return; }
      const headers = Object.keys(filas[0]);
      const csv = [
        headers.join(';'),
        ...filas.map((row: Record<string, unknown>) => headers.map(h => `"${String(row[h] ?? '').replace(/"/g,'""')}"`).join(';')),
      ].join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `matriculas-sige-${anio}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Error al exportar');
    } finally {
      setExportando(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Cargando resumen...</div>;

  // Group by nivel for bar chart
  const nivelMap = new Map<string, number>();
  for (const row of porCurso) {
    nivelMap.set(row.nivel, (nivelMap.get(row.nivel) ?? 0) + row.total);
  }
  const maxNivel = Math.max(...Array.from(nivelMap.values()), 1);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
            Resumen de Matrículas {anio}
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: '0.875rem' }}>
            Estado actual del proceso de matrícula
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={load}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 0.9rem',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              cursor: 'pointer', color: 'var(--muted)' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          <button onClick={exportarSige} disabled={exportando}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.45rem 1rem',
              background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
              cursor: exportando ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
            <Download size={14} /> {exportando ? 'Exportando...' : 'Exportar SIGE'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {totales && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'Total Matriculados', value: totales.total, icon: <Users size={20} />, color: '#6366f1', bg: '#ede9fe' },
            { label: 'Vigentes', value: totales.vigentes, icon: <UserCheck size={20} />, color: '#16a34a', bg: '#dcfce7' },
            { label: 'Retirados', value: totales.retirados, icon: <UserMinus size={20} />, color: '#b91c1c', bg: '#fee2e2' },
            { label: 'PIE', value: totales.pie, icon: <GraduationCap size={20} />, color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Prioritarios SEP', value: totales.prioritarios, icon: <GraduationCap size={20} />, color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Preferentes SEP', value: totales.preferentes, icon: <GraduationCap size={20} />, color: '#b45309', bg: '#fef3c7' },
          ].map(k => (
            <div key={k.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: k.color }}>{k.value}</div>
                </div>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: k.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: k.color }}>
                  {k.icon}
                </div>
              </div>
              {totales.vigentes > 0 && (
                <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--muted)' }}>
                  {Math.round((k.value / totales.vigentes) * 100)}% del total vigente
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Gráfico de barras por nivel */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Distribución por Nivel</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {Array.from(nivelMap.entries()).sort(([a],[b]) => a.localeCompare(b)).map(([nivel, count]) => (
            <div key={nivel} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 130, fontSize: '0.82rem', color: 'var(--text-body)', flexShrink: 0, textAlign: 'right' }}>
                {nivel}
              </div>
              <div style={{ flex: 1, background: 'var(--border)', borderRadius: 4, height: 20, overflow: 'hidden' }}>
                <div style={{
                  width: `${(count / maxNivel) * 100}%`,
                  background: 'var(--accent,#6366f1)',
                  height: '100%', borderRadius: 4,
                  transition: 'width 0.6s ease',
                }} />
              </div>
              <div style={{ width: 30, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla por curso */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Desglose por Curso</h3>
          <button onClick={() => navigate('/matricula/nuevo')}
            style={{ padding: '0.35rem 0.9rem', background: 'var(--accent,#6366f1)', color: '#fff',
              border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
            + Nueva Matrícula
          </button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-deep,var(--card))' }}>
              {['Curso', 'Nivel', 'Total', 'Hombres', 'Mujeres', 'Prioritarios', 'Preferentes', 'PIE', 'Retirados'].map(h => (
                <th key={h} style={{ padding: '0.6rem 0.75rem', textAlign: 'left', fontWeight: 600,
                  color: 'var(--muted)', fontSize: '0.78rem' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {porCurso.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                Sin datos de matrícula para {anio}
              </td></tr>
            ) : porCurso.map(row => (
              <tr key={row.curso} style={{ borderBottom: '1px solid var(--border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>{row.curso}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.nivel}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--accent,#6366f1)' }}>{row.total}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.hombres}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: 'var(--text-body)' }}>{row.mujeres}</td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {row.prioritarios > 0 ? <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 7px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{row.prioritarios}</span> : '—'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {row.preferentes > 0 ? <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 7px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{row.preferentes}</span> : '—'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {row.pie > 0 ? <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 7px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{row.pie}</span> : '—'}
                </td>
                <td style={{ padding: '0.6rem 0.75rem' }}>
                  {row.retirados > 0 ? <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 7px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{row.retirados}</span> : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {porCurso.length > 0 && (
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--card-deep,var(--card))' }}>
                <td colSpan={2} style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>Total</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700, color: 'var(--accent,#6366f1)' }}>
                  {porCurso.reduce((s, r) => s + r.total, 0)}
                </td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.hombres, 0)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.mujeres, 0)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.prioritarios, 0)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.preferentes, 0)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.pie, 0)}</td>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600 }}>{porCurso.reduce((s, r) => s + r.retirados, 0)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
