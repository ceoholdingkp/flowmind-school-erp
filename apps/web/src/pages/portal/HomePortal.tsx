import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, User, BookOpen, CalendarCheck, MessageSquare, LogOut, Bell, TrendingUp, ChevronRight, RefreshCw } from 'lucide-react';
import portalApi from '../../api/portalClient';
import { usePortalAuthStore } from '../../store/portalAuth.store';

interface Hijo {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  run: string;
  estadoMatricula: string;
  foto?: string;
  curso?: { id: string; nombre: string; nivel: string };
  parentesco: string;
}

interface Comunicado {
  id: string;
  comunicado: { titulo: string; cuerpo: string; createdAt: string };
  leido: boolean;
}

const C = { purple: '#8b5cf6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6' };

export default function HomePortal() {
  const navigate = useNavigate();
  const { user, logout } = usePortalAuthStore();

  const [hijos, setHijos] = useState<Hijo[]>([]);
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      portalApi.get('/portal/hijos'),
      portalApi.get('/portal/v2/comunicados'),
    ]).then(([hijosRes, comRes]) => {
      if (hijosRes.status === 'fulfilled') setHijos(hijosRes.value.data ?? []);
      if (comRes.status === 'fulfilled') setComunicados(comRes.value.data?.lecturas ?? []);
      setLoading(false);
    });
  }, []);

  const noLeidos = comunicados.filter((c) => !c.leido).length;

  const handleLogout = () => {
    logout();
    navigate('/portal/login');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <RefreshCw size={28} color={C.purple} className="animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Nav */}
      <header style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GraduationCap size={22} color={C.purple} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16 }}>Portal Apoderado</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Comunicados badge */}
          <button onClick={() => navigate('/portal/comunicados')} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
            <Bell size={20} />
            {noLeidos > 0 && (
              <span style={{ position: 'absolute', top: -6, right: -6, background: C.red, color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {noLeidos}
              </span>
            )}
          </button>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{user?.nombres} {user?.apellidos}</span>
          <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontSize: 13 }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
        {/* Greeting */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700 }}>Hola, {user?.nombres} 👋</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, marginTop: 4 }}>Aquí tienes el resumen de tus pupilos</p>
        </div>

        {/* Hijos */}
        {hijos.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            No hay alumnos asociados a tu cuenta. Contacta a la secretaría del colegio.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 32 }}>
            {hijos.map((hijo) => (
              <HijoCard key={hijo.id} hijo={hijo} onNavigate={navigate} />
            ))}
          </div>
        )}

        {/* Comunicados recientes */}
        {comunicados.length > 0 && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
                <MessageSquare size={18} color={C.purple} /> Comunicados recientes
                {noLeidos > 0 && (
                  <span style={{ background: C.red, color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: 11, fontWeight: 700 }}>{noLeidos} nuevos</span>
                )}
              </div>
              <button onClick={() => navigate('/portal/comunicados')} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.purple, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                Ver todos <ChevronRight size={14} />
              </button>
            </div>
            {comunicados.slice(0, 3).map((c) => (
              <div key={c.id} style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
                {!c.leido && <div style={{ width: 8, height: 8, background: C.purple, borderRadius: '50%', flexShrink: 0 }} />}
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: c.leido ? 400 : 600 }}>{c.comunicado.titulo}</p>
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>
                    {new Date(c.comunicado.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function HijoCard({ hijo, onNavigate }: { hijo: Hijo; onNavigate: (path: string) => void }) {
  const [stats, setStats] = useState<{ pctAsistencia: number; promedioGeneral: number | null } | null>(null);

  useEffect(() => {
    Promise.allSettled([
      portalApi.get(`/portal/hijos/${hijo.id}/asistencia`),
      portalApi.get(`/portal/hijos/${hijo.id}/notas`),
    ]).then(([asistRes, notasRes]) => {
      const pct = asistRes.status === 'fulfilled' ? asistRes.value.data?.stats?.pctAsistencia ?? null : null;
      const prom = notasRes.status === 'fulfilled' ? notasRes.value.data?.promedioGeneral ?? null : null;
      setStats({ pctAsistencia: pct, promedioGeneral: prom });
    });
  }, [hijo.id]);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: `${C.purple}22`, border: `2px solid ${C.purple}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <User size={22} color={C.purple} />
        </div>
        <div>
          <p style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>{hijo.apellidoPaterno} {hijo.apellidoMaterno}</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{hijo.nombres}</p>
          <p style={{ color: 'var(--muted)', fontSize: 12 }}>{hijo.curso?.nombre ?? 'Sin curso'} · {hijo.parentesco}</p>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {stats.pctAsistencia !== null && (
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ color: stats.pctAsistencia >= 85 ? C.green : stats.pctAsistencia >= 70 ? C.amber : C.red, fontWeight: 700, fontSize: 20 }}>{stats.pctAsistencia}%</div>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>Asistencia</div>
            </div>
          )}
          {stats.promedioGeneral !== null && (
            <div style={{ flex: 1, background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
              <div style={{ color: stats.promedioGeneral >= 5 ? C.green : stats.promedioGeneral >= 4 ? C.amber : C.red, fontWeight: 700, fontSize: 20 }}>{stats.promedioGeneral?.toFixed(1)}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11 }}>Promedio</div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[
          { icon: <BookOpen size={15} />, label: 'Ver notas', path: `/portal/hijo/${hijo.id}/notas` },
          { icon: <CalendarCheck size={15} />, label: 'Ver asistencia', path: `/portal/hijo/${hijo.id}/asistencia` },
          { icon: <TrendingUp size={15} />, label: 'Informe completo', path: `/portal/hijo/${hijo.id}/informe` },
        ].map((action) => (
          <button
            key={action.path}
            onClick={() => onNavigate(action.path)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-primary)', fontSize: 13, width: '100%' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{action.icon} {action.label}</span>
            <ChevronRight size={14} color="var(--muted)" />
          </button>
        ))}
      </div>
    </div>
  );
}
