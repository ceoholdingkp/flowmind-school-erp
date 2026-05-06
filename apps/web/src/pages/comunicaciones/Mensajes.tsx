import React, { useState, useEffect } from 'react';
import { Inbox, Send, Mail, MailOpen, User } from 'lucide-react';
import api from '../../api/client';

interface Mensaje {
  id: string;
  alumnoId: string;
  remitente: string;
  destinatarioId: string;
  asunto: string;
  contenido: string;
  leido: boolean;
  fechaLectura: string | null;
  createdAt: string;
  alumno: { nombre: string; apellidos: string };
}

export default function Mensajes() {
  const [tab, setTab] = useState<'recibidos' | 'enviados'>('recibidos');
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [enviados, setEnviados] = useState<Mensaje[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Mensaje | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/comunicaciones/mensajes'),
      api.get('/comunicaciones/mensajes/enviados'),
    ])
      .then(([r, e]) => {
        setMensajes(r.data ?? []);
        setEnviados(e.data ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  const list = tab === 'recibidos' ? mensajes : enviados;
  const unread = mensajes.filter((m) => !m.leido).length;

  async function openMensaje(m: Mensaje) {
    setSelected(m);
    if (!m.leido && tab === 'recibidos') {
      try {
        await api.patch(`/comunicaciones/mensajes/${m.id}/leido`);
        setMensajes((prev) =>
          prev.map((x) => (x.id === m.id ? { ...x, leido: true } : x)),
        );
      } catch (_) {}
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Mensajes
          </h1>
          {unread > 0 && (
            <p className="text-sm mt-1" style={{ color: '#3b82f6' }}>
              {unread} mensaje{unread !== 1 ? 's' : ''} sin leer
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-1 p-1 rounded-lg w-fit"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        <button
          onClick={() => { setTab('recibidos'); setSelected(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors"
          style={tab === 'recibidos' ? { background: '#3b82f6', color: '#fff' } : { color: 'var(--muted)' }}
        >
          <Inbox size={14} />
          Recibidos
          {unread > 0 && (
            <span className="text-[10px] bg-white text-[#3b82f6] rounded-full px-1.5 font-bold">
              {unread}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab('enviados'); setSelected(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-sm transition-colors"
          style={tab === 'enviados' ? { background: '#3b82f6', color: '#fff' } : { color: 'var(--muted)' }}
        >
          <Send size={14} />
          Enviados
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* List */}
        <div className="space-y-2">
          {loading ? (
            [...Array(4)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
            ))
          ) : list.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              <Mail size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay mensajes</p>
            </div>
          ) : (
            list.map((m) => (
              <div
                key={m.id}
                onClick={() => openMensaje(m)}
                className="p-3 rounded-xl cursor-pointer transition-all"
                style={{
                  background: selected?.id === m.id ? '#3b82f622' : 'var(--card)',
                  border: `1px solid ${selected?.id === m.id ? '#3b82f6' : 'var(--border)'}`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: 'var(--nav-hover)' }}
                  >
                    <User size={14} style={{ color: 'var(--muted)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-sm ${!m.leido && tab === 'recibidos' ? 'font-semibold' : 'font-medium'}`}
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {m.asunto}
                      </span>
                      {!m.leido && tab === 'recibidos' && (
                        <span className="w-2 h-2 rounded-full bg-[#3b82f6] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
                      Alumno: {m.alumno?.nombre} {m.alumno?.apellidos}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {new Date(m.createdAt).toLocaleDateString('es-CL')}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Detail */}
        {selected ? (
          <div
            className="p-5 rounded-xl space-y-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between">
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {selected.asunto}
              </h2>
              {selected.leido
                ? <MailOpen size={16} style={{ color: '#10b981' }} />
                : <Mail size={16} style={{ color: '#f59e0b' }} />
              }
            </div>
            <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
              <p>Alumno: <span style={{ color: 'var(--text-primary)' }}>{selected.alumno?.nombre} {selected.alumno?.apellidos}</span></p>
              <p>Fecha: {new Date(selected.createdAt).toLocaleDateString('es-CL', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}</p>
            </div>
            <div className="pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                {selected.contenido}
              </p>
            </div>
          </div>
        ) : (
          <div
            className="rounded-xl flex items-center justify-center"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', minHeight: 200 }}
          >
            <div className="text-center" style={{ color: 'var(--muted)' }}>
              <Mail size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Selecciona un mensaje</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
