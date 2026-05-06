import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, RefreshCw, User } from 'lucide-react';
import api from '../../api/client';

interface Alumno {
  id: string;
  run: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  estadoMatricula: string;
  esPIE: boolean;
  esPrioritario: boolean;
  esPreferente: boolean;
  foto?: string | null;
  curso?: { nombre: string; nivel: string } | null;
}

interface Meta {
  total: number;
  totalPages: number;
  page: number;
}

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

const ESTADOS = [
  { value: '', label: 'Todos los estados' },
  { value: 'ACTIVA', label: 'Vigente' },
  { value: 'RETIRADO', label: 'Retirado' },
  { value: 'TRASLADADO', label: 'Trasladado' },
];

const badgeColor = (label: string) => {
  switch (label) {
    case 'PIE': return { bg: '#ede9fe', color: '#7c3aed' };
    case 'SEP': return { bg: '#dbeafe', color: '#1d4ed8' };
    case 'PREF': return { bg: '#fef3c7', color: '#b45309' };
    default: return { bg: '#f1f5f9', color: '#475569' };
  }
};

const estadoColor = (estado: string) => {
  switch (estado) {
    case 'ACTIVA': return { bg: '#dcfce7', color: '#15803d' };
    case 'RETIRADO': return { bg: '#fee2e2', color: '#b91c1c' };
    case 'TRASLADADO': return { bg: '#fef3c7', color: '#b45309' };
    default: return { bg: '#f1f5f9', color: '#475569' };
  }
};

export default function ListaAlumnos() {
  const navigate = useNavigate();
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [meta, setMeta] = useState<Meta>({ total: 0, totalPages: 1, page: 1 });
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [cursoId, setCursoId] = useState('');
  const [estado, setEstado] = useState('ACTIVA');
  const [page, setPage] = useState(1);

  const fetchCursos = async () => {
    try {
      const r = await api.get('/sistema/cursos', { params: { anio: 2026 } });
      setCursos(r.data.data ?? []);
    } catch {}
  };

  const fetchAlumnos = async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 25 };
      if (q) params.q = q;
      if (cursoId) params.cursoId = cursoId;
      if (estado) params.estado = estado;
      const r = await api.get('/alumnos', { params });
      setAlumnos(r.data.data ?? []);
      setMeta(r.data.meta ?? { total: 0, totalPages: 1, page: 1 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCursos(); }, []);
  useEffect(() => { fetchAlumnos(); }, [page, cursoId, estado]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); fetchAlumnos(); };

  const totalVigentes = alumnos.filter(a => a.estadoMatricula === 'ACTIVA').length;
  const totalPIE = alumnos.filter(a => a.esPIE).length;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Alumnos
          </h1>
          <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: '0.9rem' }}>
            {meta.total} registros encontrados
          </p>
        </div>
        <button
          onClick={() => navigate('/matricula/nuevo')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0.5rem 1rem',
            background: 'var(--accent, #6366f1)', color: '#fff', border: 'none', borderRadius: 6,
            cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
        >
          <UserPlus size={16} /> Nueva Matrícula
        </button>
      </div>

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: meta.total, color: '#6366f1' },
          { label: 'Vigentes', value: totalVigentes + (estado === 'ACTIVA' ? meta.total - totalVigentes : 0), color: '#16a34a' },
          { label: 'PIE (página)', value: totalPIE, color: '#7c3aed' },
          { label: 'Página', value: `${page} / ${meta.totalPages}`, color: '#0284c7' },
        ].map(kpi => (
          <div key={kpi.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>{kpi.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', marginBottom: '1rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1 1 220px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Buscar</label>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="RUN, nombre o apellido..."
                style={{ width: '100%', paddingLeft: 28, padding: '0.45rem 0.6rem 0.45rem 28px',
                  border: '1px solid var(--border)', borderRadius: 6, background: 'var(--bg)',
                  color: 'var(--text-body)', fontSize: '0.9rem', boxSizing: 'border-box' }}
              />
            </div>
          </div>
          <div style={{ flex: '1 1 180px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Curso</label>
            <select
              value={cursoId}
              onChange={e => { setCursoId(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)',
                borderRadius: 6, background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.9rem' }}
            >
              <option value="">Todos los cursos</option>
              {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Estado</label>
            <select
              value={estado}
              onChange={e => { setEstado(e.target.value); setPage(1); }}
              style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)',
                borderRadius: 6, background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.9rem' }}
            >
              {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit"
              style={{ padding: '0.45rem 1rem', background: 'var(--accent,#6366f1)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
              Buscar
            </button>
            <button type="button" onClick={() => { setQ(''); setCursoId(''); setEstado('ACTIVA'); setPage(1); }}
              style={{ padding: '0.45rem 0.75rem', background: 'transparent', border: '1px solid var(--border)',
                borderRadius: 6, cursor: 'pointer', color: 'var(--muted)' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--card-deep,var(--card))' }}>
              {['Alumno', 'RUN', 'Curso', 'Subvención / Necesidades', 'Estado', 'Acción'].map(h => (
                <th key={h} style={{ padding: '0.65rem 0.75rem', textAlign: 'left', fontWeight: 600,
                  color: 'var(--muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>Cargando...</td></tr>
            ) : alumnos.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'var(--muted)' }}>
                No hay alumnos con estos filtros.
                <div style={{ marginTop: 12 }}>
                  <button onClick={() => navigate('/matricula/nuevo')}
                    style={{ padding: '0.4rem 0.9rem', background: 'var(--accent,#6366f1)', color: '#fff',
                      border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                    + Nueva Matrícula
                  </button>
                </div>
              </td></tr>
            ) : alumnos.map(a => {
              const estadoStyle = estadoColor(a.estadoMatricula);
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#e0e7ff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {a.foto
                          ? <img src={a.foto} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                          : <User size={16} color="#6366f1" />}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {a.apellidoPaterno} {a.apellidoMaterno}, {a.nombres}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
                          {a.genero === 'MASCULINO' ? 'Hombre' : a.genero === 'FEMENINO' ? 'Mujer' : 'Otro'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-body)', fontFamily: 'monospace' }}>
                    {a.run}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-body)' }}>
                    {a.curso?.nombre ?? <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Sin asignar</span>}
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {a.esPIE && (
                        <span style={{ ...badgeColor('PIE'), padding: '2px 7px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                          PIE
                        </span>
                      )}
                      {a.esPrioritario && (
                        <span style={{ ...badgeColor('SEP'), padding: '2px 7px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                          Prioritario
                        </span>
                      )}
                      {a.esPreferente && (
                        <span style={{ ...badgeColor('PREF'), padding: '2px 7px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                          Preferente
                        </span>
                      )}
                      {!a.esPIE && !a.esPrioritario && !a.esPreferente && (
                        <span style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>—</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <span style={{ ...estadoStyle, padding: '3px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>
                      {a.estadoMatricula === 'ACTIVA' ? 'Vigente' : a.estadoMatricula}
                    </span>
                  </td>
                  <td style={{ padding: '0.65rem 0.75rem' }}>
                    <button onClick={() => navigate(`/matricula/alumnos/${a.id}`)}
                      style={{ padding: '0.35rem 0.8rem', background: 'transparent', border: '1px solid var(--accent,#6366f1)',
                        color: 'var(--accent,#6366f1)', borderRadius: 6, cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      Ver ficha
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: '1rem' }}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: '0.35rem 0.9rem', border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--card)', cursor: page === 1 ? 'not-allowed' : 'pointer', color: 'var(--text-body)',
              opacity: page === 1 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <span style={{ padding: '0.35rem 0.9rem', color: 'var(--muted)' }}>
            {page} / {meta.totalPages}
          </span>
          <button disabled={page === meta.totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: '0.35rem 0.9rem', border: '1px solid var(--border)', borderRadius: 6,
              background: 'var(--card)', cursor: page === meta.totalPages ? 'not-allowed' : 'pointer',
              color: 'var(--text-body)', opacity: page === meta.totalPages ? 0.4 : 1 }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
