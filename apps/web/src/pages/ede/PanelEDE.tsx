import React, { useState, useEffect } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle, XCircle, Download,
  RefreshCw, Users, BookOpen, ClipboardCheck, UserCheck, FileJson,
} from 'lucide-react';
import api from '../../api/client';

interface ValidationError {
  campo: string;
  mensaje: string;
  registrosAfectados: number;
}

interface ValidationResult {
  valido: boolean;
  totalAlumnos: number;
  totalCursos: number;
  totalFuncionarios: number;
  errores: ValidationError[];
  advertencias: ValidationError[];
}

export default function PanelEDE() {
  const [validacion, setValidacion] = useState<ValidationResult | null>(null);
  const [validando, setValidando] = useState(false);
  const [exportando, setExportando] = useState(false);
  const anio = new Date().getFullYear();

  async function validar() {
    setValidando(true);
    try {
      const res = await api.post('/ede/validar', { anio });
      setValidacion(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setValidando(false);
    }
  }

  async function exportar() {
    setExportando(true);
    try {
      const res = await api.post(
        '/ede/exportar',
        { anio, rbd: '12345' },
        { responseType: 'blob' },
      );
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `EDE_12345_${anio}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    } finally {
      setExportando(false);
    }
  }

  useEffect(() => { validar(); }, []);

  const checks = validacion ? [
    {
      label: 'Alumnos matriculados',
      value: `${validacion.totalAlumnos} alumnos`,
      ok: !validacion.errores.some((e) => e.campo.startsWith('Alumno')),
      icon: <Users size={16} />,
    },
    {
      label: 'Cursos con docente jefe',
      value: `${validacion.totalCursos} cursos`,
      ok: !validacion.errores.some((e) => e.campo.includes('docenteJefeId')),
      icon: <UserCheck size={16} />,
    },
    {
      label: 'Asignaturas asignadas',
      value: `${validacion.totalCursos} cursos evaluados`,
      ok: !validacion.errores.some((e) => e.campo === 'AsignaturaDocente'),
      icon: <BookOpen size={16} />,
    },
    {
      label: 'Registros de asistencia',
      value: 'Período 2026',
      ok: !validacion.errores.some((e) => e.campo === 'Asistencia'),
      icon: <ClipboardCheck size={16} />,
    },
    {
      label: 'Docentes con RUN válido',
      value: `${validacion.totalFuncionarios} docentes`,
      ok: !validacion.errores.some((e) => e.campo === 'Funcionario.run'),
      icon: <UserCheck size={16} />,
    },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <ShieldCheck size={24} style={{ color: '#3b82f6' }} />
            Panel EDE — Libro de Clases Digital
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Estándar de Datos para la Educación — REX 3335/2020 · Circular 30/2021 SUPEREDUC
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={validar}
            disabled={validando}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm border"
            style={{ border: '1px solid var(--border)', color: 'var(--muted)' }}
          >
            <RefreshCw size={14} className={validando ? 'animate-spin' : ''} />
            {validando ? 'Validando...' : 'Validar datos'}
          </button>
          <button
            onClick={exportar}
            disabled={exportando || !validacion?.valido}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
            style={{
              background: exportando || !validacion?.valido ? '#94a3b8' : '#3b82f6',
              cursor: exportando || !validacion?.valido ? 'not-allowed' : 'pointer',
            }}
          >
            <Download size={14} />
            {exportando ? 'Exportando...' : 'Exportar JSON.zip'}
          </button>
        </div>
      </div>

      {/* Estado general */}
      {validacion && (
        <div
          className="p-5 rounded-xl flex items-center gap-4"
          style={{
            background: validacion.valido ? '#052e1622' : '#450a0a22',
            border: `1px solid ${validacion.valido ? '#16a34a' : '#dc2626'}`,
          }}
        >
          {validacion.valido ? (
            <CheckCircle size={32} style={{ color: '#16a34a' }} />
          ) : (
            <XCircle size={32} style={{ color: '#dc2626' }} />
          )}
          <div>
            <p className="font-semibold" style={{ color: validacion.valido ? '#16a34a' : '#dc2626' }}>
              {validacion.valido
                ? 'Datos listos para exportar al contenedor EDE'
                : `${validacion.errores.length} error${validacion.errores.length !== 1 ? 'es' : ''} encontrado${validacion.errores.length !== 1 ? 's' : ''} — corrija antes de exportar`}
            </p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
              {validacion.totalAlumnos} alumnos · {validacion.totalCursos} cursos · {validacion.totalFuncionarios} funcionarios
            </p>
          </div>
        </div>
      )}

      {/* Checklist */}
      {validando && !validacion ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'var(--card)' }} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checks.map((c) => (
            <div
              key={c.label}
              className="p-4 rounded-xl flex items-center gap-3"
              style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: c.ok ? '#16a34a22' : '#dc262622',
                  color: c.ok ? '#16a34a' : '#dc2626',
                }}
              >
                {c.ok ? <CheckCircle size={18} /> : <XCircle size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                  {c.label}
                </p>
                <div className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {c.icon}
                  <span>{c.value}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Errores */}
      {validacion && validacion.errores.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ background: '#dc262611', borderBottom: '1px solid var(--border)' }}
          >
            <AlertTriangle size={15} style={{ color: '#dc2626' }} />
            <span className="text-sm font-medium" style={{ color: '#dc2626' }}>
              Errores que bloquean la exportación
            </span>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {validacion.errores.map((e, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-4"
                style={{ background: 'var(--card)' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{e.mensaje}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Campo: {e.campo}</p>
                </div>
                <span
                  className="shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: '#dc262622', color: '#dc2626' }}
                >
                  {e.registrosAfectados} registro{e.registrosAfectados !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Advertencias */}
      {validacion && validacion.advertencias.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border)' }}
        >
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ background: '#f59e0b11', borderBottom: '1px solid var(--border)' }}
          >
            <AlertTriangle size={15} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-medium" style={{ color: '#f59e0b' }}>
              Advertencias (no bloquean la exportación)
            </span>
          </div>
          <div>
            {validacion.advertencias.map((a, i) => (
              <div key={i} className="px-4 py-3 flex items-start justify-between gap-4"
                style={{ background: 'var(--card)', borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.mensaje}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>Campo: {a.campo}</p>
                </div>
                <span className="shrink-0 text-xs font-bold px-2 py-1 rounded-full"
                  style={{ background: '#f59e0b22', color: '#f59e0b' }}>
                  {a.registrosAfectados}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info EDE */}
      <div
        className="p-4 rounded-xl flex items-start gap-3"
        style={{ background: '#3b82f611', border: '1px solid #3b82f633' }}
      >
        <FileJson size={18} style={{ color: '#3b82f6', marginTop: 2 }} />
        <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Sobre el estándar EDE</p>
          <p>El JSON exportado sigue el formato CEDS v7.1 requerido por el contenedor DockerEdeCode del Mineduc.</p>
          <p>Entidades incluidas: Organization, Person, PersonIdentifier, OrganizationPersonRole, K12StaffAssignment, StaffSectionAssociation, RoleAttendanceEvent, Assessment, AssessmentResult.</p>
        </div>
      </div>
    </div>
  );
}
