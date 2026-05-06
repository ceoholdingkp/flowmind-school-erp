import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, UserCheck, BookOpen, GraduationCap,
  CheckCircle, Upload, AlertCircle, ArrowLeft, ArrowRight,
  RefreshCw, PartyPopper,
} from 'lucide-react';
import api from '../../api/client';

const C = { purple: '#8b5cf6', green: '#10b981', amber: '#f59e0b', red: '#ef4444', muted: 'var(--muted)', border: 'var(--border)' };

type StepKey = 'colegio' | 'alumnos' | 'funcionarios' | 'cursos' | 'docentes';

interface Step {
  key: StepKey;
  label: string;
  icon: React.ReactNode;
  completado: boolean;
  total?: number;
}

const INITIAL_STEPS: Step[] = [
  { key: 'colegio', label: 'Datos del colegio', icon: <Building2 size={18} />, completado: false },
  { key: 'alumnos', label: 'Importar alumnos', icon: <Users size={18} />, completado: false },
  { key: 'funcionarios', label: 'Importar funcionarios', icon: <UserCheck size={18} />, completado: false },
  { key: 'cursos', label: 'Verificar cursos', icon: <BookOpen size={18} />, completado: false },
  { key: 'docentes', label: 'Asignar docentes', icon: <GraduationCap size={18} />, completado: false },
];

// ── Step 1: Datos del colegio ─────────────────────────────────

function StepColegio({ onNext }: { onNext: (data: any) => void }) {
  const [form, setForm] = useState({
    nombre: '', rbd: '', direccion: '', comuna: '', region: '',
    telefono: '', email: '', nombreDirector: '', rutDirector: '', emailDirector: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/onboarding/nuevo-colegio', form);
      setResult(data);
      onNext(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al crear el colegio');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ background: '#10b98111', border: '1px solid #10b98133', borderRadius: 12, padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <CheckCircle size={24} color={C.green} />
            <span style={{ color: C.green, fontWeight: 700, fontSize: 16 }}>Colegio creado exitosamente</span>
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p><strong>Tenant ID:</strong> {result.tenantId}</p>
            <p><strong>Email director:</strong> {result.credenciales?.email}</p>
            <p><strong>Contraseña temporal:</strong> <code style={{ background: 'var(--bg)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{result.credenciales?.passwordTemporal}</code></p>
          </div>
        </div>
        <button onClick={() => onNext(result)} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          Continuar <ArrowRight size={16} />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ padding: 24 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { k: 'nombre', label: 'Nombre del colegio', required: true, colSpan: 2 },
          { k: 'rbd', label: 'RBD', required: true },
          { k: 'telefono', label: 'Teléfono' },
          { k: 'email', label: 'Email institucional', type: 'email' },
          { k: 'direccion', label: 'Dirección', required: true },
          { k: 'comuna', label: 'Comuna', required: true },
          { k: 'region', label: 'Región', required: true },
        ].map((f) => (
          <div key={f.k} style={{ gridColumn: (f as any).colSpan === 2 ? '1 / -1' : undefined }}>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>
              {f.label}{f.required && ' *'}
            </label>
            <input
              type={(f as any).type || 'text'}
              value={(form as any)[f.k]}
              onChange={handleChange(f.k)}
              required={f.required}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        ))}

        <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Datos del director</p>
        </div>

        {[
          { k: 'nombreDirector', label: 'Nombre completo', required: true },
          { k: 'rutDirector', label: 'RUT (ej: 12345678-9)', required: true },
          { k: 'emailDirector', label: 'Email', required: true, type: 'email', colSpan: 2 },
        ].map((f) => (
          <div key={f.k} style={{ gridColumn: (f as any).colSpan === 2 ? '1 / -1' : undefined }}>
            <label style={{ display: 'block', fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 600 }}>
              {f.label}{f.required && ' *'}
            </label>
            <input
              type={(f as any).type || 'text'}
              value={(form as any)[f.k]}
              onChange={handleChange(f.k)}
              required={f.required}
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text-primary)', fontSize: 14, boxSizing: 'border-box' }}
            />
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', marginTop: 16, color: C.red, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <button type="submit" disabled={loading} style={{ marginTop: 20, background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: loading ? 0.6 : 1 }}>
        {loading ? <RefreshCw size={16} className="animate-spin" /> : <Building2 size={16} />}
        {loading ? 'Creando colegio...' : 'Crear colegio'}
      </button>
    </form>
  );
}

// ── Step 2 & 3: Importar archivo ──────────────────────────────

function StepImportar({
  tipo, endpoint, columnas, onNext, onSkip,
}: {
  tipo: 'alumnos' | 'funcionarios';
  endpoint: string;
  columnas: string;
  onNext: (res: any) => void;
  onSkip: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    const formData = new FormData();
    formData.append('archivo', file);
    try {
      const { data } = await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data);
      onNext(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al importar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {!result ? (
        <>
          <p style={{ color: 'var(--text-primary)', marginBottom: 8, fontSize: 15 }}>
            Sube un archivo <strong>Excel (.xlsx)</strong> o <strong>CSV</strong> con las columnas:
          </p>
          <code style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', display: 'block', marginBottom: 20, fontSize: 13, color: 'var(--muted)' }}>
            {columnas}
          </code>

          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: `2px dashed ${file ? C.purple : 'var(--border)'}`, borderRadius: 12, padding: 32, textAlign: 'center', cursor: 'pointer', marginBottom: 16, transition: 'border-color 0.2s' }}
          >
            <Upload size={32} color={file ? C.purple : 'var(--muted)'} style={{ margin: '0 auto 12px', display: 'block' }} />
            {file ? (
              <p style={{ color: C.purple, fontWeight: 600 }}>{file.name}</p>
            ) : (
              <>
                <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>Haz click para seleccionar archivo</p>
                <p style={{ color: 'var(--muted)', fontSize: 13 }}>Excel (.xlsx) o CSV, máx 10 MB</p>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />

          {error && (
            <div style={{ background: '#ef444411', border: '1px solid #ef444433', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: C.red, fontSize: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={handleUpload} disabled={!file || loading} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: !file || loading ? 0.6 : 1 }}>
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Upload size={16} />}
              {loading ? 'Importando...' : 'Importar'}
            </button>
            <button onClick={onSkip} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14 }}>
              Omitir por ahora
            </button>
          </div>
        </>
      ) : (
        <div>
          <div style={{ background: '#10b98111', border: '1px solid #10b98133', borderRadius: 12, padding: 20, marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
              <CheckCircle size={20} color={C.green} />
              <span style={{ color: C.green, fontWeight: 700 }}>Importación completada</span>
            </div>
            <div style={{ display: 'flex', gap: 20, fontSize: 14, color: 'var(--text-primary)' }}>
              <span>✅ <strong>{result.importados}</strong> importados</span>
              <span>🔄 <strong>{result.duplicados}</strong> duplicados</span>
              <span>❌ <strong>{result.errores?.length ?? 0}</strong> errores</span>
            </div>
          </div>

          {result.errores?.length > 0 && (
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
              <p style={{ padding: '10px 14px', color: C.amber, fontWeight: 600, fontSize: 13, borderBottom: '1px solid var(--border)' }}>Errores por fila</p>
              <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                {result.errores.slice(0, 20).map((e: any, i: number) => (
                  <div key={i} style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)10', fontSize: 13, display: 'flex', gap: 12 }}>
                    <span style={{ color: C.red }}>Fila {e.fila}</span>
                    <span style={{ color: C.amber }}>[{e.campo}]</span>
                    <span style={{ color: 'var(--muted)' }}>{e.mensaje}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button onClick={() => onNext(result)} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Continuar <ArrowRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 4: Verificar cursos ──────────────────────────────────

function StepCursos({ onNext }: { onNext: () => void }) {
  const [progreso, setProgreso] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    api.get('/admin/onboarding/progreso')
      .then((r) => setProgreso(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cursosStep = progreso?.pasos.find((p: any) => p.paso === 4);

  return (
    <div style={{ padding: 24 }}>
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><RefreshCw size={24} color={C.purple} className="animate-spin" /></div>
      ) : (
        <>
          <div style={{ background: cursosStep?.completado ? '#10b98111' : 'var(--bg)', border: `1px solid ${cursosStep?.completado ? '#10b98133' : 'var(--border)'}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            {cursosStep?.completado ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <CheckCircle size={24} color={C.green} />
                <div>
                  <p style={{ color: C.green, fontWeight: 700 }}>Cursos detectados</p>
                  <p style={{ color: 'var(--muted)', fontSize: 14 }}>{cursosStep.total} cursos creados automáticamente desde la importación de alumnos.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <AlertCircle size={24} color={C.amber} />
                <p style={{ color: 'var(--text-primary)', fontSize: 14 }}>No se detectaron cursos. Importa alumnos primero o créalos manualmente desde el módulo de Matrícula.</p>
              </div>
            )}
          </div>
          <button onClick={onNext} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            Continuar <ArrowRight size={16} />
          </button>
        </>
      )}
    </div>
  );
}

// ── Step 5: Éxito ─────────────────────────────────────────────

function StepExito({ colegioData, navigate }: { colegioData: any; navigate: (p: string) => void }) {
  return (
    <div style={{ padding: 32, textAlign: 'center' }}>
      <PartyPopper size={60} color={C.purple} style={{ margin: '0 auto 20px', display: 'block' }} />
      <h2 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 800, marginBottom: 8 }}>¡Colegio configurado!</h2>
      <p style={{ color: 'var(--muted)', fontSize: 15, marginBottom: 24 }}>El colegio está listo para operar en el sistema.</p>
      {colegioData?.credenciales && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24, textAlign: 'left', maxWidth: 400, margin: '0 auto 24px' }}>
          <p style={{ color: C.muted, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>Credenciales del director</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 14 }}><strong>Email:</strong> {colegioData.credenciales.email}</p>
          <p style={{ color: 'var(--text-primary)', fontSize: 14, marginTop: 6 }}>
            <strong>Contraseña temporal:</strong>{' '}
            <code style={{ background: 'var(--card)', padding: '2px 8px', borderRadius: 4, fontFamily: 'monospace' }}>{colegioData.credenciales.passwordTemporal}</code>
          </p>
        </div>
      )}
      <button onClick={() => navigate('/dashboard')} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer', fontWeight: 700, fontSize: 15 }}>
        Ir al Dashboard
      </button>
    </div>
  );
}

// ── Main Wizard ───────────────────────────────────────────────

export default function WizardOnboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(INITIAL_STEPS);
  const [colegioData, setColegioData] = useState<any>(null);

  const markStep = (idx: number, total?: number) => {
    setSteps((prev) =>
      prev.map((s, i) => i === idx ? { ...s, completado: true, total } : s),
    );
  };

  const STEP_TITLES = ['Datos del colegio', 'Importar alumnos', 'Importar funcionarios', 'Verificar cursos', 'Asignar docentes', '¡Completado!'];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'var(--card)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={18} /> Dashboard
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18 }}>Configurar nuevo colegio</h1>
      </div>

      <div style={{ maxWidth: 820, margin: '32px auto', padding: '0 24px' }}>
        {/* Progress stepper */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 32, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          {steps.map((s, i) => (
            <div
              key={s.key}
              onClick={() => i < currentStep && setCurrentStep(i)}
              style={{
                flex: 1, padding: '14px 8px', textAlign: 'center', cursor: i < currentStep ? 'pointer' : 'default',
                background: currentStep === i ? `${C.purple}11` : 'transparent',
                borderRight: i < steps.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
                {s.completado
                  ? <CheckCircle size={20} color={C.green} />
                  : React.cloneElement(s.icon as React.ReactElement, { color: currentStep === i ? C.purple : 'var(--muted)' })}
              </div>
              <p style={{ fontSize: 11, color: currentStep === i ? C.purple : 'var(--muted)', fontWeight: currentStep === i ? 700 : 400, lineHeight: 1.3 }}>{s.label}</p>
              {s.total !== undefined && s.completado && (
                <p style={{ fontSize: 11, color: C.green }}>{s.total}</p>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 18 }}>
              Paso {currentStep + 1}: {STEP_TITLES[currentStep]}
            </h2>
          </div>

          {currentStep === 0 && (
            <StepColegio onNext={(data) => {
              markStep(0);
              setColegioData(data);
              setCurrentStep(1);
            }} />
          )}

          {currentStep === 1 && (
            <StepImportar
              tipo="alumnos"
              endpoint="/admin/onboarding/importar-alumnos"
              columnas="RUN | Nombres | Apellido_Paterno | Apellido_Materno | Fecha_Nacimiento | Genero | Curso | Nivel"
              onNext={(res) => { markStep(1, res.importados); setCurrentStep(2); }}
              onSkip={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 2 && (
            <StepImportar
              tipo="funcionarios"
              endpoint="/admin/onboarding/importar-funcionarios"
              columnas="RUN | Nombres | Apellidos | Cargo | Email | Telefono | AFP | Salud | Sueldo_Base"
              onNext={(res) => { markStep(2, res.importados); setCurrentStep(3); }}
              onSkip={() => setCurrentStep(3)}
            />
          )}

          {currentStep === 3 && (
            <StepCursos onNext={() => { markStep(3); setCurrentStep(4); }} />
          )}

          {currentStep === 4 && (
            <div style={{ padding: 24 }}>
              <p style={{ color: 'var(--text-primary)', fontSize: 15, marginBottom: 20 }}>
                Puedes asignar docentes a cursos y asignaturas desde el módulo de <strong>Académico → Libro de Notas</strong> una vez que el colegio esté operativo.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => { markStep(4); setCurrentStep(5); }} style={{ background: C.purple, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Finalizar configuración <CheckCircle size={16} />
                </button>
                <button onClick={() => navigate('/academico/notas')} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 14 }}>
                  Ir a Libro de Notas
                </button>
              </div>
            </div>
          )}

          {currentStep === 5 && <StepExito colegioData={colegioData} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
}
