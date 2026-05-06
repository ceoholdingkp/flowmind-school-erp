import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import portalApi from '../../api/portalClient';

interface Lectura {
  id: string;
  leido: boolean;
  fechaLectura?: string;
  confirmado?: boolean;
  comunicado: {
    id: string;
    titulo: string;
    cuerpo: string;
    audiencia: string;
    requiereConfirmacion: boolean;
    createdAt: string;
  };
}

export default function ComunicadosPortal() {
  const navigate = useNavigate();
  const [lecturas, setLecturas] = useState<Lectura[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Lectura | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  useEffect(() => {
    portalApi.get('/portal/v2/comunicados')
      .then((r) => setLecturas(r.data?.lecturas ?? r.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConfirmar = async (lecturaId: string) => {
    setConfirming(lecturaId);
    try {
      await portalApi.post(`/portal/v2/comunicados/${lecturaId}/confirmar`);
      setLecturas((prev) => prev.map((l) => l.id === lecturaId ? { ...l, leido: true, confirmado: true } : l));
      if (selected?.id === lecturaId) setSelected((prev) => prev ? { ...prev, leido: true, confirmado: true } : prev);
    } catch {} finally { setConfirming(null); }
  };

  const handleOpen = (lectura: Lectura) => {
    setSelected(lectura);
    // Mark as read locally
    if (!lectura.leido) {
      portalApi.post(`/portal/v2/comunicados/${lectura.id}/confirmar`).then(() => {
        setLecturas((prev) => prev.map((l) => l.id === lectura.id ? { ...l, leido: true } : l));
      }).catch(() => {});
    }
  };

  const noLeidos = lecturas.filter((l) => !l.leido).length;

  if (selected) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ArrowLeft size={18} /> Volver
          </button>
        </div>
        <div style={{ maxWidth: 700, margin: '32px auto', padding: '0 24px' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{selected.comunicado.titulo}</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13 }}>
                {new Date(selected.comunicado.createdAt).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20, color: 'var(--text-primary)', fontSize: 15, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
              {selected.comunicado.cuerpo}
            </div>
            {selected.comunicado.requiereConfirmacion && !selected.confirmado && (
              <div style={{ marginTop: 24, padding: '16px 20px', background: '#8b5cf611', border: '1px solid #8b5cf633', borderRadius: 10 }}>
                <p style={{ color: 'var(--text-primary)', fontSize: 14, marginBottom: 12 }}>Este comunicado requiere tu confirmación de lectura.</p>
                <button
                  onClick={() => handleConfirmar(selected.id)}
                  disabled={!!confirming}
                  style={{ background: '#8b5cf6', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <CheckCircle size={16} /> Confirmar lectura
                </button>
              </div>
            )}
            {selected.confirmado && (
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#10b981', fontSize: 13 }}>
                <CheckCircle size={16} /> Lectura confirmada
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/portal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, flex: 1 }}>
          Comunicados {noLeidos > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 12, padding: '1px 8px', fontSize: 12, fontWeight: 700, marginLeft: 8 }}>{noLeidos} nuevos</span>}
        </h1>
      </div>

      <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <RefreshCw size={28} color="#8b5cf6" className="animate-spin" />
          </div>
        ) : lecturas.length === 0 ? (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
            <MessageSquare size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
            No hay comunicados disponibles.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lecturas.map((l) => (
              <button
                key={l.id}
                onClick={() => handleOpen(l)}
                style={{
                  background: 'var(--card)', border: `1px solid ${l.leido ? 'var(--border)' : '#8b5cf644'}`,
                  borderRadius: 12, padding: '14px 20px', cursor: 'pointer',
                  display: 'flex', alignItems: 'flex-start', gap: 14, textAlign: 'left', width: '100%',
                  transition: 'border-color 0.15s',
                }}
              >
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: l.leido ? 'transparent' : '#8b5cf6', border: l.leido ? '2px solid var(--border)' : 'none', flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ color: 'var(--text-primary)', fontWeight: l.leido ? 400 : 700, fontSize: 15, marginBottom: 4 }}>{l.comunicado.titulo}</p>
                  <p style={{ color: 'var(--muted)', fontSize: 13, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {l.comunicado.cuerpo}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                    <span style={{ color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Clock size={12} /> {new Date(l.comunicado.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    {l.confirmado && <span style={{ color: '#10b981', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={12} /> Confirmado</span>}
                    {l.comunicado.requiereConfirmacion && !l.confirmado && (
                      <span style={{ color: '#f59e0b', fontSize: 12 }}>Requiere confirmación</span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
