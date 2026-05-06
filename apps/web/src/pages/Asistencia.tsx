import React, { useEffect, useState } from 'react';
import { Save, RefreshCw, CheckCircle, XCircle, Clock, FileText, Download, Loader2 } from 'lucide-react';
import api from '../api/client';
import { exportToCSV } from '../utils/export';
import { useToastStore } from '../store/toast.store';

interface Curso { id: string; nombre: string; nivel: string; letra: string; }
interface Alumno { id: string; run: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string; }
type EstadoA = 'PRESENTE' | 'AUSENTE' | 'ATRASO' | 'JUSTIFICADO' | '';

const ESTADO_OPTS = [
  { key: 'PRESENTE', label: 'P', color: '#10b981', icon: <CheckCircle size={14} /> },
  { key: 'AUSENTE', label: 'A', color: '#ef4444', icon: <XCircle size={14} /> },
  { key: 'ATRASO', label: 'T', color: '#f59e0b', icon: <Clock size={14} /> },
  { key: 'JUSTIFICADO', label: 'J', color: '#8b5cf6', icon: <FileText size={14} /> },
] as const;

export default function Asistencia() {
  const toast = useToastStore();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [cursoId, setCursoId] = useState('');
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [estados, setEstados] = useState<Record<string, EstadoA>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    api.get('/alumnos/cursos').then((r) => {
      const data = r.data.data ?? r.data;
      setCursos(Array.isArray(data) ? data : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!cursoId) return;
    setLoading(true);
    api.get('/alumnos', { params: { cursoId, estadoMatricula: 'ACTIVA', limit: 100 } })
      .then((r) => {
        const data = r.data.data ?? r.data;
        const list: Alumno[] = Array.isArray(data) ? data : data.alumnos ?? [];
        setAlumnos(list);
        setEstados(Object.fromEntries(list.map((a) => [a.id, ''])));
      })
      .finally(() => setLoading(false));
  }, [cursoId]);

  const toggle = (id: string, estado: EstadoA) => {
    setEstados((prev) => ({ ...prev, [id]: prev[id] === estado ? '' : estado }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const registros = alumnos.map((a) => ({
        alumnoId: a.id,
        cursoId,
        fecha: today,
        estado: estados[a.id] || 'PRESENTE',
      }));
      await api.post('/asistencia/bulk', { registros });
      setSaved(true);
      toast.success('Asistencia guardada exitosamente');
      setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message ?? 'Error al guardar la asistencia');
    } finally {
      setSaving(false);
    }
  };

  const totals = {
    P: Object.values(estados).filter((e) => e === 'PRESENTE').length,
    A: Object.values(estados).filter((e) => e === 'AUSENTE').length,
    T: Object.values(estados).filter((e) => e === 'ATRASO').length,
    J: Object.values(estados).filter((e) => e === 'JUSTIFICADO').length,
    total: alumnos.length,
  };
  const pct = totals.total > 0 ? Math.round(((totals.P + totals.T) / totals.total) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Asistencia</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">{today}</p>
        </div>
        {cursoId && alumnos.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => exportToCSV(
                alumnos.map((a) => ({
                  RUN: a.run,
                  Nombres: a.nombres,
                  'Apellido Paterno': a.apellidoPaterno,
                  'Apellido Materno': a.apellidoMaterno,
                  Fecha: today,
                  Estado: estados[a.id] || 'PRESENTE',
                })),
                `asistencia-${today}`,
              )}
              className="flex items-center gap-2 bg-[#1a2332] border border-[#2a3a4a] hover:border-[#3b82f6] text-[#8899aa] hover:text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              <Download size={14} /> Exportar Excel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] disabled:opacity-60 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saved ? '¡Guardado!' : 'Guardar registro'}
            </button>
          </div>
        )}
      </div>

      {/* Selector curso */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4">
        <label className="block text-xs font-medium text-[#8899aa] mb-2">Seleccionar curso</label>
        <select
          value={cursoId}
          onChange={(e) => setCursoId(e.target.value)}
          className="bg-[#0f1923] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] min-w-48"
        >
          <option value="">— Elige un curso —</option>
          {cursos.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </div>

      {/* Dashboard stats */}
      {cursoId && alumnos.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Asistencia', val: `${pct}%`, color: pct >= 85 ? '#10b981' : pct >= 70 ? '#f59e0b' : '#ef4444' },
            { label: 'Presentes', val: totals.P, color: '#10b981' },
            { label: 'Ausentes', val: totals.A, color: '#ef4444' },
            { label: 'Atrasos', val: totals.T, color: '#f59e0b' },
            { label: 'Justificados', val: totals.J, color: '#8b5cf6' },
          ].map((s) => (
            <div key={s.label} className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4 text-center">
              <div className="text-2xl font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-xs text-[#8899aa] mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Alumno list */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-[#8899aa]">
          <RefreshCw className="animate-spin mr-2" size={16} /> Cargando alumnos...
        </div>
      ) : !cursoId ? (
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-12 text-center text-[#8899aa]">
          Selecciona un curso para comenzar el registro
        </div>
      ) : alumnos.length === 0 ? (
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-12 text-center text-[#8899aa]">
          No hay alumnos activos en este curso
        </div>
      ) : (
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3a4a]">
                <th className="text-left text-xs text-[#8899aa] uppercase px-4 py-3">#</th>
                <th className="text-left text-xs text-[#8899aa] uppercase px-4 py-3">Alumno</th>
                <th className="text-left text-xs text-[#8899aa] uppercase px-4 py-3">RUN</th>
                <th className="text-center text-xs text-[#8899aa] uppercase px-4 py-3 col-span-4">Asistencia</th>
              </tr>
            </thead>
            <tbody>
              {alumnos.map((a, i) => (
                <tr key={a.id} className="border-b border-[#2a3a4a] hover:bg-[#0f1923] transition-colors">
                  <td className="px-4 py-2.5 text-[#8899aa] text-xs">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-white">{a.apellidoPaterno} {a.apellidoMaterno},</span>
                    <span className="text-[#8899aa] ml-1 text-xs">{a.nombres}</span>
                  </td>
                  <td className="px-4 py-2.5 text-[#8899aa] font-mono text-xs">{a.run}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5 justify-center">
                      {ESTADO_OPTS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => toggle(a.id, opt.key as EstadoA)}
                          className="w-9 h-9 rounded-lg text-xs font-bold flex items-center justify-center transition-all"
                          style={{
                            backgroundColor: estados[a.id] === opt.key ? opt.color + '30' : 'var(--bg)',
                            color: estados[a.id] === opt.key ? opt.color : 'var(--muted)',
                            border: `1px solid ${estados[a.id] === opt.key ? opt.color : 'var(--border)'}`,
                          }}
                          title={opt.key}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
