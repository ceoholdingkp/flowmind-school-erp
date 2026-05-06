import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Search, AlertCircle } from 'lucide-react';
import api from '../../api/client';

type Step = 1 | 2 | 3 | 4;

const STEPS = [
  { num: 1, label: 'Datos del Alumno' },
  { num: 2, label: 'Apoderado Titular' },
  { num: 3, label: 'Matrícula' },
  { num: 4, label: 'Confirmación' },
];

const GENEROS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'OTRO', label: 'Otro' },
];

const NIVELES = [
  'Pre-Kinder', 'Kinder',
  '1° Básico', '2° Básico', '3° Básico', '4° Básico',
  '5° Básico', '6° Básico', '7° Básico', '8° Básico',
  '1° Medio', '2° Medio', '3° Medio', '4° Medio',
];

function validarRut(rut: string): boolean {
  const cleaned = rut.replace(/[.\-]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(cleaned)) return false;
  const digits = cleaned.slice(0, -1);
  const dv = cleaned.slice(-1);
  let sum = 0, mul = 2;
  for (let i = digits.length - 1; i >= 0; i--) {
    sum += parseInt(digits[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return dv === expected;
}

export default function NuevaMatricula() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [cursos, setCursos] = useState<any[]>([]);

  // Paso 1 — Alumno
  const [runBusqueda, setRunBusqueda] = useState('');
  const [runValido, setRunValido] = useState<boolean | null>(null);
  const [alumnoExistente, setAlumnoExistente] = useState<any>(null);
  const [buscandoAlumno, setBuscandoAlumno] = useState(false);
  const [alumnoForm, setAlumnoForm] = useState({
    run: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
    fechaNacimiento: '', genero: 'MASCULINO', direccion: '', comuna: '', telefono: '', email: '',
  });

  // Paso 2 — Apoderado
  const [apodRun, setApodRun] = useState('');
  const [apodRunValido, setApodRunValido] = useState<boolean | null>(null);
  const [apodExistente, setApodExistente] = useState<any>(null);
  const [apodForm, setApodForm] = useState({
    run: '', nombres: '', apellidoPaterno: '', apellidoMaterno: '',
    telefono: '', email: '', ocupacion: '', parentesco: 'Madre',
  });

  // Paso 3 — Matrícula
  const [matForm, setMatForm] = useState({
    cursoId: '', nivel: '', curso: '',
    prioritario: false, preferente: false, pie: false, pieDiagnostico: '',
    procedencia: '', becaPorcentaje: 0, repitente: false,
  });

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/sistema/cursos', { params: { anio: 2026 } })
      .then(r => setCursos(r.data.data ?? []))
      .catch(() => {});
  }, []);

  // RUT validation paso 1
  const handleRunChange = (v: string) => {
    setRunBusqueda(v);
    const cleaned = v.replace(/[.\-]/g, '').toUpperCase();
    if (cleaned.length >= 8) setRunValido(validarRut(v));
    else setRunValido(null);
    setAlumnoExistente(null);
  };

  const buscarAlumno = async () => {
    if (!runValido) return;
    setBuscandoAlumno(true);
    try {
      const r = await api.get('/alumnos', { params: { q: runBusqueda, limit: 1 } });
      const found = r.data.data?.[0];
      if (found && found.run.replace(/[.\-]/g, '').toUpperCase() === runBusqueda.replace(/[.\-]/g, '').toUpperCase()) {
        setAlumnoExistente(found);
        setAlumnoForm({
          run: found.run,
          nombres: found.nombres,
          apellidoPaterno: found.apellidoPaterno,
          apellidoMaterno: found.apellidoMaterno,
          fechaNacimiento: found.fechaNacimiento ? found.fechaNacimiento.split('T')[0] : '',
          genero: found.genero ?? 'MASCULINO',
          direccion: found.direccion ?? '',
          comuna: found.comuna ?? '',
          telefono: found.telefono ?? '',
          email: found.email ?? '',
        });
      } else {
        setAlumnoExistente(null);
        setAlumnoForm(f => ({ ...f, run: runBusqueda }));
      }
    } catch {
      setAlumnoExistente(null);
    } finally {
      setBuscandoAlumno(false);
    }
  };

  // RUT validation paso 2
  const handleApodRunChange = (v: string) => {
    setApodRun(v);
    const cleaned = v.replace(/[.\-]/g, '').toUpperCase();
    if (cleaned.length >= 8) setApodRunValido(validarRut(v));
    else setApodRunValido(null);
    setApodExistente(null);
  };

  const buscarApoderado = async () => {
    if (!apodRunValido) return;
    try {
      const r = await api.get('/apoderados', { params: { q: apodRun, limit: 1 } });
      const found = r.data.data?.[0];
      if (found && found.run.replace(/[.\-]/g, '').toUpperCase() === apodRun.replace(/[.\-]/g, '').toUpperCase()) {
        setApodExistente(found);
        setApodForm({
          run: found.run,
          nombres: found.nombres,
          apellidoPaterno: found.apellidoPaterno ?? found.apellidos?.split(' ')[0] ?? '',
          apellidoMaterno: found.apellidoMaterno ?? found.apellidos?.split(' ')[1] ?? '',
          telefono: found.telefono ?? '',
          email: found.email ?? '',
          ocupacion: found.ocupacion ?? '',
          parentesco: found.parentesco ?? 'Madre',
        });
      } else {
        setApodExistente(null);
        setApodForm(f => ({ ...f, run: apodRun }));
      }
    } catch {}
  };

  const handleCursoChange = (cursoId: string) => {
    const curso = cursos.find(c => c.id === cursoId);
    setMatForm(f => ({ ...f, cursoId, nivel: curso?.nivel ?? '', curso: curso?.nombre.replace(/\s/g,'').replace('°','') ?? '' }));
  };

  const canGoNext = () => {
    if (step === 1) return alumnoForm.run && alumnoForm.nombres && alumnoForm.apellidoPaterno && alumnoForm.fechaNacimiento;
    if (step === 2) return apodForm.run && apodForm.nombres && apodForm.telefono;
    if (step === 3) return matForm.nivel;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      // 1. Create/get alumno
      let alumnoId = alumnoExistente?.id;
      if (!alumnoId) {
        const alumnoR = await api.post('/alumnos', {
          ...alumnoForm,
          run: alumnoForm.run,
          fechaMatricula: new Date().toISOString().split('T')[0],
          numeroMatricula: 9999, // temporary — could auto-assign
        });
        alumnoId = alumnoR.data.data.id;
      }

      // 2. Create/get apoderado and link
      let apodId = apodExistente?.id;
      if (!apodId) {
        const apodR = await api.post('/apoderados', apodForm);
        apodId = apodR.data.data.id;
      }
      // Link apoderado → alumno
      try {
        await api.post(`/alumnos/${alumnoId}/apoderados`, {
          run: apodForm.run,
          nombres: apodForm.nombres,
          apellidos: `${apodForm.apellidoPaterno} ${apodForm.apellidoMaterno}`,
          telefono: apodForm.telefono,
          email: apodForm.email,
          ocupacion: apodForm.ocupacion,
          parentesco: apodForm.parentesco,
          esTitular: true,
        });
      } catch {}

      // 3. Create matricula
      const matR = await api.post('/matriculas', {
        alumnoId,
        anio: 2026,
        curso: matForm.curso || matForm.nivel,
        nivel: matForm.nivel,
        cursoId: matForm.cursoId || undefined,
        prioritario: matForm.prioritario,
        preferente: matForm.preferente,
        pie: matForm.pie,
        pieDiagnostico: matForm.pieDiagnostico || undefined,
        procedencia: matForm.procedencia || undefined,
        becaPorcentaje: matForm.becaPorcentaje,
        repitente: matForm.repitente,
      });

      setResultado({ alumnoId, matriculaId: matR.data.data.id });
      setStep(4);
    } catch (e: any) {
      setError(e?.response?.data?.error?.message ?? 'Error al procesar matrícula');
    } finally {
      setSubmitting(false);
    }
  };

  const Field = ({ label, value, onChange, type = 'text', required = false }: {
    label: string; value: string; onChange: (v: string) => void;
    type?: string; required?: boolean;
  }) => (
    <div>
      <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>
        {label}{required && <span style={{ color: '#ef4444' }}> *</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} required={required}
        style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
          background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
    </div>
  );

  return (
    <div style={{ padding: '1.5rem', maxWidth: 760 }}>
      {/* Back */}
      <button onClick={() => navigate('/matricula/alumnos')}
        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
          padding: '0.35rem 0.7rem', cursor: 'pointer', color: 'var(--muted)', display: 'flex',
          alignItems: 'center', gap: 4, marginBottom: '1.5rem', fontSize: '0.875rem' }}>
        <ArrowLeft size={14} /> Volver
      </button>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 1.5rem', color: 'var(--text-primary)' }}>
        Nueva Matrícula
      </h1>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: '2rem', overflowX: 'auto' }}>
        {STEPS.map((s, i) => (
          <React.Fragment key={s.num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 100 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '0.875rem',
                background: step > s.num ? '#16a34a' : step === s.num ? 'var(--accent,#6366f1)' : 'var(--border)',
                color: step >= s.num ? '#fff' : 'var(--muted)',
              }}>
                {step > s.num ? <Check size={14} /> : s.num}
              </div>
              <div style={{ fontSize: '0.72rem', marginTop: 4, color: step === s.num ? 'var(--accent,#6366f1)' : 'var(--muted)',
                fontWeight: step === s.num ? 700 : 400, textAlign: 'center', maxWidth: 90 }}>
                {s.label}
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: step > s.num ? '#16a34a' : 'var(--border)', marginTop: 16, alignSelf: 'flex-start', minWidth: 20 }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step 1 — Alumno */}
      {step === 1 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Paso 1: Datos del Alumno</h3>
          {/* RUN search */}
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>
              RUN del alumno <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input value={runBusqueda} onChange={e => handleRunChange(e.target.value)}
                  placeholder="12345678-9"
                  style={{ width: '100%', padding: '0.45rem 0.6rem', border: `1px solid ${runValido === false ? '#ef4444' : runValido ? '#16a34a' : 'var(--border)'}`,
                    borderRadius: 5, background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                {runValido === false && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>RUN inválido</div>}
                {runValido === true && <div style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: 2 }}>RUN válido ✓</div>}
              </div>
              <button onClick={buscarAlumno} disabled={!runValido || buscandoAlumno}
                style={{ padding: '0.45rem 1rem', background: 'var(--accent,#6366f1)', color: '#fff',
                  border: 'none', borderRadius: 5, cursor: runValido ? 'pointer' : 'not-allowed',
                  opacity: runValido ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={14} /> {buscandoAlumno ? '...' : 'Buscar'}
              </button>
            </div>
            {alumnoExistente && (
              <div style={{ marginTop: 8, padding: '0.5rem', background: '#dbeafe', borderRadius: 5, fontSize: '0.85rem', color: '#1d4ed8' }}>
                Alumno encontrado: <strong>{alumnoExistente.nombres} {alumnoExistente.apellidoPaterno}</strong> — datos precargados
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <Field label="Nombres" value={alumnoForm.nombres} onChange={v => setAlumnoForm(f => ({ ...f, nombres: v }))} required />
            <Field label="Apellido Paterno" value={alumnoForm.apellidoPaterno} onChange={v => setAlumnoForm(f => ({ ...f, apellidoPaterno: v }))} required />
            <Field label="Apellido Materno" value={alumnoForm.apellidoMaterno} onChange={v => setAlumnoForm(f => ({ ...f, apellidoMaterno: v }))} />
            <Field label="Fecha de Nacimiento" value={alumnoForm.fechaNacimiento} onChange={v => setAlumnoForm(f => ({ ...f, fechaNacimiento: v }))} type="date" required />
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Género <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={alumnoForm.genero} onChange={e => setAlumnoForm(f => ({ ...f, genero: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5, background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem' }}>
                {GENEROS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
            <Field label="Dirección" value={alumnoForm.direccion} onChange={v => setAlumnoForm(f => ({ ...f, direccion: v }))} />
            <Field label="Comuna" value={alumnoForm.comuna} onChange={v => setAlumnoForm(f => ({ ...f, comuna: v }))} />
            <Field label="Teléfono" value={alumnoForm.telefono} onChange={v => setAlumnoForm(f => ({ ...f, telefono: v }))} />
            <Field label="Email" value={alumnoForm.email} onChange={v => setAlumnoForm(f => ({ ...f, email: v }))} type="email" />
          </div>
        </div>
      )}

      {/* Step 2 — Apoderado */}
      {step === 2 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Paso 2: Apoderado Titular</h3>
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 4 }}>RUN del Apoderado <span style={{ color: '#ef4444' }}>*</span></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <input value={apodRun} onChange={e => handleApodRunChange(e.target.value)} placeholder="12345678-9"
                  style={{ width: '100%', padding: '0.45rem 0.6rem', border: `1px solid ${apodRunValido === false ? '#ef4444' : apodRunValido ? '#16a34a' : 'var(--border)'}`,
                    borderRadius: 5, background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                {apodRunValido === false && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 2 }}>RUN inválido</div>}
              </div>
              <button onClick={buscarApoderado} disabled={!apodRunValido}
                style={{ padding: '0.45rem 1rem', background: 'var(--accent,#6366f1)', color: '#fff',
                  border: 'none', borderRadius: 5, cursor: apodRunValido ? 'pointer' : 'not-allowed',
                  opacity: apodRunValido ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Search size={14} /> Buscar
              </button>
            </div>
            {apodExistente && (
              <div style={{ marginTop: 8, padding: '0.5rem', background: '#dbeafe', borderRadius: 5, fontSize: '0.85rem', color: '#1d4ed8' }}>
                Apoderado encontrado: <strong>{apodExistente.nombres} {apodExistente.apellidos}</strong> — datos precargados
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <Field label="Nombres" value={apodForm.nombres} onChange={v => setApodForm(f => ({ ...f, nombres: v }))} required />
            <Field label="Apellido Paterno" value={apodForm.apellidoPaterno} onChange={v => setApodForm(f => ({ ...f, apellidoPaterno: v }))} required />
            <Field label="Apellido Materno" value={apodForm.apellidoMaterno} onChange={v => setApodForm(f => ({ ...f, apellidoMaterno: v }))} />
            <Field label="Teléfono" value={apodForm.telefono} onChange={v => setApodForm(f => ({ ...f, telefono: v }))} required />
            <Field label="Email" value={apodForm.email} onChange={v => setApodForm(f => ({ ...f, email: v }))} type="email" />
            <Field label="Ocupación" value={apodForm.ocupacion} onChange={v => setApodForm(f => ({ ...f, ocupacion: v }))} />
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Parentesco</label>
              <select value={apodForm.parentesco} onChange={e => setApodForm(f => ({ ...f, parentesco: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                  background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem' }}>
                {['Madre','Padre','Abuelo/a','Tío/a','Tutor legal','Otro'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 3 — Matrícula */}
      {step === 3 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)' }}>Paso 3: Datos de Matrícula</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Curso <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={matForm.cursoId} onChange={e => handleCursoChange(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                  background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem' }}>
                <option value="">Seleccionar curso...</option>
                {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Nivel <span style={{ color: '#ef4444' }}>*</span></label>
              <select value={matForm.nivel} onChange={e => setMatForm(f => ({ ...f, nivel: e.target.value }))}
                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                  background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem' }}>
                <option value="">Seleccionar nivel...</option>
                {NIVELES.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            <Field label="Colegio de Procedencia" value={matForm.procedencia} onChange={v => setMatForm(f => ({ ...f, procedencia: v }))} />
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Beca (%)</label>
              <input type="number" min="0" max="100" value={matForm.becaPorcentaje}
                onChange={e => setMatForm(f => ({ ...f, becaPorcentaje: parseInt(e.target.value) || 0 }))}
                style={{ width: '100%', padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                  background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            {[
              { key: 'prioritario', label: 'Alumno Prioritario (SEP)' },
              { key: 'preferente', label: 'Alumno Preferente (SEP)' },
              { key: 'pie', label: 'Integración Escolar (PIE)' },
              { key: 'repitente', label: 'Repitente' },
            ].map(f => (
              <label key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input type="checkbox" checked={(matForm as any)[f.key]}
                  onChange={e => setMatForm(p => ({ ...p, [f.key]: e.target.checked }))} />
                {f.label}
              </label>
            ))}
          </div>
          {matForm.pie && (
            <div style={{ marginTop: '0.75rem' }}>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Diagnóstico PIE</label>
              <input value={matForm.pieDiagnostico} onChange={e => setMatForm(f => ({ ...f, pieDiagnostico: e.target.value }))}
                placeholder="TEL, DEA, DI, TEA, TDAH..."
                style={{ width: 300, padding: '0.45rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                  background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Confirmación / Éxito */}
      {step === 4 && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '2rem', textAlign: 'center' }}>
          {resultado ? (
            <>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex',
                alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <Check size={28} color="#16a34a" />
              </div>
              <h3 style={{ color: '#16a34a', marginBottom: 8 }}>Matrícula registrada exitosamente</h3>
              <p style={{ color: 'var(--muted)', marginBottom: '1.5rem' }}>
                Alumno: <strong>{alumnoForm.nombres} {alumnoForm.apellidoPaterno}</strong><br />
                Curso: <strong>{matForm.nivel}</strong> · Año 2026
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button onClick={() => navigate(`/matricula/alumnos/${resultado.alumnoId}`)}
                  style={{ padding: '0.5rem 1.2rem', background: 'var(--accent,#6366f1)', color: '#fff',
                    border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}>
                  Ver ficha del alumno
                </button>
                <button onClick={() => { setStep(1); setResultado(null); setAlumnoExistente(null); setRunBusqueda(''); }}
                  style={{ padding: '0.5rem 1.2rem', background: 'transparent', border: '1px solid var(--border)',
                    borderRadius: 6, cursor: 'pointer', color: 'var(--text-body)' }}>
                  Nueva matrícula
                </button>
              </div>
            </>
          ) : (
            <>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem' }}>Resumen de Matrícula</h3>
              <div style={{ textAlign: 'left', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>Alumno</div>
                  <div style={{ fontWeight: 600 }}>{alumnoForm.nombres} {alumnoForm.apellidoPaterno}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>RUN: {alumnoForm.run} · {alumnoForm.genero}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>Apoderado Titular</div>
                  <div style={{ fontWeight: 600 }}>{apodForm.nombres} {apodForm.apellidoPaterno}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>{apodForm.telefono} · {apodForm.parentesco}</div>
                </div>
                <div style={{ background: 'var(--bg)', borderRadius: 6, padding: '0.75rem', gridColumn: '1/-1' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 4 }}>Matrícula 2026</div>
                  <div style={{ fontWeight: 600 }}>{matForm.nivel}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {matForm.pie && <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem' }}>PIE</span>}
                    {matForm.prioritario && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem' }}>Prioritario</span>}
                    {matForm.preferente && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem' }}>Preferente</span>}
                  </div>
                </div>
              </div>
              {error && (
                <div style={{ display: 'flex', gap: 8, padding: '0.75rem', background: '#fee2e2', borderRadius: 6,
                  color: '#b91c1c', marginBottom: '1rem', fontSize: '0.875rem', alignItems: 'center' }}>
                  <AlertCircle size={16} /> {error}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Navigation */}
      {step < 4 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <button
            onClick={() => step === 1 ? navigate('/matricula/alumnos') : setStep(s => (s - 1) as Step)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 1.1rem',
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
              cursor: 'pointer', color: 'var(--text-body)' }}>
            <ArrowLeft size={14} /> {step === 1 ? 'Cancelar' : 'Anterior'}
          </button>
          {step < 3 ? (
            <button
              disabled={!canGoNext()}
              onClick={() => setStep(s => (s + 1) as Step)}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 1.1rem',
                background: 'var(--accent,#6366f1)', color: '#fff', border: 'none', borderRadius: 6,
                cursor: canGoNext() ? 'pointer' : 'not-allowed', opacity: canGoNext() ? 1 : 0.5, fontWeight: 600 }}>
              Siguiente <ArrowRight size={14} />
            </button>
          ) : (
            <button
              disabled={!canGoNext() || submitting}
              onClick={handleSubmit}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.5rem 1.4rem',
                background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6,
                cursor: canGoNext() && !submitting ? 'pointer' : 'not-allowed',
                opacity: canGoNext() && !submitting ? 1 : 0.5, fontWeight: 700, fontSize: '0.95rem' }}>
              {submitting ? 'Procesando...' : <><Check size={15} /> Confirmar Matrícula</>}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
