import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Plus, Search, Filter, Bell, AlertTriangle, BookOpen, Users, Calendar } from 'lucide-react';
import api from '../../api/client';

interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string;
  prioridad: string;
  destinatarios: string;
  cursoId: string | null;
  enviadoPor: string;
  fechaEnvio: string;
  fechaExpiracion: string | null;
  estado: string;
  totalDestinatarios: number;
  curso?: { nombre: string; nivel: string } | null;
}

const TIPO_ICON: Record<string, React.ReactNode> = {
  CIRCULAR: <MessageSquare size={14} />,
  AVISO: <Bell size={14} />,
  REUNION: <Users size={14} />,
  EMERGENCIA: <AlertTriangle size={14} />,
  ACADEMICO: <BookOpen size={14} />,
};

const TIPO_COLOR: Record<string, string> = {
  CIRCULAR: '#3b82f6',
  AVISO: '#f59e0b',
  REUNION: '#8b5cf6',
  EMERGENCIA: '#ef4444',
  ACADEMICO: '#10b981',
};

const PRIORIDAD_COLOR: Record<string, string> = {
  NORMAL: '#6b7280',
  ALTA: '#f59e0b',
  URGENTE: '#ef4444',
};

export default function ListaComunicados() {
  const navigate = useNavigate();
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('');

  useEffect(() => {
    loadComunicados();
  }, [filterTipo]);

  async function loadComunicados() {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterTipo) params.tipo = filterTipo;
      const res = await api.get('/comunicaciones', { params });
      setComunicados(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = comunicados.filter((c) =>
    !search || c.titulo.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Comunicados
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {filtered.length} comunicado{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => navigate('/comunicaciones/nuevo')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ background: '#3b82f6' }}
        >
          <Plus size={16} />
          Nuevo comunicado
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg flex-1 min-w-48"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Search size={15} style={{ color: 'var(--muted)' }} />
          <input
            type="text"
            placeholder="Buscar comunicados..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm outline-none flex-1"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
          <Filter size={15} style={{ color: 'var(--muted)' }} />
          <select
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
            className="bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          >
            <option value="">Todos los tipos</option>
            <option value="CIRCULAR">Circular</option>
            <option value="AVISO">Aviso</option>
            <option value="REUNION">Reunión</option>
            <option value="EMERGENCIA">Emergencia</option>
            <option value="ACADEMICO">Académico</option>
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <MessageSquare size={40} className="mx-auto mb-3 opacity-30" />
          <p>No hay comunicados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/comunicaciones/${c.id}`)}
              className="p-4 rounded-xl cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                background: 'var(--card)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: `${TIPO_COLOR[c.tipo]}22`, color: TIPO_COLOR[c.tipo] }}
                  >
                    {TIPO_ICON[c.tipo] ?? <MessageSquare size={14} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {c.titulo}
                      </span>
                      {c.prioridad !== 'NORMAL' && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded uppercase"
                          style={{ background: `${PRIORIDAD_COLOR[c.prioridad]}22`, color: PRIORIDAD_COLOR[c.prioridad] }}
                        >
                          {c.prioridad}
                        </span>
                      )}
                    </div>
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--muted)' }}>
                      {c.contenido}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs flex-wrap" style={{ color: 'var(--muted)' }}>
                      <span
                        className="px-2 py-0.5 rounded-full"
                        style={{ background: `${TIPO_COLOR[c.tipo]}22`, color: TIPO_COLOR[c.tipo] }}
                      >
                        {c.tipo}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={11} />
                        {c.destinatarios === 'CURSO' && c.curso ? c.curso.nombre : c.destinatarios}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={11} />
                        {new Date(c.fechaEnvio).toLocaleDateString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {c.totalDestinatarios}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>destinatarios</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
