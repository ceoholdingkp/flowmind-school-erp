import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import portalApi from '../../api/portalClient';

interface Registro {
  id: string;
  fecha: string;
  estado: 'PRESENTE' | 'AUSENTE' | 'ATRASO' | 'JUSTIFICADO' | 'RETIRADO_ANTICIPADO';
  curso: { nombre: string };
}

interface Stats {
  total: number;
  presentes: number;
  ausentes: number;
  atrasos: number;
  justificados: number;
  pctAsistencia: number;
}

interface Data {
  mes: number;
  anio: number;
  registros: Registro[];
  stats: Stats;
}

const ESTADO_COLOR: Record<string, string> = {
  PRESENTE: '#10b981', AUSENTE: '#ef4444', ATRASO: '#f59e0b',
  JUSTIFICADO: '#8b5cf6', RETIRADO_ANTICIPADO: '#06b6d4',
};
const DIAS_SEMANA = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function AsistenciaHijo() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    portalApi.get(`/portal/hijos/${id}/asistencia`, { params: { mes, anio } })
      .then((r) => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, mes, anio]);

  const prevMes = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else setMes(mes - 1);
  };

  const nextMes = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else setMes(mes + 1);
  };

  // Build calendar grid
  const firstDay = new Date(anio, mes - 1, 1).getDay(); // 0=Sun
  const firstMon = firstDay === 0 ? 6 : firstDay - 1; // adjust so Mon=0
  const daysInMonth = new Date(anio, mes, 0).getDate();

  const registroByDay: Record<number, Registro> = {};
  (data?.registros ?? []).forEach((r) => {
    const d = new Date(r.fecha);
    registroByDay[d.getDate()] = r;
  });

  const pct = data?.stats.pctAsistencia ?? 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/portal')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={18} /> Volver
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, flex: 1 }}>Asistencia</h1>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
        {/* Mes selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 24 }}>
          <button onClick={prevMes} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--muted)' }}>
            <ChevronLeft size={18} />
          </button>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18, minWidth: 160, textAlign: 'center' }}>
            {MESES[mes - 1]} {anio}
          </span>
          <button onClick={nextMes} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: 'var(--muted)' }}>
            <ChevronRight size={18} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <RefreshCw size={28} color="#8b5cf6" className="animate-spin" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            {data && (
              <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
                {[
                  { label: 'Asistencia', val: `${pct}%`, color: pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444' },
                  { label: 'Presentes', val: data.stats.presentes, color: '#10b981' },
                  { label: 'Ausentes', val: data.stats.ausentes, color: '#ef4444' },
                  { label: 'Atrasos', val: data.stats.atrasos, color: '#f59e0b' },
                  { label: 'Justificados', val: data.stats.justificados, color: '#8b5cf6' },
                ].map((s) => (
                  <div key={s.label} style={{ flex: 1, minWidth: 90, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                    <div style={{ color: s.color, fontSize: 22, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 2 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
              {/* Day headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: 'var(--bg)', padding: '8px 0' }}>
                {DIAS_SEMANA.map((d) => (
                  <div key={d} style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 12, fontWeight: 600 }}>{d}</div>
                ))}
              </div>

              {/* Days */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, padding: '8px', background: 'var(--border)' }}>
                {Array.from({ length: firstMon }).map((_, i) => (
                  <div key={`empty-${i}`} style={{ aspectRatio: '1', background: 'var(--card)' }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const reg = registroByDay[day];
                  const isWeekend = (() => {
                    const dow = new Date(anio, mes - 1, day).getDay();
                    return dow === 0 || dow === 6;
                  })();

                  return (
                    <div
                      key={day}
                      style={{
                        aspectRatio: '1', background: 'var(--card)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        position: 'relative', borderRadius: 4,
                      }}
                    >
                      <span style={{ fontSize: 13, color: isWeekend ? 'var(--muted)' : 'var(--text-primary)', fontWeight: reg ? 600 : 400 }}>{day}</span>
                      {reg && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ESTADO_COLOR[reg.estado] ?? '#888', marginTop: 2 }} title={reg.estado} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leyenda */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 16, justifyContent: 'center' }}>
              {Object.entries(ESTADO_COLOR).map(([estado, color]) => (
                <div key={estado} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                  {estado.replace('_', ' ')}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
