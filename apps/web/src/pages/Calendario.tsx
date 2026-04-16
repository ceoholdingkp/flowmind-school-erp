import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, MapPin, Users,
  Calendar, Clock, Tag, X
} from 'lucide-react';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Categoria = 'academico' | 'administrativo' | 'financiero' | 'comunitario';
type Audiencia = 'Docentes' | 'Apoderados' | 'Administrativos' | 'Todos';

interface Evento {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  categoria: Categoria;
  recurrencia: string;
  audiencia: Audiencia;
  ubicacion: string;
  color: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockEventos: Evento[] = [
  { id: 'e1', titulo: 'Consejo de Profesores', descripcion: 'Reunión mensual del cuerpo docente', fechaInicio: '2026-04-07T15:00:00', fechaFin: '2026-04-07T17:00:00', categoria: 'administrativo', recurrencia: 'MENSUAL', audiencia: 'Docentes', ubicacion: 'Sala de Reuniones', color: '#8b5cf6' },
  { id: 'e2', titulo: 'Evaluación SIMCE Lectura', descripcion: 'Aplicación evaluación diagnóstica', fechaInicio: '2026-04-14T08:00:00', fechaFin: '2026-04-14T12:00:00', categoria: 'academico', recurrencia: 'NINGUNA', audiencia: 'Docentes', ubicacion: 'Aulas', color: '#3b82f6' },
  { id: 'e3', titulo: 'Pago Subvención SEP', descripcion: 'Recepción transferencia mensual', fechaInicio: '2026-04-15T09:00:00', fechaFin: '2026-04-15T09:30:00', categoria: 'financiero', recurrencia: 'MENSUAL', audiencia: 'Administrativos', ubicacion: 'Oficina Finanzas', color: '#10b981' },
  { id: 'e4', titulo: 'Reunión Apoderados 2°B', descripcion: 'Entrega de notas primer trimestre', fechaInicio: '2026-04-17T18:00:00', fechaFin: '2026-04-17T19:30:00', categoria: 'comunitario', recurrencia: 'NINGUNA', audiencia: 'Apoderados', ubicacion: 'Sala 2B', color: '#f59e0b' },
  { id: 'e5', titulo: 'Taller Convivencia Escolar', descripcion: 'Jornada de prevención de bullying', fechaInicio: '2026-04-22T09:00:00', fechaFin: '2026-04-22T13:00:00', categoria: 'comunitario', recurrencia: 'NINGUNA', audiencia: 'Todos', ubicacion: 'Gimnasio', color: '#f59e0b' },
  { id: 'e6', titulo: 'Capacitación Docente TIC', descripcion: 'Uso de plataformas digitales en aula', fechaInicio: '2026-04-24T14:00:00', fechaFin: '2026-04-24T17:00:00', categoria: 'academico', recurrencia: 'NINGUNA', audiencia: 'Docentes', ubicacion: 'Sala Computación', color: '#3b82f6' },
  { id: 'e7', titulo: 'Rendición de Cuentas SEP', descripcion: 'Presentación informe trimestral a SLEP', fechaInicio: '2026-04-28T10:00:00', fechaFin: '2026-04-28T12:00:00', categoria: 'financiero', recurrencia: 'TRIMESTRAL', audiencia: 'Administrativos', ubicacion: 'Oficina Dirección', color: '#10b981' },
  { id: 'e8', titulo: 'Inicio Unidad 2 – Ciencias', descripcion: 'Lanzamiento unidad "El Universo"', fechaInicio: '2026-04-29T08:00:00', fechaFin: '2026-04-29T09:30:00', categoria: 'academico', recurrencia: 'NINGUNA', audiencia: 'Docentes', ubicacion: 'Laboratorio', color: '#3b82f6' },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const categoriaConfig: Record<Categoria, { label: string; color: string; bg: string; border: string }> = {
  academico:      { label: 'Académico',      color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)' },
  administrativo: { label: 'Administrativo', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', border: 'rgba(139,92,246,0.3)' },
  financiero:     { label: 'Financiero',     color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)' },
  comunitario:    { label: 'Comunitario',    color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)' },
};

const audienciaColors: Record<string, { color: string; bg: string; border: string }> = {
  Docentes:        { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  Apoderados:      { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  Administrativos: { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  Todos:           { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
};

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun, convert to Mon-based
  const day = new Date(year, month, 1).getDay();
  return (day + 6) % 7; // Mon=0, Sun=6
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });
}

function isSameDay(dateStr: string, year: number, month: number, day: number) {
  const d = new Date(dateStr);
  return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
}

// ─── Main Component ───────────────────────────────────────────────────────────

const PRESET_COLORS = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarillo' },
  { value: '#ef4444', label: 'Rojo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Cian' },
  { value: '#f97316', label: 'Naranja' },
];

interface FormState {
  titulo: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  categoria: string;
  audiencia: string;
  ubicacion: string;
  color: string;
}

const emptyForm: FormState = {
  titulo: '',
  descripcion: '',
  fechaInicio: '',
  fechaFin: '',
  categoria: 'academico',
  audiencia: 'todos',
  ubicacion: '',
  color: '#3b82f6',
};

const Calendario: React.FC = () => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [eventos, setEventos] = useState<Evento[]>(mockEventos);
  const [catFilter, setCatFilter] = useState<string>('');
  const [audFilter, setAudFilter] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string>('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchEventos = useCallback(async () => {
    try {
      const desde = new Date(currentYear, currentMonth, 1).toISOString();
      const hasta = new Date(currentYear, currentMonth + 1, 0).toISOString();
      const params: Record<string, string> = { desde, hasta };
      if (catFilter) params.categoria = catFilter;
      if (audFilter) params.audiencia = audFilter;
      const res = await api.get('/calendario', { params });
      if (res.data?.data?.length) setEventos(res.data.data);
    } catch {
      // use mock
    }
  }, [currentYear, currentMonth, catFilter, audFilter]);

  useEffect(() => { fetchEventos(); }, [fetchEventos]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
    setSelectedDay(null);
  };

  const filteredEventos = eventos.filter(e => {
    const matchCat = !catFilter || e.categoria === catFilter;
    const matchAud = !audFilter || e.audiencia === audFilter || e.audiencia === 'Todos';
    return matchCat && matchAud;
  });

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const getEventsForDay = (day: number) =>
    filteredEventos.filter(e => isSameDay(e.fechaInicio, currentYear, currentMonth, day));

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : filteredEventos;

  const isToday = (day: number) =>
    day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();

  const openModal = () => { setForm(emptyForm); setFormError(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setFormError(''); };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (!form.titulo.trim()) { setFormError('El título es obligatorio.'); return; }
    if (!form.fechaInicio) { setFormError('La fecha de inicio es obligatoria.'); return; }
    if (!form.categoria) { setFormError('La categoría es obligatoria.'); return; }
    if (!form.audiencia) { setFormError('La audiencia es obligatoria.'); return; }
    setFormLoading(true);
    try {
      const payload: Record<string, string> = {
        titulo: form.titulo.trim(),
        fechaInicio: form.fechaInicio,
        categoria: form.categoria,
        audiencia: form.audiencia,
        color: form.color,
      };
      if (form.descripcion.trim()) payload.descripcion = form.descripcion.trim();
      if (form.fechaFin) payload.fechaFin = form.fechaFin;
      if (form.ubicacion.trim()) payload.ubicacion = form.ubicacion.trim();
      await api.post('/calendario', payload);
      closeModal();
      fetchEventos();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Error al guardar el evento. Intente de nuevo.');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>Calendario Institucional</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>Agenda de eventos y actividades del establecimiento</p>
        </div>
        <button onClick={openModal} style={{
          background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>
          <Plus size={16} /> Nuevo Evento
        </button>
      </div>

      {/* ── Filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Categoría:</span>
        {[{ value: '', label: 'Todos' }, ...Object.entries(categoriaConfig).map(([k, v]) => ({ value: k, label: v.label }))].map(opt => (
          <button key={opt.value} onClick={() => setCatFilter(opt.value)} style={{
            background: catFilter === opt.value ? (opt.value ? categoriaConfig[opt.value as Categoria]?.bg : 'rgba(59,130,246,0.15)') : 'var(--card)',
            border: `1px solid ${catFilter === opt.value ? (opt.value ? categoriaConfig[opt.value as Categoria]?.border : 'rgba(59,130,246,0.4)') : 'var(--border)'}`,
            color: catFilter === opt.value ? (opt.value ? categoriaConfig[opt.value as Categoria]?.color : '#3b82f6') : 'var(--muted)',
            borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
          }}>{opt.label}</button>
        ))}
        <div style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />
        <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Audiencia:</span>
        {[{ value: '', label: 'Todos' }, 'Docentes', 'Apoderados', 'Administrativos'].map(opt => {
          const val = typeof opt === 'string' ? opt : opt.value;
          const label = typeof opt === 'string' ? opt : opt.label;
          const cfg = val ? audienciaColors[val] : null;
          return (
            <button key={val} onClick={() => setAudFilter(val)} style={{
              background: audFilter === val ? (cfg?.bg ?? 'rgba(59,130,246,0.15)') : 'var(--card)',
              border: `1px solid ${audFilter === val ? (cfg?.border ?? 'rgba(59,130,246,0.4)') : 'var(--border)'}`,
              color: audFilter === val ? (cfg?.color ?? '#3b82f6') : 'var(--muted)',
              borderRadius: 20, padding: '5px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>{label}</button>
          );
        })}
      </div>

      {/* ── Main Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Calendar */}
        <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, overflow: 'hidden' }}>
          {/* Month Nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #2a3a4a' }}>
            <button onClick={goToPrevMonth} style={{ background: 'var(--bg)', border: '1px solid #2a3a4a', color: 'var(--muted)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={16} />
            </button>
            <h2 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, margin: 0 }}>
              {MONTHS[currentMonth]} {currentYear}
            </h2>
            <button onClick={goToNextMonth} style={{ background: 'var(--bg)', border: '1px solid #2a3a4a', color: 'var(--muted)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #2a3a4a' }}>
            {WEEKDAYS.map(d => (
              <div key={d} style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--muted)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {Array.from({ length: totalCells }).map((_, idx) => {
              const day = idx - firstDay + 1;
              const isValid = day >= 1 && day <= daysInMonth;
              const todayFlag = isValid && isToday(day);
              const selected = isValid && selectedDay === day;
              const dayEvents = isValid ? getEventsForDay(day) : [];

              return (
                <div key={idx} onClick={() => isValid && setSelectedDay(selected ? null : day)}
                  style={{
                    minHeight: 90, padding: '6px 8px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid rgba(42,58,74,0.5)' : 'none',
                    borderBottom: '1px solid rgba(42,58,74,0.5)',
                    background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
                    cursor: isValid ? 'pointer' : 'default',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => isValid && !selected && (e.currentTarget.style.background = 'rgba(42,58,74,0.3)')}
                  onMouseLeave={e => isValid && !selected && (e.currentTarget.style.background = 'transparent')}
                >
                  {isValid && (
                    <>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: '50%', fontSize: 13, fontWeight: 600, marginBottom: 4,
                        background: todayFlag ? '#3b82f6' : 'transparent',
                        border: selected && !todayFlag ? '2px solid #3b82f6' : 'none',
                        color: todayFlag ? '#fff' : isValid ? 'var(--text-primary)' : 'var(--muted)',
                      }}>{day}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 3).map(ev => {
                          const cfg = categoriaConfig[ev.categoria];
                          return (
                            <div key={ev.id} style={{
                              background: cfg.bg, color: cfg.color, borderLeft: `2px solid ${cfg.color}`,
                              borderRadius: 4, padding: '1px 5px', fontSize: 10, fontWeight: 600,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{ev.titulo}</div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div style={{ color: 'var(--muted)', fontSize: 10, padding: '0 2px' }}>+{dayEvents.length - 3} más</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Event List Panel */}
        <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, overflow: 'hidden', position: 'sticky', top: 20 }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #2a3a4a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={15} color="#3b82f6" />
            <span style={{ color: 'var(--text-primary)', fontSize: 14, fontWeight: 700 }}>
              {selectedDay
                ? `${selectedDay} de ${MONTHS[currentMonth]}`
                : `${MONTHS[currentMonth]} ${currentYear}`}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 'auto' }}>{selectedDayEvents.length} evento{selectedDayEvents.length !== 1 ? 's' : ''}</span>
          </div>

          <div style={{ maxHeight: 560, overflowY: 'auto', padding: '8px 0' }}>
            {selectedDayEvents.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>
                <Calendar size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <div style={{ fontSize: 13 }}>Sin eventos{selectedDay ? ' este día' : ' este mes'}</div>
              </div>
            ) : (
              selectedDayEvents.sort((a, b) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()).map(ev => {
                const cfg = categoriaConfig[ev.categoria];
                const audCfg = audienciaColors[ev.audiencia] ?? audienciaColors['Todos'];
                return (
                  <div key={ev.id} style={{
                    padding: '12px 16px', borderLeft: `3px solid ${cfg.color}`,
                    margin: '4px 10px', borderRadius: 8, background: 'rgba(255,255,255,0.02)',
                    border: `1px solid rgba(42,58,74,0.5)`, borderLeftColor: cfg.color,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{ev.titulo}</span>
                      <span style={{ backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {cfg.label}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11 }}>
                        <Clock size={11} />
                        {!selectedDay && <span>{formatDate(ev.fechaInicio)} · </span>}
                        <span>{formatTime(ev.fechaInicio)} – {formatTime(ev.fechaFin)}</span>
                      </div>
                      {ev.ubicacion && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', fontSize: 11 }}>
                          <MapPin size={11} />
                          <span>{ev.ubicacion}</span>
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <Users size={11} color="var(--muted)" />
                        <span style={{ backgroundColor: audCfg.bg, color: audCfg.color, border: `1px solid ${audCfg.border}`, borderRadius: 5, padding: '1px 7px', fontSize: 10, fontWeight: 600 }}>
                          {ev.audiencia}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Legend */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #2a3a4a' }}>
            <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Leyenda</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {Object.entries(categoriaConfig).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: v.color, flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', fontSize: 11 }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nuevo Evento Modal ── */}
      {modalOpen && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 14,
              width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto',
              fontFamily: 'Inter, system-ui, sans-serif',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #2a3a4a' }}>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Plus size={18} color="#3b82f6" /> Nuevo Evento
              </h2>
              <button onClick={closeModal} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 4, borderRadius: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Título */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Título <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    name="titulo" value={form.titulo} onChange={handleFormChange}
                    placeholder="Nombre del evento"
                    required
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                      color: 'var(--text-primary)', fontSize: 14, padding: '9px 12px', outline: 'none',
                    }}
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Descripción
                  </label>
                  <textarea
                    name="descripcion" value={form.descripcion} onChange={handleFormChange}
                    placeholder="Descripción opcional del evento"
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box', resize: 'vertical',
                      background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                      color: 'var(--text-primary)', fontSize: 14, padding: '9px 12px', outline: 'none',
                    }}
                  />
                </div>

                {/* Fechas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Fecha Inicio <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      type="datetime-local" name="fechaInicio" value={form.fechaInicio} onChange={handleFormChange}
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                        color: 'var(--text-primary)', fontSize: 13, padding: '9px 10px', outline: 'none',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Fecha Fin
                    </label>
                    <input
                      type="datetime-local" name="fechaFin" value={form.fechaFin} onChange={handleFormChange}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                        color: 'var(--text-primary)', fontSize: 13, padding: '9px 10px', outline: 'none',
                      }}
                    />
                  </div>
                </div>

                {/* Categoría + Audiencia */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Categoría <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="categoria" value={form.categoria} onChange={handleFormChange}
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                        color: 'var(--text-primary)', fontSize: 14, padding: '9px 10px', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="academico">Académico</option>
                      <option value="administrativo">Administrativo</option>
                      <option value="financiero">Financiero</option>
                      <option value="comunitario">Comunitario</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                      Audiencia <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <select
                      name="audiencia" value={form.audiencia} onChange={handleFormChange}
                      required
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                        color: 'var(--text-primary)', fontSize: 14, padding: '9px 10px', outline: 'none', cursor: 'pointer',
                      }}
                    >
                      <option value="todos">Todos</option>
                      <option value="docentes">Docentes</option>
                      <option value="apoderados">Apoderados</option>
                      <option value="administrativos">Administrativos</option>
                    </select>
                  </div>
                </div>

                {/* Ubicación */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Ubicación
                  </label>
                  <input
                    name="ubicacion" value={form.ubicacion} onChange={handleFormChange}
                    placeholder="Sala, dirección u otro lugar"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: 'var(--bg)', border: '1px solid #2a3a4a', borderRadius: 8,
                      color: 'var(--text-primary)', fontSize: 14, padding: '9px 12px', outline: 'none',
                    }}
                  />
                </div>

                {/* Color */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 12, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>
                    Color
                  </label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.value} type="button"
                        onClick={() => setForm(prev => ({ ...prev, color: c.value }))}
                        title={c.label}
                        style={{
                          width: 28, height: 28, borderRadius: '50%', background: c.value,
                          border: form.color === c.value ? '3px solid var(--text-primary)' : '3px solid transparent',
                          cursor: 'pointer', outline: 'none', padding: 0,
                          boxShadow: form.color === c.value ? `0 0 0 2px var(--bg), 0 0 0 4px ${c.value}` : 'none',
                          transition: 'box-shadow 0.15s',
                        }}
                      />
                    ))}
                  </div>
                </div>

                {/* Error */}
                {formError && (
                  <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#ef4444', fontSize: 13 }}>
                    {formError}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
                  <button type="button" onClick={closeModal} disabled={formLoading} style={{
                    background: 'var(--bg)', border: '1px solid #2a3a4a', color: 'var(--muted)',
                    borderRadius: 8, padding: '9px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={formLoading} style={{
                    background: formLoading ? '#1d4ed8' : '#3b82f6', border: 'none', color: '#fff',
                    borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 600, cursor: formLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8, opacity: formLoading ? 0.75 : 1,
                  }}>
                    {formLoading ? 'Guardando…' : 'Guardar'}
                  </button>
                </div>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Calendario;
