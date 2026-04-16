import React, { useEffect, useState } from 'react';
import { BookMarked, ChevronLeft, ChevronRight, CheckCircle, RefreshCw, PenLine, X } from 'lucide-react';
import api from '../api/client';
import { useAuthStore } from '../store/auth.store';

interface Entrada {
  id: string;
  fecha: string;
  dia: string;
  asignatura?: string;
  contenido?: string;
  objetivo?: string;
  estado: 'PENDIENTE' | 'FIRMADO' | 'REVISADO_UTP';
  docenteId?: string;
  firmaDigital?: string;
}

const ESTADO_STYLE: Record<string, { color: string; label: string }> = {
  PENDIENTE: { color: '#f59e0b', label: 'Pendiente' },
  FIRMADO: { color: '#10b981', label: 'Firmado' },
  REVISADO_UTP: { color: '#3b82f6', label: 'Revisado UTP' },
};

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

interface Curso { id: string; nombre: string; }
interface Asignatura { id: string; nombre: string; }

interface EntradaForm {
  cursoId: string;
  asignaturaId: string;
  fecha: string;
  bloqueHorario: string;
  horaInicio: string;
  horaFin: string;
  objetivo: string;
  contenido: string;
  actividades: string;
  recursos: string;
}

const TODAY = new Date().toISOString().split('T')[0];

const EMPTY_FORM: EntradaForm = {
  cursoId: '',
  asignaturaId: '',
  fecha: TODAY,
  bloqueHorario: '',
  horaInicio: '',
  horaFin: '',
  objetivo: '',
  contenido: '',
  actividades: '',
  recursos: '',
};

function NuevaEntradaModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [form, setForm] = useState<EntradaForm>(EMPTY_FORM);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [asignaturas, setAsignaturas] = useState<Asignatura[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/sistema/cursos').then((r) => setCursos(r.data.data ?? r.data)).catch(() => {});
    api.get('/sistema/asignaturas').then((r) => setAsignaturas(r.data.data ?? r.data)).catch(() => {});
  }, []);

  const set = (field: keyof EntradaForm, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.cursoId || !form.asignaturaId || !form.fecha || !form.bloqueHorario || !form.contenido) {
      setError('Completa los campos obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        cursoId: form.cursoId,
        asignaturaId: form.asignaturaId,
        docenteId: user?.id,
        fecha: form.fecha,
        bloqueHorario: Number(form.bloqueHorario),
        contenido: form.contenido,
      };
      if (form.horaInicio) payload.horaInicio = form.horaInicio;
      if (form.horaFin) payload.horaFin = form.horaFin;
      if (form.objetivo) payload.objetivo = form.objetivo;
      if (form.actividades) payload.actividades = form.actividades;
      if (form.recursos) payload.recursos = form.recursos;
      await api.post('/leccionario', payload);
      onSuccess();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg ?? 'Error al guardar la entrada.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full bg-[#0f1923] border border-[#2a3a4a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#8899aa]';
  const labelCls = 'block text-xs text-[#8899aa] mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#2a3a4a]">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <BookMarked size={15} /> Nueva entrada
          </h2>
          <button onClick={onClose} className="text-[#8899aa] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4">
          {/* Row: Curso + Asignatura */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Curso <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.cursoId} onChange={(e) => set('cursoId', e.target.value)} required>
                <option value="">Seleccionar...</option>
                {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Asignatura <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.asignaturaId} onChange={(e) => set('asignaturaId', e.target.value)} required>
                <option value="">Seleccionar...</option>
                {asignaturas.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Fecha + Bloque */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Fecha <span className="text-red-400">*</span></label>
              <input type="date" className={inputCls} value={form.fecha} onChange={(e) => set('fecha', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Bloque Horario <span className="text-red-400">*</span></label>
              <select className={inputCls} value={form.bloqueHorario} onChange={(e) => set('bloqueHorario', e.target.value)} required>
                <option value="">Seleccionar...</option>
                {[1,2,3,4,5,6,7,8].map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Hora Inicio + Hora Fin */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Hora Inicio</label>
              <input type="text" className={inputCls} placeholder="08:00" value={form.horaInicio} onChange={(e) => set('horaInicio', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Hora Fin</label>
              <input type="text" className={inputCls} placeholder="08:45" value={form.horaFin} onChange={(e) => set('horaFin', e.target.value)} />
            </div>
          </div>

          {/* Objetivo */}
          <div>
            <label className={labelCls}>Objetivo</label>
            <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Objetivo de la clase..." value={form.objetivo} onChange={(e) => set('objetivo', e.target.value)} />
          </div>

          {/* Contenido */}
          <div>
            <label className={labelCls}>Contenido <span className="text-red-400">*</span></label>
            <textarea className={inputCls + ' resize-none'} rows={3} placeholder="Contenido tratado en la clase..." value={form.contenido} onChange={(e) => set('contenido', e.target.value)} required />
          </div>

          {/* Actividades */}
          <div>
            <label className={labelCls}>Actividades</label>
            <textarea className={inputCls + ' resize-none'} rows={2} placeholder="Actividades realizadas..." value={form.actividades} onChange={(e) => set('actividades', e.target.value)} />
          </div>

          {/* Recursos */}
          <div>
            <label className={labelCls}>Recursos</label>
            <input type="text" className={inputCls} placeholder="Recursos utilizados..." value={form.recursos} onChange={(e) => set('recursos', e.target.value)} />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 text-sm text-[#8899aa] border border-[#2a3a4a] hover:border-[#3b82f6] hover:text-white rounded-lg py-2 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="flex-1 text-sm bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 text-white rounded-lg py-2 transition-colors flex items-center justify-center gap-2">
              {submitting ? <><RefreshCw size={13} className="animate-spin" /> Guardando...</> : 'Guardar entrada'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function getWeekDates(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff + offset * 7));
  return DIAS.map((_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export default function Leccionario() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const weekDates = getWeekDates(weekOffset);

  const weekStr = `${weekDates[0].toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })} — ${weekDates[4].toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })}`;

  const load = async () => {
    setLoading(true);
    try {
      const mes = weekDates[0].getMonth() + 1;
      const anio = weekDates[0].getFullYear();
      const res = await api.get('/leccionario', { params: { mes, anio, limit: 50 } });
      const data = res.data.data ?? res.data;
      setEntradas(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [weekOffset]);

  const handleFirmar = async (id: string) => {
    setSigning(id);
    try {
      await api.post(`/leccionario/${id}/firmar`);
      await load();
    } finally {
      setSigning(null);
    }
  };

  const getDayEntradas = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return entradas.filter((e) => e.fecha?.startsWith(dateStr));
  };

  const stats = {
    total: entradas.length,
    firmados: entradas.filter((e) => e.estado === 'FIRMADO' || e.estado === 'REVISADO_UTP').length,
    pendientes: entradas.filter((e) => e.estado === 'PENDIENTE').length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Libro de Clases</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">Leccionario semanal</p>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-2 rounded-lg">
          <BookMarked size={13} /> Nueva entrada
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total entradas', val: stats.total, color: '#3b82f6' },
          { label: 'Firmadas', val: stats.firmados, color: '#10b981' },
          { label: 'Pendientes firma', val: stats.pendientes, color: '#f59e0b' },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs text-[#8899aa] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Week navigator */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4 flex items-center justify-between">
        <button onClick={() => setWeekOffset((o) => o - 1)}
          className="p-2 rounded-lg text-[#8899aa] hover:text-white hover:bg-[#0f1923] transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-white font-medium text-sm">{weekStr}</p>
          <p className="text-[#8899aa] text-xs">Semana {weekOffset === 0 ? 'actual' : weekOffset > 0 ? `+${weekOffset}` : weekOffset}</p>
        </div>
        <button onClick={() => setWeekOffset((o) => o + 1)}
          className="p-2 rounded-lg text-[#8899aa] hover:text-white hover:bg-[#0f1923] transition-colors">
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Weekly grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-[#8899aa]">
          <RefreshCw className="animate-spin mr-2" size={16} /> Cargando...
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {weekDates.map((date, i) => {
            const dayEntradas = getDayEntradas(date);
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div key={i} className={`bg-[#1a2332] border rounded-xl overflow-hidden ${isToday ? 'border-[#3b82f6]' : 'border-[#2a3a4a]'}`}>
                <div className={`px-3 py-2 border-b border-[#2a3a4a] ${isToday ? 'bg-[#1e3a5f]' : ''}`}>
                  <p className={`text-xs font-medium ${isToday ? 'text-[#3b82f6]' : 'text-[#8899aa]'}`}>{DIAS[i]}</p>
                  <p className="text-white text-sm font-semibold">{date.getDate()}</p>
                </div>
                <div className="p-2 space-y-2 min-h-24">
                  {dayEntradas.length === 0 ? (
                    <p className="text-[#8899aa] text-xs text-center py-3">—</p>
                  ) : dayEntradas.map((e) => {
                    const s = ESTADO_STYLE[e.estado];
                    return (
                      <div key={e.id} className="bg-[#0f1923] rounded-lg p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-white truncate">{e.asignatura ?? 'Clase'}</span>
                          <span className="text-[10px] font-medium" style={{ color: s.color }}>{s.label}</span>
                        </div>
                        {e.contenido && (
                          <p className="text-[10px] text-[#8899aa] truncate">{e.contenido}</p>
                        )}
                        {e.estado === 'PENDIENTE' && (
                          <button
                            onClick={() => handleFirmar(e.id)}
                            disabled={signing === e.id}
                            className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] text-[#10b981] hover:text-white bg-[#10b981]/10 hover:bg-[#10b981]/20 rounded px-2 py-1 transition-colors"
                          >
                            {signing === e.id ? <RefreshCw size={10} className="animate-spin" /> : <PenLine size={10} />}
                            Firmar
                          </button>
                        )}
                        {(e.estado === 'FIRMADO' || e.estado === 'REVISADO_UTP') && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-[#10b981]">
                            <CheckCircle size={10} /> Firmado
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <NuevaEntradaModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}
