import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, User, Users, BookOpen, Heart, FileText, Clock, ClipboardCheck, GraduationCap } from 'lucide-react';
import api from '../../api/client';

const TABS = [
  { key: 'datos', label: 'Datos Personales', icon: <User size={15} /> },
  { key: 'apoderados', label: 'Apoderados', icon: <Users size={15} /> },
  { key: 'matricula', label: 'Matrícula', icon: <BookOpen size={15} /> },
  { key: 'salud', label: 'Salud', icon: <Heart size={15} /> },
  { key: 'documentos', label: 'Documentos', icon: <FileText size={15} /> },
  { key: 'historial', label: 'Historial', icon: <Clock size={15} /> },
  { key: 'asistencia', label: 'Asistencia', icon: <ClipboardCheck size={15} /> },
  { key: 'notas', label: 'Notas', icon: <GraduationCap size={15} /> },
];

export default function FichaAlumno() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState('datos');
  const [alumno, setAlumno] = useState<any>(null);
  const [matriculaActual, setMatriculaActual] = useState<any>(null);
  const [historial, setHistorial] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Asistencia tab state
  const nowDate = new Date();
  const [asistMes, setAsistMes] = useState(nowDate.getMonth() + 1);
  const [asistAnio, setAsistAnio] = useState(nowDate.getFullYear());
  const [asistData, setAsistData] = useState<any>(null);
  const [asistLoading, setAsistLoading] = useState(false);
  const [asistLoaded, setAsistLoaded] = useState(false);

  // Notas tab state
  const [notasSemestre, setNotasSemestre] = useState(1);
  const [notasData, setNotasData] = useState<any[]>([]);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasLoaded, setNotasLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [fichaR, histR] = await Promise.all([
        api.get(`/alumnos/${id}`),
        api.get(`/alumnos/${id}/historial`),
      ]);
      const a = fichaR.data.data;
      setAlumno(a);
      setForm({
        nombres: a.nombres ?? '',
        apellidoPaterno: a.apellidoPaterno ?? '',
        apellidoMaterno: a.apellidoMaterno ?? '',
        direccion: a.direccion ?? '',
        comuna: a.comuna ?? '',
        telefono: a.telefono ?? '',
        email: a.email ?? '',
        nacionalidad: a.nacionalidad ?? 'Chilena',
        puebloOriginario: a.puebloOriginario ?? '',
        grupoSanguineo: a.grupoSanguineo ?? '',
        previsionSalud: a.previsionSalud ?? '',
        alergias: a.alergias ?? '',
        enfermedadesCronicas: a.enfermedadesCronicas ?? '',
        medicamentos: a.medicamentos ?? '',
      });
      const hist = histR.data.data ?? [];
      setHistorial(hist);
      setMatriculaActual(hist.find((m: any) => m.anio === 2026) ?? null);
    } catch {
      setAlumno(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) load(); }, [id]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await api.patch(`/alumnos/${id}`, form);
      setSaveMsg('Guardado correctamente');
      setEditMode(false);
      load();
    } catch {
      setSaveMsg('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const loadAsistencia = async (mes: number, anio: number) => {
    if (!id) return;
    setAsistLoading(true);
    try {
      const r = await api.get(`/asistencia/alumno/${id}`, { params: { mes, anio } });
      setAsistData(r.data.data);
    } catch {
      setAsistData(null);
    } finally {
      setAsistLoading(false);
      setAsistLoaded(true);
    }
  };

  // Load attendance when tab is opened for the first time, or when mes/anio change
  useEffect(() => {
    if (tab === 'asistencia' && id) {
      loadAsistencia(asistMes, asistAnio);
    }
  }, [tab, asistMes, asistAnio, id]);

  const loadNotas = async (semestre: number) => {
    if (!id) return;
    setNotasLoading(true);
    try {
      const r = await api.get(`/academico/notas/alumno/${id}`, { params: { semestre, anio: 2026 } });
      setNotasData(r.data ?? []);
    } catch {
      setNotasData([]);
    } finally {
      setNotasLoading(false);
      setNotasLoaded(true);
    }
  };

  useEffect(() => {
    if (tab === 'notas' && id) loadNotas(notasSemestre);
  }, [tab, notasSemestre, id]);

  if (loading) return <div style={{ padding: '2rem', color: 'var(--muted)' }}>Cargando ficha...</div>;
  if (!alumno) return <div style={{ padding: '2rem', color: '#ef4444' }}>Alumno no encontrado.</div>;

  const nombreCompleto = `${alumno.apellidoPaterno} ${alumno.apellidoMaterno}, ${alumno.nombres}`;

  return (
    <div style={{ padding: '1.5rem', maxWidth: 1000 }}>
      {/* Back + header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.25rem' }}>
        <button onClick={() => navigate('/matricula/alumnos')}
          style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 6,
            padding: '0.35rem 0.7rem', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <ArrowLeft size={14} /> Volver
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>{nombreCompleto}</h1>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>RUN: {alumno.run}</span>
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {alumno.esPIE && <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '2px 9px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700 }}>PIE</span>}
          {alumno.esPrioritario && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 9px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700 }}>Prioritario</span>}
          {alumno.esPreferente && <span style={{ background: '#fef3c7', color: '#b45309', padding: '2px 9px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700 }}>Preferente</span>}
          <span style={{
            background: alumno.estadoMatricula === 'ACTIVA' ? '#dcfce7' : '#fee2e2',
            color: alumno.estadoMatricula === 'ACTIVA' ? '#15803d' : '#b91c1c',
            padding: '2px 9px', borderRadius: 12, fontSize: '0.8rem', fontWeight: 700,
          }}>
            {alumno.estadoMatricula === 'ACTIVA' ? 'Vigente' : alumno.estadoMatricula}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem', gap: 0, overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.6rem 1rem',
              background: 'transparent', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
              fontWeight: tab === t.key ? 700 : 400, fontSize: '0.875rem',
              color: tab === t.key ? 'var(--accent,#6366f1)' : 'var(--muted)',
              borderBottom: tab === t.key ? '2px solid var(--accent,#6366f1)' : '2px solid transparent',
              marginBottom: -1 }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Datos Personales */}
      {tab === 'datos' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Datos Personales</h3>
            <button onClick={() => editMode ? handleSave() : setEditMode(true)}
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0.4rem 0.9rem',
                background: editMode ? '#16a34a' : 'var(--accent,#6366f1)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              <Save size={14} /> {saving ? 'Guardando...' : editMode ? 'Guardar' : 'Editar'}
            </button>
          </div>
          {saveMsg && <p style={{ color: saveMsg.includes('Error') ? '#ef4444' : '#16a34a', marginBottom: 8, fontSize: '0.85rem' }}>{saveMsg}</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.9rem' }}>
            {[
              { key: 'nombres', label: 'Nombres' },
              { key: 'apellidoPaterno', label: 'Apellido Paterno' },
              { key: 'apellidoMaterno', label: 'Apellido Materno' },
              { key: 'direccion', label: 'Dirección' },
              { key: 'comuna', label: 'Comuna' },
              { key: 'telefono', label: 'Teléfono' },
              { key: 'email', label: 'Email' },
              { key: 'nacionalidad', label: 'Nacionalidad' },
              { key: 'puebloOriginario', label: 'Pueblo Originario' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                {editMode ? (
                  <input value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                      background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                ) : (
                  <div style={{ color: form[f.key] ? 'var(--text-body)' : 'var(--muted)', fontSize: '0.875rem' }}>
                    {form[f.key] || '—'}
                  </div>
                )}
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Fecha Nacimiento</label>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
                {alumno.fechaNacimiento ? new Date(alumno.fechaNacimiento).toLocaleDateString('es-CL') : '—'}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Género</label>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-body)' }}>
                {alumno.genero === 'MASCULINO' ? 'Masculino' : alumno.genero === 'FEMENINO' ? 'Femenino' : 'Otro'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Apoderados */}
      {tab === 'apoderados' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Apoderados</h3>
          {(alumno.apoderados ?? []).length === 0
            ? <p style={{ color: 'var(--muted)' }}>No hay apoderados registrados.</p>
            : (alumno.apoderados as any[]).map((aa: any) => {
              const ap = aa.apoderado;
              return (
                <div key={aa.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                        {ap?.nombres} {ap?.apellidos}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 4 }}>
                        RUN: {ap?.run} · {ap?.telefono}
                        {ap?.email && ` · ${ap.email}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {aa.esTitular && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>Titular</span>}
                      {aa.esEmergencia && <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>Emergencia</span>}
                      {aa.tipo && <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600 }}>{aa.tipo}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    Parentesco: {aa.parentesco}
                    {aa.esRetiraAlumno && <span style={{ marginLeft: 8, color: '#16a34a' }}>· Retira al alumno</span>}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Tab: Matrícula */}
      {tab === 'matricula' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Matrícula 2026</h3>
          {!matriculaActual
            ? <p style={{ color: 'var(--muted)' }}>No hay matrícula registrada para 2026.</p>
            : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {[
                  { label: 'N° Matrícula', value: matriculaActual.numeroMatricula ?? '—' },
                  { label: 'Curso', value: matriculaActual.curso ?? '—' },
                  { label: 'Nivel', value: matriculaActual.nivel ?? '—' },
                  { label: 'Estado', value: matriculaActual.estado },
                  { label: 'Fecha Matrícula', value: matriculaActual.fechaMatricula ? new Date(matriculaActual.fechaMatricula).toLocaleDateString('es-CL') : '—' },
                  { label: 'Procedencia', value: matriculaActual.procedencia ?? '—' },
                  { label: 'Beca', value: matriculaActual.becaPorcentaje ? `${matriculaActual.becaPorcentaje}%` : '—' },
                  { label: 'Repitente', value: matriculaActual.repitente ? 'Sí' : 'No' },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 2 }}>{f.label}</div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{String(f.value)}</div>
                  </div>
                ))}
                <div style={{ gridColumn: '1/-1', display: 'flex', gap: 6, paddingTop: 8 }}>
                  {matriculaActual.pie && <span style={{ background: '#ede9fe', color: '#7c3aed', padding: '3px 10px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700 }}>PIE{matriculaActual.pieDiagnostico ? ` · ${matriculaActual.pieDiagnostico}` : ''}</span>}
                  {matriculaActual.prioritario && <span style={{ background: '#dbeafe', color: '#1d4ed8', padding: '3px 10px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700 }}>Prioritario SEP</span>}
                  {matriculaActual.preferente && <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 10px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 700 }}>Preferente SEP</span>}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Tab: Salud */}
      {tab === 'salud' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Información de Salud</h3>
            <button onClick={() => editMode ? handleSave() : setEditMode(!editMode)}
              style={{ padding: '0.4rem 0.9rem', background: editMode ? '#16a34a' : 'var(--accent,#6366f1)', color: '#fff',
                border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
              {editMode ? 'Guardar' : 'Editar'}
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.9rem' }}>
            {[
              { key: 'grupoSanguineo', label: 'Grupo Sanguíneo' },
              { key: 'previsionSalud', label: 'Previsión de Salud' },
              { key: 'alergias', label: 'Alergias' },
              { key: 'enfermedadesCronicas', label: 'Enfermedades Crónicas' },
              { key: 'medicamentos', label: 'Medicamentos' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>{f.label}</label>
                {editMode ? (
                  <input value={form[f.key] ?? ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    style={{ width: '100%', padding: '0.4rem 0.6rem', border: '1px solid var(--border)', borderRadius: 5,
                      background: 'var(--bg)', color: 'var(--text-body)', fontSize: '0.875rem', boxSizing: 'border-box' }} />
                ) : (
                  <div style={{ color: form[f.key] ? 'var(--text-body)' : 'var(--muted)', fontSize: '0.875rem' }}>
                    {form[f.key] || '—'}
                  </div>
                )}
              </div>
            ))}
            <div>
              <label style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'block', marginBottom: 3 }}>Seguro Escolar</label>
              <div style={{ fontSize: '0.875rem', color: alumno.seguroEscolar ? '#16a34a' : 'var(--muted)' }}>
                {alumno.seguroEscolar ? '✓ Activo' : 'No activo'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Documentos */}
      {tab === 'documentos' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Documentos</h3>
          {(alumno.documentos ?? []).length === 0
            ? <p style={{ color: 'var(--muted)' }}>No hay documentos adjuntos. (Funcionalidad de upload próximamente)</p>
            : (alumno.documentos as any[]).map((d: any) => (
              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0',
                borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-body)' }}>{d.nombre}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{d.tipo}</span>
              </div>
            ))}
        </div>
      )}

      {/* Tab: Historial */}
      {tab === 'historial' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          <h3 style={{ margin: '0 0 1rem', color: 'var(--text-primary)', fontSize: '1rem' }}>Historial de Matrículas</h3>
          {historial.length === 0
            ? <p style={{ color: 'var(--muted)' }}>Sin historial registrado.</p>
            : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {historial.map(m => (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.75rem 1rem', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#e0e7ff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontWeight: 700, color: '#6366f1', fontSize: '1rem', flexShrink: 0 }}>
                      {m.anio}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {m.nivel} — Curso {m.curso}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                        {m.fechaMatricula ? `Matriculado: ${new Date(m.fechaMatricula).toLocaleDateString('es-CL')}` : ''}
                        {m.fechaRetiro ? ` · Retiro: ${new Date(m.fechaRetiro).toLocaleDateString('es-CL')}` : ''}
                      </div>
                    </div>
                    <span style={{
                      background: m.estado === 'VIGENTE' ? '#dcfce7' : '#fee2e2',
                      color: m.estado === 'VIGENTE' ? '#15803d' : '#b91c1c',
                      padding: '2px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 600,
                    }}>{m.estado}</span>
                  </div>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Tab: Asistencia */}
      {tab === 'asistencia' && (
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1.25rem' }}>
          {/* Header with month/year selectors */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1rem' }}>Asistencia</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <select
                value={asistMes}
                onChange={e => setAsistMes(Number(e.target.value))}
                style={{ padding: '0.35rem 0.6rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-body)', fontSize: '0.85rem' }}
              >
                {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select
                value={asistAnio}
                onChange={e => setAsistAnio(Number(e.target.value))}
                style={{ padding: '0.35rem 0.6rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 5, color: 'var(--text-body)', fontSize: '0.85rem' }}
              >
                {[2024, 2025, 2026].map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {asistLoading ? (
            <div style={{ color: 'var(--muted)', padding: '1.5rem 0', textAlign: 'center', fontSize: '0.875rem' }}>
              Cargando asistencia...
            </div>
          ) : asistLoaded && !asistData ? (
            <div style={{ color: 'var(--muted)', padding: '1.5rem 0', textAlign: 'center', fontSize: '0.875rem' }}>
              No hay registros de asistencia para este período.
            </div>
          ) : asistData ? (
            <>
              {/* 3 Stat Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {/* % Asistencia */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>% Asistencia</div>
                  <div style={{
                    fontSize: '1.6rem', fontWeight: 700,
                    color: asistData.porcentajeAcumulado >= 90 ? '#16a34a'
                      : asistData.porcentajeAcumulado >= 80 ? '#b45309' : '#b91c1c',
                  }}>
                    {typeof asistData.porcentajeAcumulado === 'number'
                      ? `${asistData.porcentajeAcumulado.toFixed(1)}%`
                      : '—'}
                  </div>
                </div>
                {/* Días asistidos */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Días Asistidos</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent,#6366f1)' }}>
                    {asistData.diasAsistidos ?? 0}
                    <span style={{ fontSize: '0.95rem', fontWeight: 400, color: 'var(--muted)' }}>
                      /{asistData.totalDias ?? 0}
                    </span>
                  </div>
                </div>
                {/* Ausencias */}
                <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '0.85rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 4 }}>Ausencias</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#b91c1c' }}>
                    {(asistData.totalDias ?? 0) - (asistData.diasAsistidos ?? 0)}
                  </div>
                </div>
              </div>

              {/* Records list */}
              {(asistData.registros ?? []).length === 0 ? (
                <p style={{ color: 'var(--muted)', fontSize: '0.875rem' }}>Sin registros para este mes.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(asistData.registros as any[]).map((reg: any) => {
                    const estadoStyles: Record<string, { bg: string; color: string; label: string }> = {
                      PRESENTE:             { bg: '#dcfce7', color: '#15803d', label: 'Presente' },
                      AUSENTE:              { bg: '#fee2e2', color: '#b91c1c', label: 'Ausente' },
                      ATRASO:               { bg: '#fef3c7', color: '#b45309', label: 'Atraso' },
                      JUSTIFICADO:          { bg: '#dbeafe', color: '#1d4ed8', label: 'Justificado' },
                      RETIRADO_ANTICIPADO:  { bg: '#f1f5f9', color: '#475569', label: 'Retiro Anticipado' },
                    };
                    const style = estadoStyles[reg.estado] ?? { bg: '#f1f5f9', color: '#475569', label: reg.estado };
                    return (
                      <div key={reg.id} style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '0.55rem 0.75rem', border: '1px solid var(--border)', borderRadius: 7,
                      }}>
                        <div style={{ width: 90, fontSize: '0.82rem', color: 'var(--text-body)', flexShrink: 0 }}>
                          {reg.fecha
                            ? new Date(reg.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', weekday: 'short' })
                            : '—'}
                        </div>
                        <span style={{
                          background: style.bg, color: style.color,
                          padding: '2px 9px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
                        }}>
                          {style.label}
                        </span>
                        {reg.horaLlegada && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flexShrink: 0 }}>
                            {reg.horaLlegada}
                          </span>
                        )}
                        {reg.justificacion && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-body)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {reg.justificacion}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Tab: Notas */}
      {tab === 'notas' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1rem' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Semestre:</span>
            {[1, 2].map((s) => (
              <button
                key={s}
                onClick={() => { setNotasSemestre(s); setNotasLoaded(false); }}
                style={{
                  padding: '4px 14px', borderRadius: 7, border: '1px solid var(--border)', cursor: 'pointer', fontSize: '0.85rem',
                  background: notasSemestre === s ? '#3b82f6' : 'var(--card)', color: notasSemestre === s ? '#fff' : 'var(--text-primary)',
                }}
              >Sem {s}</button>
            ))}
          </div>

          {notasLoading ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Cargando notas...</div>
          ) : notasLoaded && notasData.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>Sin notas registradas en el semestre {notasSemestre}.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {notasData.map((asig: any) => (
                <div key={asig.asignatura.id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{asig.asignatura.nombre}</span>
                    {asig.promedio !== null && (
                      <span style={{
                        padding: '3px 12px', borderRadius: 12, fontSize: '0.85rem', fontWeight: 700,
                        background: asig.promedio >= 6 ? '#dcfce7' : asig.promedio >= 4 ? '#fef3c7' : '#fee2e2',
                        color: asig.promedio >= 6 ? '#15803d' : asig.promedio >= 4 ? '#b45309' : '#b91c1c',
                      }}>
                        Promedio: {asig.promedio.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {asig.evaluaciones.map((ev: any) => (
                      <div key={ev.evaluacion.id} style={{
                        border: '1px solid var(--border)', borderRadius: 7, padding: '0.4rem 0.75rem', minWidth: 110,
                        background: ev.valor >= 6 ? '#f0fdf4' : ev.valor >= 4 ? '#fffbeb' : '#fef2f2',
                      }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 2 }}>{ev.evaluacion.nombre}</div>
                        <div style={{
                          fontSize: '1rem', fontWeight: 700,
                          color: ev.valor >= 6 ? '#15803d' : ev.valor >= 4 ? '#b45309' : '#b91c1c',
                        }}>{ev.valor.toFixed(1)}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>{ev.evaluacion.ponderacion}%</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
