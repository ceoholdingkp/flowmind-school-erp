import React, { useEffect, useState } from 'react';
import { Search, Filter, RefreshCw, Heart, AlertTriangle, X } from 'lucide-react';
import api from '../api/client';

interface Alumno {
  id: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
}

const today = new Date().toISOString().slice(0, 10);

const CATEGORIAS = ['Conducta', 'Rendimiento', 'Asistencia', 'Participación', 'Trabajo en equipo', 'Puntualidad'];

interface AnotacionForm {
  alumnoId: string;
  tipo: 'POSITIVA' | 'NEGATIVA' | '';
  gravedad: 'LEVE' | 'GRAVE' | 'GRAVISIMA' | '';
  categoria: string;
  descripcion: string;
  fecha: string;
}

const EMPTY_FORM: AnotacionForm = {
  alumnoId: '',
  tipo: '',
  gravedad: '',
  categoria: '',
  descripcion: '',
  fecha: today,
};

interface Anotacion {
  id: string;
  tipo: 'POSITIVA' | 'NEGATIVA' | 'OBSERVACION';
  gravedad?: 'LEVE' | 'MODERADA' | 'GRAVE' | 'GRAVISIMA';
  descripcion: string;
  fecha: string;
  alumno?: { nombres: string; apellidoPaterno: string; apellidoMaterno: string };
  funcionario?: { nombres: string; apellidoPaterno: string };
  protocoloActivo?: string;
}

const TIPO_COLOR: Record<string, string> = {
  POSITIVA: '#10b981', NEGATIVA: '#ef4444', OBSERVACION: '#f59e0b',
};
const GRAVEDAD_COLOR: Record<string, string> = {
  LEVE: 'var(--muted)', MODERADA: '#f59e0b', GRAVE: '#ef4444', GRAVISIMA: '#8b5cf6',
};

export default function Convivencia() {
  const [anotaciones, setAnotaciones] = useState<Anotacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState('');
  const [q, setQ] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [form, setForm] = useState<AnotacionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openModal = async () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
    if (alumnos.length === 0) {
      try {
        const res = await api.get('/alumnos', { params: { limit: 200, estadoMatricula: 'ACTIVA' } });
        const data = res.data.data ?? res.data;
        setAlumnos(Array.isArray(data) ? data : []);
      } catch {
        setAlumnos([]);
      }
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setFormError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const body: any = {
      alumnoId: form.alumnoId,
      tipo: form.tipo,
      categoria: form.categoria,
      descripcion: form.descripcion,
      fecha: form.fecha,
    };
    if (form.tipo === 'NEGATIVA' && form.gravedad) {
      body.gravedad = form.gravedad;
    }
    setSaving(true);
    try {
      await api.post('/convivencia', body);
      closeModal();
      load();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Error al guardar';
      setFormError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSaving(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (tipo) params.tipo = tipo;
      const res = await api.get('/convivencia', { params });
      const data = res.data.data ?? res.data;
      setAnotaciones(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tipo]);

  const filtered = anotaciones.filter((a) => {
    if (!q) return true;
    const nombre = `${a.alumno?.apellidoPaterno} ${a.alumno?.nombres}`.toLowerCase();
    return nombre.includes(q.toLowerCase()) || a.descripcion.toLowerCase().includes(q.toLowerCase());
  });

  const stats = {
    total: anotaciones.length,
    positivas: anotaciones.filter((a) => a.tipo === 'POSITIVA').length,
    negativas: anotaciones.filter((a) => a.tipo === 'NEGATIVA').length,
    protocolos: anotaciones.filter((a) => a.protocoloActivo).length,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Convivencia Escolar</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">Anotaciones y protocolos</p>
        </div>
        <button
          onClick={openModal}
          className="flex items-center gap-1.5 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-2 rounded-lg transition-colors">
          <Heart size={13} /> Nueva Anotación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', val: stats.total, color: '#3b82f6' },
          { label: 'Positivas', val: stats.positivas, color: '#10b981' },
          { label: 'Negativas', val: stats.negativas, color: '#ef4444' },
          { label: 'Protocolos', val: stats.protocolos, color: '#8b5cf6' },
        ].map((s) => (
          <div key={s.label} className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5 text-center">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
            <div className="text-xs text-[#8899aa] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por alumno o descripción..."
            className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-[#8899aa] focus:outline-none focus:border-[#3b82f6]"
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]" />
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value)}
            className="bg-[#0f1923] border border-[#2a3a4a] rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none appearance-none"
          >
            <option value="">Todos los tipos</option>
            <option value="POSITIVA">Positiva</option>
            <option value="NEGATIVA">Negativa</option>
            <option value="OBSERVACION">Observación</option>
          </select>
        </div>
        <button onClick={load} className="p-2 bg-[#0f1923] border border-[#2a3a4a] rounded-lg text-[#8899aa] hover:text-white">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a3a4a]">
              {['Fecha', 'Alumno', 'Tipo', 'Gravedad', 'Descripción', 'Registrado por', 'Protocolo'].map((h) => (
                <th key={h} className="text-left text-xs text-[#8899aa] uppercase px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#8899aa]">
                <RefreshCw className="animate-spin inline mr-2" size={16} /> Cargando...
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-[#8899aa]">Sin anotaciones</td></tr>
            ) : filtered.map((a) => (
              <tr key={a.id} className="border-b border-[#2a3a4a] hover:bg-[#0f1923] transition-colors">
                <td className="px-4 py-3 text-[#8899aa] text-xs whitespace-nowrap">
                  {new Date(a.fecha).toLocaleDateString('es-CL')}
                </td>
                <td className="px-4 py-3 text-white text-sm">
                  {a.alumno ? `${a.alumno.apellidoPaterno} ${a.alumno.nombres}` : '—'}
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                    style={{ backgroundColor: (TIPO_COLOR[a.tipo] ?? 'var(--muted)') + '20', color: TIPO_COLOR[a.tipo] ?? 'var(--muted)' }}>
                    {a.tipo}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.gravedad ? (
                    <span className="text-xs font-medium" style={{ color: GRAVEDAD_COLOR[a.gravedad] }}>
                      {a.gravedad}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3 text-[#8899aa] text-xs max-w-xs truncate">{a.descripcion}</td>
                <td className="px-4 py-3 text-[#8899aa] text-xs">
                  {a.funcionario ? `${a.funcionario.apellidoPaterno} ${a.funcionario.nombres}` : '—'}
                </td>
                <td className="px-4 py-3">
                  {a.protocoloActivo ? (
                    <span className="flex items-center gap-1 text-xs text-[#8b5cf6]">
                      <AlertTriangle size={12} /> {a.protocoloActivo}
                    </span>
                  ) : <span className="text-[#8899aa] text-xs">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Nueva Anotación Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-base">Nueva Anotación</h2>
              <button onClick={closeModal} className="text-[#8899aa] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Alumno */}
              <div>
                <label className="block text-xs text-[#8899aa] mb-1">Alumno *</label>
                <select
                  required
                  value={form.alumnoId}
                  onChange={(e) => setForm((f) => ({ ...f, alumnoId: e.target.value }))}
                  className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
                >
                  <option value="">Seleccionar alumno...</option>
                  {alumnos.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.apellidoPaterno} {a.nombres}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo */}
              <div>
                <label className="block text-xs text-[#8899aa] mb-1">Tipo *</label>
                <select
                  required
                  value={form.tipo}
                  onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value as AnotacionForm['tipo'], gravedad: '' }))}
                  className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
                >
                  <option value="">Seleccionar tipo...</option>
                  <option value="POSITIVA">POSITIVA</option>
                  <option value="NEGATIVA">NEGATIVA</option>
                </select>
              </div>

              {/* Gravedad — only when NEGATIVA */}
              {form.tipo === 'NEGATIVA' && (
                <div>
                  <label className="block text-xs text-[#8899aa] mb-1">Gravedad *</label>
                  <select
                    required
                    value={form.gravedad}
                    onChange={(e) => setForm((f) => ({ ...f, gravedad: e.target.value as AnotacionForm['gravedad'] }))}
                    className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
                  >
                    <option value="">Seleccionar gravedad...</option>
                    <option value="LEVE">LEVE</option>
                    <option value="GRAVE">GRAVE</option>
                    <option value="GRAVISIMA">GRAVISIMA</option>
                  </select>
                </div>
              )}

              {/* Categoría */}
              <div>
                <label className="block text-xs text-[#8899aa] mb-1">Categoría *</label>
                <select
                  required
                  value={form.categoria}
                  onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
                >
                  <option value="">Seleccionar categoría...</option>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs text-[#8899aa] mb-1">Descripción *</label>
                <textarea
                  required
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                  className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#8899aa] focus:outline-none focus:border-[#3b82f6] resize-none"
                  placeholder="Describa la anotación..."
                />
              </div>

              {/* Fecha */}
              <div>
                <label className="block text-xs text-[#8899aa] mb-1">Fecha *</label>
                <input
                  type="date"
                  required
                  value={form.fecha}
                  onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                  className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6]"
                />
              </div>

              {formError && (
                <p className="text-xs text-[#ef4444] bg-[#ef4444]/10 border border-[#ef4444]/30 rounded-lg px-3 py-2">
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm text-[#8899aa] hover:text-white bg-[#0f1923] border border-[#2a3a4a] rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm text-white bg-[#3b82f6] hover:bg-[#2563eb] disabled:opacity-50 rounded-lg transition-colors"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
