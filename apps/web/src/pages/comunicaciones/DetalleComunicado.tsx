import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle, Clock, Eye, Calendar } from 'lucide-react';
import api from '../../api/client';

interface Lectura {
  id: string;
  leido: boolean;
  fechaLectura: string | null;
  confirmado: boolean;
  apoderado: {
    id: string;
    nombre: string;
    apellidos: string;
    email: string;
  };
}

interface Comunicado {
  id: string;
  titulo: string;
  contenido: string;
  tipo: string;
  prioridad: string;
  destinatarios: string;
  enviadoPor: string;
  fechaEnvio: string;
  estado: string;
  curso?: { nombre: string; nivel: string } | null;
  lecturas: Lectura[];
}

interface Estadisticas {
  total: number;
  leidos: number;
  noLeidos: number;
  confirmados: number;
  porcentajeLeido: number;
  porcentajeConfirmado: number;
}

export default function DetalleComunicado() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [comunicado, setComunicado] = useState<Comunicado | null>(null);
  const [stats, setStats] = useState<Estadisticas | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'detalle' | 'lecturas'>('detalle');

  useEffect(() => {
    if (!id) return;
    Promise.all([
      api.get(`/comunicaciones/${id}`),
      api.get(`/comunicaciones/${id}/estadisticas`),
    ])
      .then(([c, s]) => {
        setComunicado(c.data);
        setStats(s.data);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
        ))}
      </div>
    );
  }

  if (!comunicado) {
    return (
      <div className="p-6 text-center" style={{ color: 'var(--muted)' }}>
        Comunicado no encontrado
      </div>
    );
  }

  const TIPO_COLOR: Record<string, string> = {
    CIRCULAR: '#3b82f6',
    AVISO: '#f59e0b',
    REUNION: '#8b5cf6',
    EMERGENCIA: '#ef4444',
    ACADEMICO: '#10b981',
  };
  const color = TIPO_COLOR[comunicado.tipo] ?? '#6b7280';

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Back */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/comunicaciones')}
          className="p-2 rounded-lg"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {comunicado.titulo}
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: `${color}22`, color }}
            >
              {comunicado.tipo}
            </span>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {new Date(comunicado.fechaEnvio).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: stats.total, icon: <Users size={16} />, color: '#3b82f6' },
            { label: 'Leídos', value: stats.leidos, icon: <Eye size={16} />, color: '#10b981' },
            { label: 'No leídos', value: stats.noLeidos, icon: <Clock size={16} />, color: '#f59e0b' },
            { label: 'Confirmados', value: stats.confirmados, icon: <CheckCircle size={16} />, color: '#8b5cf6' },
          ].map((s) => (
            <div
              key={s.label}
              className="p-4 rounded-xl text-center"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div className="flex justify-center mb-1" style={{ color: s.color }}>{s.icon}</div>
              <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{s.value}</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Progress bar */}
      {stats && (
        <div
          className="p-4 rounded-xl space-y-2"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span>Tasa de lectura</span>
            <span className="font-medium" style={{ color: '#10b981' }}>{stats.porcentajeLeido}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: 'var(--border)' }}>
            <div
              className="h-2 rounded-full transition-all"
              style={{ width: `${stats.porcentajeLeido}%`, background: '#10b981' }}
            />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {(['detalle', 'lecturas'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-2 text-sm rounded-md transition-colors font-medium capitalize"
            style={
              tab === t
                ? { background: '#3b82f6', color: '#fff' }
                : { color: 'var(--muted)' }
            }
          >
            {t === 'detalle' ? 'Contenido' : 'Lecturas'}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'detalle' && (
        <div
          className="p-6 rounded-xl"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <Users size={14} />
              <span>
                Para: {comunicado.destinatarios === 'CURSO' && comunicado.curso
                  ? comunicado.curso.nombre
                  : comunicado.destinatarios}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted)' }}>
              <Calendar size={14} />
              <span>Enviado: {new Date(comunicado.fechaEnvio).toLocaleDateString('es-CL')}</span>
            </div>
          </div>
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
              {comunicado.contenido}
            </p>
          </div>
        </div>
      )}

      {tab === 'lecturas' && (
        <div className="space-y-2">
          {comunicado.lecturas.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {l.apoderado.nombre} {l.apoderado.apellidos}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>{l.apoderado.email}</p>
              </div>
              <div className="flex items-center gap-2">
                {l.confirmado && (
                  <CheckCircle size={14} style={{ color: '#8b5cf6' }} />
                )}
                {l.leido ? (
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                    style={{ background: '#dcfce7', color: '#15803d' }}>
                    <Eye size={10} />
                    {l.fechaLectura ? new Date(l.fechaLectura).toLocaleDateString('es-CL') : 'Leído'}
                  </span>
                ) : (
                  <span className="text-xs px-2 py-1 rounded-full"
                    style={{ background: '#fef3c7', color: '#b45309' }}>
                    No leído
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
