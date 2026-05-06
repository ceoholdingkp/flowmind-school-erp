import React, { useState, useEffect } from 'react';
import {
  CheckCircle, Clock, Shield, X, KeyRound, Calendar, ChevronLeft, ChevronRight,
} from 'lucide-react';
import api from '../../api/client';

interface Curso {
  id: string;
  nombre: string;
  nivel: string;
  docenteJefe: { id: string; nombres: string; apellidos: string; run: string } | null;
  pendiente: boolean;
  firmas: { ASISTENCIA: boolean; CLASE: boolean; EVALUACION: boolean };
}

interface FirmaHistorial {
  id: string;
  fecha: string;
  tipo: string;
  otpValidado: boolean;
  funcionario: { nombres: string; apellidos: string; run: string };
  curso: { nombre: string; nivel: string };
}

export default function FirmaDigital() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [historial, setHistorial] = useState<FirmaHistorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'hoy' | 'historial'>('hoy');

  // OTP Modal
  const [modal, setModal] = useState<{ cursoId: string; cursoNombre: string; tipo: string; funcionarioId: string } | null>(null);
  const [otp, setOtp] = useState('');
  const [rut, setRut] = useState('');
  const [firmando, setFirmando] = useState(false);
  const [firmaError, setFirmaError] = useState('');

  const now = new Date();
  const [mesFiltro, setMesFiltro] = useState(now.getMonth() + 1);
  const [anioFiltro] = useState(now.getFullYear());

  useEffect(() => {
    loadCursos();
  }, []);

  useEffect(() => {
    if (tab === 'historial') loadHistorial();
  }, [tab, mesFiltro]);

  async function loadCursos() {
    setLoading(true);
    try {
      const res = await api.get('/ede/cursos/pendientes');
      setCursos(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function loadHistorial() {
    try {
      const res = await api.get('/ede/firmas/mes', {
        params: { mes: mesFiltro, anio: anioFiltro },
      });
      setHistorial(res.data);
    } catch (e) { console.error(e); }
  }

  function openModal(curso: Curso, tipo: 'ASISTENCIA' | 'CLASE' | 'EVALUACION') {
    setModal({
      cursoId: curso.id,
      cursoNombre: curso.nombre,
      tipo,
      funcionarioId: curso.docenteJefe?.id ?? '',
    });
    setOtp('');
    setRut(curso.docenteJefe?.run ?? '');
    setFirmaError('');
  }

  async function submitFirma() {
    if (!modal || otp.length < 6) return;
    setFirmando(true);
    setFirmaError('');
    try {
      await api.post('/ede/firma-otp', {
        rut,
        otp,
        cursoId: modal.cursoId,
        tipo: modal.tipo,
        funcionarioId: modal.funcionarioId,
      });
      setModal(null);
      loadCursos();
      if (tab === 'historial') loadHistorial();
    } catch (e: any) {
      setFirmaError(e?.response?.data?.error?.message ?? 'Error al firmar');
    } finally {
      setFirmando(false);
    }
  }

  const TIPO_LABELS: Record<string, string> = {
    ASISTENCIA: 'Asistencia',
    CLASE: 'Clase',
    EVALUACION: 'Evaluación',
  };

  const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  const pendientes = cursos.filter((c) => c.pendiente).length;
  const firmados = cursos.filter((c) => !c.pendiente).length;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Shield size={24} style={{ color: '#8b5cf6' }} />
            Firma Digital — Libro de Clases
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <div className="flex items-center gap-1.5" style={{ color: '#10b981' }}>
            <CheckCircle size={14} /> {firmados} firmados
          </div>
          <div className="flex items-center gap-1.5" style={{ color: '#f59e0b' }}>
            <Clock size={14} /> {pendientes} pendientes
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg w-fit"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}>
        {(['hoy', 'historial'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 rounded-md text-sm transition-colors"
            style={tab === t ? { background: '#8b5cf6', color: '#fff' } : { color: 'var(--muted)' }}
          >
            {t === 'hoy' ? 'Tabla del día' : 'Historial del mes'}
          </button>
        ))}
      </div>

      {/* Tabla del día */}
      {tab === 'hoy' && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Curso</th>
                <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Docente Jefe</th>
                <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--muted)' }}>Asistencia</th>
                <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--muted)' }}>Clase</th>
                <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--muted)' }}>Evaluación</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(5)].map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-5 rounded animate-pulse" style={{ background: 'var(--nav-hover)' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : cursos.map((c) => (
                <tr
                  key={c.id}
                  style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{c.nombre}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{c.nivel}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                    {c.docenteJefe
                      ? `${c.docenteJefe.nombres} ${c.docenteJefe.apellidos}`
                      : <span style={{ color: '#f59e0b' }}>Sin asignar</span>}
                  </td>
                  {(['ASISTENCIA', 'CLASE', 'EVALUACION'] as const).map((tipo) => (
                    <td key={tipo} className="px-4 py-3 text-center">
                      {c.firmas[tipo] ? (
                        <CheckCircle size={18} className="mx-auto" style={{ color: '#10b981' }} />
                      ) : c.docenteJefe ? (
                        <button
                          onClick={() => openModal(c, tipo)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium"
                          style={{ background: '#8b5cf622', color: '#8b5cf6' }}
                        >
                          <KeyRound size={11} />
                          Firmar
                        </button>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Historial */}
      {tab === 'historial' && (
        <div className="space-y-4">
          {/* Month selector */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMesFiltro((m) => m === 1 ? 12 : m - 1)}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {MESES[mesFiltro - 1]} {anioFiltro}
            </span>
            <button
              onClick={() => setMesFiltro((m) => m === 12 ? 1 : m + 1)}
              className="p-1.5 rounded-lg"
              style={{ color: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              <ChevronRight size={16} />
            </button>
            <span className="text-xs" style={{ color: 'var(--muted)' }}>
              {historial.length} firma{historial.length !== 1 ? 's' : ''}
            </span>
          </div>

          {historial.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay firmas este mes</p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ border: '1px solid var(--border)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)' }}>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Fecha</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Curso</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Docente</th>
                    <th className="px-4 py-3 text-left font-medium" style={{ color: 'var(--muted)' }}>Tipo</th>
                    <th className="px-4 py-3 text-center font-medium" style={{ color: 'var(--muted)' }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {historial.map((f) => (
                    <tr
                      key={f.id}
                      style={{ borderTop: '1px solid var(--border)', background: 'var(--card)' }}
                    >
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
                        {new Date(f.fecha).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {f.curso.nombre}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--muted)' }}>
                        {f.funcionario.nombres} {f.funcionario.apellidos}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#8b5cf622', color: '#8b5cf6' }}
                        >
                          {TIPO_LABELS[f.tipo] ?? f.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <CheckCircle size={16} className="mx-auto" style={{ color: '#10b981' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* OTP Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                  Firmar con OTP
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {modal.cursoNombre} · {TIPO_LABELS[modal.tipo]}
                </p>
              </div>
              <button onClick={() => setModal(null)} style={{ color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>RUT DOCENTE</label>
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12345678-9"
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                  CÓDIGO OTP (6 dígitos)
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-center tracking-[0.5em] font-mono text-xl"
                  style={{
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && submitFirma()}
                />
                <p className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>
                  Ingrese el código de su app OTP Mineduc · En dev use 123456
                </p>
              </div>
            </div>

            {firmaError && (
              <div className="p-3 rounded-lg text-sm" style={{ background: '#dc262611', color: '#dc2626' }}>
                {firmaError}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setModal(null)}
                className="flex-1 py-2.5 rounded-lg text-sm"
                style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
              >
                Cancelar
              </button>
              <button
                onClick={submitFirma}
                disabled={firmando || otp.length < 6}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2"
                style={{ background: firmando || otp.length < 6 ? '#94a3b8' : '#8b5cf6' }}
              >
                <Shield size={14} />
                {firmando ? 'Firmando...' : 'Firmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
