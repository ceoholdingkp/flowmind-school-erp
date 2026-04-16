import React, { useEffect, useState, useMemo } from 'react';
import { Search, Filter, Download, Upload, RefreshCw, UserPlus, X, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../api/client';
import { exportToCSV, downloadFromAPI } from '../utils/export';

interface Alumno {
  id: string;
  run: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  estadoMatricula: string;
  esPIE: boolean;
  esPrioritario: boolean;
  esPreferente: boolean;
  curso?: { nombre: string };
  fechaMatricula?: string;
}

interface Curso {
  id: string;
  nombre: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

const EMPTY_FORM = {
  run: '',
  nombres: '',
  apellidoPaterno: '',
  apellidoMaterno: '',
  fechaNacimiento: '',
  genero: '' as '' | 'MASCULINO' | 'FEMENINO' | 'OTRO',
  cursoId: '',
  fechaMatricula: TODAY,
  numeroMatricula: '',
  esPIE: false,
  esPrioritario: false,
  esPreferente: false,
};

function NuevoAlumnoModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    api.get('/sistema/cursos').then((r) => setCursos(r.data ?? [])).catch(() => {});
  }, []);

  const set = (field: string, value: any) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => { const n = { ...e }; delete n[field]; return n; });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.run.trim()) e.run = 'El RUN es obligatorio';
    if (!form.nombres.trim()) e.nombres = 'Los nombres son obligatorios';
    if (!form.apellidoPaterno.trim()) e.apellidoPaterno = 'El apellido paterno es obligatorio';
    if (!form.apellidoMaterno.trim()) e.apellidoMaterno = 'El apellido materno es obligatorio';
    if (!form.fechaNacimiento) e.fechaNacimiento = 'La fecha de nacimiento es obligatoria';
    if (!form.genero) e.genero = 'El género es obligatorio';
    if (!form.fechaMatricula) e.fechaMatricula = 'La fecha de matrícula es obligatoria';
    if (!form.numeroMatricula) e.numeroMatricula = 'El N° de matrícula es obligatorio';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setSaving(true);
    setGlobalError('');
    try {
      await api.post('/alumnos', {
        run: form.run.trim(),
        nombres: form.nombres.trim(),
        apellidoPaterno: form.apellidoPaterno.trim(),
        apellidoMaterno: form.apellidoMaterno.trim(),
        fechaNacimiento: form.fechaNacimiento,
        genero: form.genero,
        ...(form.cursoId ? { cursoId: form.cursoId } : {}),
        fechaMatricula: form.fechaMatricula,
        numeroMatricula: Number(form.numeroMatricula),
        esPIE: form.esPIE,
        esPrioritario: form.esPrioritario,
        esPreferente: form.esPreferente,
      });
      onSuccess();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.error ?? 'Error al guardar el alumno';
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setGlobalError(typeof msg === 'string' ? msg : JSON.stringify(msg));
      }
    } finally {
      setSaving(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full bg-[#0f1923] border ${errors[field] ? 'border-red-500' : 'border-[#2a3a4a]'} rounded-lg px-3 py-2 text-sm text-white placeholder-[#8899aa] focus:outline-none focus:border-[#3b82f6]`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Nuevo Alumno</h2>
          <button onClick={onClose} className="text-[#8899aa] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {globalError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg px-3 py-2">{globalError}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#8899aa] mb-1">RUN <span className="text-red-400">*</span></label>
            <input value={form.run} onChange={(e) => set('run', e.target.value)} placeholder="12345678-9" className={inputCls('run')} />
            {errors.run && <p className="text-red-400 text-xs mt-1">{errors.run}</p>}
          </div>

          <div>
            <label className="block text-xs text-[#8899aa] mb-1">Nombres <span className="text-red-400">*</span></label>
            <input value={form.nombres} onChange={(e) => set('nombres', e.target.value)} placeholder="Nombres" className={inputCls('nombres')} />
            {errors.nombres && <p className="text-red-400 text-xs mt-1">{errors.nombres}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">Apellido Paterno <span className="text-red-400">*</span></label>
              <input value={form.apellidoPaterno} onChange={(e) => set('apellidoPaterno', e.target.value)} placeholder="Apellido Paterno" className={inputCls('apellidoPaterno')} />
              {errors.apellidoPaterno && <p className="text-red-400 text-xs mt-1">{errors.apellidoPaterno}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">Apellido Materno <span className="text-red-400">*</span></label>
              <input value={form.apellidoMaterno} onChange={(e) => set('apellidoMaterno', e.target.value)} placeholder="Apellido Materno" className={inputCls('apellidoMaterno')} />
              {errors.apellidoMaterno && <p className="text-red-400 text-xs mt-1">{errors.apellidoMaterno}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">Fecha de Nacimiento <span className="text-red-400">*</span></label>
              <input type="date" value={form.fechaNacimiento} onChange={(e) => set('fechaNacimiento', e.target.value)} className={inputCls('fechaNacimiento')} />
              {errors.fechaNacimiento && <p className="text-red-400 text-xs mt-1">{errors.fechaNacimiento}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">Género <span className="text-red-400">*</span></label>
              <select value={form.genero} onChange={(e) => set('genero', e.target.value)} className={inputCls('genero')}>
                <option value="">Seleccionar...</option>
                <option value="MASCULINO">MASCULINO</option>
                <option value="FEMENINO">FEMENINO</option>
                <option value="OTRO">OTRO</option>
              </select>
              {errors.genero && <p className="text-red-400 text-xs mt-1">{errors.genero}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs text-[#8899aa] mb-1">Curso</label>
            <select value={form.cursoId} onChange={(e) => set('cursoId', e.target.value)} className={inputCls('cursoId')}>
              <option value="">Sin curso asignado</option>
              {cursos.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">Fecha de Matrícula <span className="text-red-400">*</span></label>
              <input type="date" value={form.fechaMatricula} onChange={(e) => set('fechaMatricula', e.target.value)} className={inputCls('fechaMatricula')} />
              {errors.fechaMatricula && <p className="text-red-400 text-xs mt-1">{errors.fechaMatricula}</p>}
            </div>
            <div>
              <label className="block text-xs text-[#8899aa] mb-1">N° de Matrícula <span className="text-red-400">*</span></label>
              <input type="number" value={form.numeroMatricula} onChange={(e) => set('numeroMatricula', e.target.value)} placeholder="0" className={inputCls('numeroMatricula')} />
              {errors.numeroMatricula && <p className="text-red-400 text-xs mt-1">{errors.numeroMatricula}</p>}
            </div>
          </div>

          <div className="flex gap-5">
            {[
              { key: 'esPIE', label: 'PIE' },
              { key: 'esPrioritario', label: 'Prioritario' },
              { key: 'esPreferente', label: 'Preferente' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(form as any)[key]}
                  onChange={(e) => set(key, e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6]"
                />
                <span className="text-sm text-[#8899aa]">{label}</span>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-[#0f1923] border border-[#2a3a4a] text-[#8899aa] hover:text-white rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-sm bg-[#3b82f6] hover:bg-[#2563eb] text-white rounded-lg transition-colors disabled:opacity-60">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const ESTADO_COLOR: Record<string, string> = {
  ACTIVA: '#10b981',
  RETIRADO: '#ef4444',
  TRASLADADO: '#f59e0b',
  PENDIENTE: '#8b5cf6',
};

const ESTADOS = ['', 'ACTIVA', 'RETIRADO', 'TRASLADADO', 'PENDIENTE'];

type SortKey = 'run' | 'apellidoPaterno' | 'curso' | 'estadoMatricula' | 'fechaMatricula';
type SortDir = 'asc' | 'desc';

function SortTh({ label, sortKey, current, dir, onSort }: {
  label: string; sortKey: SortKey; current: SortKey | null; dir: SortDir; onSort: (k: SortKey) => void;
}) {
  const active = current === sortKey;
  return (
    <th
      className="text-left text-xs font-medium text-[#8899aa] uppercase tracking-wide px-4 py-3 cursor-pointer select-none hover:text-white transition-colors"
      onClick={() => onSort(sortKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (dir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />) : <ChevronDown size={11} className="opacity-30" />}
      </span>
    </th>
  );
}

export default function Matricula() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const LIMIT = 20;

  const load = async () => {
    setLoading(true);
    try {
      const params: any = { limit: LIMIT, offset: (page - 1) * LIMIT };
      if (q) params.q = q;
      if (estado) params.estadoMatricula = estado;
      const res = await api.get('/alumnos', { params });
      const d = res.data.data ?? res.data;
      setAlumnos(Array.isArray(d) ? d : d.alumnos ?? []);
      setTotal(res.data.meta?.total ?? res.data.total ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, estado]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const pages = Math.ceil(total / LIMIT) || 1;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return alumnos;
    return [...alumnos].sort((a, b) => {
      let aVal: string = '';
      let bVal: string = '';
      if (sortKey === 'run') { aVal = a.run; bVal = b.run; }
      else if (sortKey === 'apellidoPaterno') { aVal = a.apellidoPaterno; bVal = b.apellidoPaterno; }
      else if (sortKey === 'curso') { aVal = a.curso?.nombre ?? ''; bVal = b.curso?.nombre ?? ''; }
      else if (sortKey === 'estadoMatricula') { aVal = a.estadoMatricula; bVal = b.estadoMatricula; }
      else if (sortKey === 'fechaMatricula') { aVal = a.fechaMatricula ?? ''; bVal = b.fechaMatricula ?? ''; }
      const cmp = aVal.localeCompare(bVal, 'es');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [alumnos, sortKey, sortDir]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Matrícula</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">{total} alumnos registrados</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs bg-[#1a2332] border border-[#2a3a4a] text-[#8899aa] hover:text-white px-3 py-2 rounded-lg transition-colors">
            <Upload size={13} /> Importar Excel
          </button>
          <button
            onClick={() => exportToCSV(
              alumnos.map((a) => ({
                RUN: a.run,
                Nombres: a.nombres,
                'Apellido Paterno': a.apellidoPaterno,
                'Apellido Materno': a.apellidoMaterno,
                Curso: a.curso?.nombre ?? '',
                Estado: a.estadoMatricula,
                PIE: a.esPIE ? 'Sí' : 'No',
                Prioritario: a.esPrioritario ? 'Sí' : 'No',
                Preferente: a.esPreferente ? 'Sí' : 'No',
                'F. Matrícula': a.fechaMatricula ? new Date(a.fechaMatricula).toLocaleDateString('es-CL') : '',
              })),
              'alumnos',
            )}
            className="flex items-center gap-1.5 text-xs bg-[#10b981] hover:bg-[#059669] text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={13} /> Exportar Excel
          </button>
          <button
            onClick={() => downloadFromAPI('/alumnos/exportar-sige', 'alumnos-sige.xlsx')}
            className="flex items-center gap-1.5 text-xs bg-[#1a2332] border border-[#2a3a4a] text-[#8899aa] hover:text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={13} /> Exportar SIGE
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 text-xs bg-[#3b82f6] hover:bg-[#2563eb] text-white px-3 py-2 rounded-lg transition-colors">
            <UserPlus size={13} /> Nuevo Alumno
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4">
        <form onSubmit={handleSearch} className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por nombre, RUN..."
              className="w-full bg-[#0f1923] border border-[#2a3a4a] rounded-lg pl-8 pr-3 py-2 text-sm text-white placeholder-[#8899aa] focus:outline-none focus:border-[#3b82f6]"
            />
          </div>
          <div className="relative">
            <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8899aa]" />
            <select
              value={estado}
              onChange={(e) => { setEstado(e.target.value); setPage(1); }}
              className="bg-[#0f1923] border border-[#2a3a4a] rounded-lg pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#3b82f6] appearance-none"
            >
              {ESTADOS.map((e) => <option key={e} value={e}>{e || 'Todos los estados'}</option>)}
            </select>
          </div>
          <button type="submit" className="bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm px-4 py-2 rounded-lg transition-colors">
            Buscar
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a3a4a]">
                <SortTh label="RUN" sortKey="run" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Nombre" sortKey="apellidoPaterno" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Curso" sortKey="curso" current={sortKey} dir={sortDir} onSort={handleSort} />
                <SortTh label="Estado" sortKey="estadoMatricula" current={sortKey} dir={sortDir} onSort={handleSort} />
                <th className="text-left text-xs font-medium text-[#8899aa] uppercase tracking-wide px-4 py-3">Etiquetas</th>
                <SortTh label="F. Matrícula" sortKey="fechaMatricula" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#8899aa]">
                  <RefreshCw className="animate-spin inline mr-2" size={16} /> Cargando...
                </td></tr>
              ) : sorted.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-[#8899aa]">Sin resultados</td></tr>
              ) : sorted.map((a) => (
                <tr key={a.id} className="border-b border-[#2a3a4a] hover:bg-[#0f1923] transition-colors">
                  <td className="px-4 py-3 text-[#8899aa] font-mono text-xs">{a.run}</td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{a.apellidoPaterno} {a.apellidoMaterno}</span>
                    <span className="text-[#8899aa] ml-1">{a.nombres}</span>
                  </td>
                  <td className="px-4 py-3 text-[#8899aa]">{a.curso?.nombre ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                      backgroundColor: (ESTADO_COLOR[a.estadoMatricula] ?? 'var(--muted)') + '20',
                      color: ESTADO_COLOR[a.estadoMatricula] ?? 'var(--muted)',
                    }}>
                      {a.estadoMatricula}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {a.esPIE && <span className="px-1.5 py-0.5 bg-[#8b5cf6]/20 text-[#8b5cf6] rounded text-[10px] font-medium">PIE</span>}
                      {a.esPrioritario && <span className="px-1.5 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded text-[10px] font-medium">PRI</span>}
                      {a.esPreferente && <span className="px-1.5 py-0.5 bg-[#06b6d4]/20 text-[#06b6d4] rounded text-[10px] font-medium">PRE</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[#8899aa] text-xs">
                    {a.fechaMatricula ? new Date(a.fechaMatricula).toLocaleDateString('es-CL') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#2a3a4a]">
          <span className="text-xs text-[#8899aa]">Página {page} de {pages} · {total} resultados</span>
          <div className="flex gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 text-xs rounded border border-[#2a3a4a] text-[#8899aa] hover:text-white disabled:opacity-40 transition-colors">
              ← Anterior
            </button>
            <button disabled={page >= pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 text-xs rounded border border-[#2a3a4a] text-[#8899aa] hover:text-white disabled:opacity-40 transition-colors">
              Siguiente →
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <NuevoAlumnoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); setPage(1); load(); }}
        />
      )}
    </div>
  );
}
