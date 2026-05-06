import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { useToastStore } from '../../store/toast.store';

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
}

export default function NuevoComunicado() {
  const navigate = useNavigate();
  const toast = useToastStore();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    contenido: '',
    tipo: 'CIRCULAR',
    prioridad: 'NORMAL',
    destinatarios: 'TODOS',
    cursoId: '',
    fechaExpiracion: '',
  });

  useEffect(() => {
    api.get('/sistema/cursos?anio=2026').then((r) => setCursos(r.data?.data ?? r.data ?? []));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titulo.trim() || !form.contenido.trim()) return;
    setSaving(true);
    try {
      const payload: any = {
        titulo: form.titulo,
        contenido: form.contenido,
        tipo: form.tipo,
        prioridad: form.prioridad,
        destinatarios: form.destinatarios,
      };
      if ((form.destinatarios === 'CURSO' || form.destinatarios === 'NIVEL') && form.cursoId) {
        payload.cursoId = form.cursoId;
      }
      if (form.fechaExpiracion) payload.fechaExpiracion = form.fechaExpiracion;

      const res = await api.post('/comunicaciones', payload);
      toast.success('Comunicado enviado exitosamente');
      navigate(`/comunicaciones/${res.data.id}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? 'Error al enviar el comunicado');
    } finally {
      setSaving(false);
    }
  }

  const needsCurso = form.destinatarios === 'CURSO' || form.destinatarios === 'NIVEL';

  const inputStyle = {
    background: 'var(--card)',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
    outline: 'none',
  } as React.CSSProperties;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/comunicaciones')}
          className="p-2 rounded-lg transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--nav-hover)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Nuevo Comunicado
          </h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            El comunicado se enviará a todos los apoderados seleccionados
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="p-6 rounded-xl space-y-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          {/* Título */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              TÍTULO *
            </label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => set('titulo', e.target.value)}
              placeholder="Título del comunicado"
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>

          {/* Tipo y Prioridad */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>TIPO</label>
              <select
                value={form.tipo}
                onChange={(e) => set('tipo', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="CIRCULAR">Circular</option>
                <option value="AVISO">Aviso</option>
                <option value="REUNION">Reunión</option>
                <option value="EMERGENCIA">Emergencia</option>
                <option value="ACADEMICO">Académico</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>PRIORIDAD</label>
              <select
                value={form.prioridad}
                onChange={(e) => set('prioridad', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={inputStyle}
              >
                <option value="NORMAL">Normal</option>
                <option value="ALTA">Alta</option>
                <option value="URGENTE">Urgente</option>
              </select>
            </div>
          </div>

          {/* Destinatarios */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>DESTINATARIOS</label>
            <select
              value={form.destinatarios}
              onChange={(e) => set('destinatarios', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={inputStyle}
            >
              <option value="TODOS">Todos los apoderados</option>
              <option value="CURSO">Un curso específico</option>
              <option value="NIVEL">Un nivel completo</option>
            </select>
          </div>

          {/* Curso (when needed) */}
          {needsCurso && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                {form.destinatarios === 'NIVEL' ? 'CURSO DE REFERENCIA (nivel)' : 'CURSO'}
              </label>
              <select
                value={form.cursoId}
                onChange={(e) => set('cursoId', e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={inputStyle}
                required={needsCurso}
              >
                <option value="">Seleccionar curso...</option>
                {cursos.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Contenido */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>CONTENIDO *</label>
            <textarea
              value={form.contenido}
              onChange={(e) => set('contenido', e.target.value)}
              placeholder="Escriba el contenido del comunicado..."
              required
              rows={6}
              className="w-full px-3 py-2.5 rounded-lg text-sm resize-none"
              style={inputStyle}
            />
          </div>

          {/* Fecha expiración */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
              FECHA EXPIRACIÓN (opcional)
            </label>
            <input
              type="date"
              value={form.fechaExpiracion}
              onChange={(e) => set('fechaExpiracion', e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={inputStyle}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => navigate('/comunicaciones')}
            className="px-4 py-2 rounded-lg text-sm"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
            style={{ background: saving ? '#94a3b8' : '#3b82f6', cursor: saving ? 'not-allowed' : 'pointer' }}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            {saving ? 'Enviando...' : 'Enviar comunicado'}
          </button>
        </div>
      </form>
    </div>
  );
}
