import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen, Users, Heart, Briefcase, TrendingUp,
  CheckCircle, Clock, AlertCircle, MinusCircle,
  Target, Flag, ChevronRight
} from 'lucide-react';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type PMEEstado = 'BORRADOR' | 'APROBADO' | 'EN_EJECUCION' | 'CERRADO';
type AccionEstado = 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADO' | 'CANCELADO';

interface Accion {
  id: string;
  pmeId: string;
  dimension: string;
  objetivo: string;
  meta: string;
  descripcion: string;
  porcentajeAvance: string;
  estado: AccionEstado;
}

interface PME {
  id: string;
  anio: number;
  estado: PMEEstado;
  aprobadoPor: string;
  fechaAprobacion: string;
  acciones: Accion[];
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockPMEs: PME[] = [
  {
    id: 'pme-2026', anio: 2026, estado: 'EN_EJECUCION',
    aprobadoPor: 'Director Juan Pérez', fechaAprobacion: '2026-01-15T10:00:00Z',
    acciones: [
      { id: 'a1', pmeId: 'pme-2026', dimension: 'Gestion Pedagogica', objetivo: 'Mejorar resultados SIMCE lectura', meta: 'Subir 15 puntos en prueba 2026', descripcion: 'Plan de lectura intensivo con tutorías', porcentajeAvance: '45', estado: 'EN_PROGRESO' },
      { id: 'a2', pmeId: 'pme-2026', dimension: 'Gestion Pedagogica', objetivo: 'Fortalecer matemáticas 4° básico', meta: 'Aumentar aprobación a 85%', descripcion: 'Reforzamiento semanal con recursos Mineduc', porcentajeAvance: '30', estado: 'EN_PROGRESO' },
      { id: 'a3', pmeId: 'pme-2026', dimension: 'Gestion Pedagogica', objetivo: 'Implementar evaluación formativa', meta: '100% docentes aplican rúbricas', descripcion: 'Capacitación y modelado en aula', porcentajeAvance: '0', estado: 'PENDIENTE' },
      { id: 'a4', pmeId: 'pme-2026', dimension: 'Liderazgo', objetivo: 'Fortalecer consejo de profesores', meta: 'Reunión mensual con actas', descripcion: 'Protocolo de reuniones y seguimiento', porcentajeAvance: '80', estado: 'EN_PROGRESO' },
      { id: 'a5', pmeId: 'pme-2026', dimension: 'Liderazgo', objetivo: 'Plan de desarrollo profesional docente', meta: '4 capacitaciones anuales por docente', descripcion: 'Alianza con CFT y universidades', porcentajeAvance: '50', estado: 'EN_PROGRESO' },
      { id: 'a6', pmeId: 'pme-2026', dimension: 'Convivencia', objetivo: 'Reducir conflictos entre estudiantes', meta: 'Reducir incidencias en 30%', descripcion: 'Implementar mediación entre pares', porcentajeAvance: '60', estado: 'EN_PROGRESO' },
      { id: 'a7', pmeId: 'pme-2026', dimension: 'Convivencia', objetivo: 'Protocolo de acoso escolar actualizado', meta: 'Protocolo aprobado y difundido', descripcion: 'Revisión y actualización conforme ley', porcentajeAvance: '100', estado: 'COMPLETADO' },
      { id: 'a8', pmeId: 'pme-2026', dimension: 'Gestion de Recursos', objetivo: 'Optimizar uso de recursos SEP', meta: 'Ejecutar 95% del presupuesto SEP', descripcion: 'Plan de gastos trimestral', porcentajeAvance: '65', estado: 'EN_PROGRESO' },
      { id: 'a9', pmeId: 'pme-2026', dimension: 'Gestion de Recursos', objetivo: 'Mantención preventiva infraestructura', meta: 'Revisión semestral completada', descripcion: 'Contrato con empresa de mantención', porcentajeAvance: '0', estado: 'PENDIENTE' },
    ],
  },
  {
    id: 'pme-2025', anio: 2025, estado: 'CERRADO',
    aprobadoPor: 'Director Juan Pérez', fechaAprobacion: '2025-01-10T10:00:00Z',
    acciones: [
      { id: 'b1', pmeId: 'pme-2025', dimension: 'Gestion Pedagogica', objetivo: 'Mejora resultados SIMCE 2025', meta: 'Subir 10 puntos', descripcion: 'Plan lector', porcentajeAvance: '90', estado: 'COMPLETADO' },
      { id: 'b2', pmeId: 'pme-2025', dimension: 'Liderazgo', objetivo: 'Reestructurar UTP', meta: 'Nueva estructura aprobada', descripcion: 'Definición de roles', porcentajeAvance: '100', estado: 'COMPLETADO' },
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const dimensions = [
  { key: 'Gestion Pedagogica', label: 'Gestión Pedagógica', icon: <BookOpen size={18} />, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  { key: 'Liderazgo',          label: 'Liderazgo',          icon: <Users size={18} />,    color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  { key: 'Convivencia',        label: 'Convivencia',        icon: <Heart size={18} />,    color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  { key: 'Gestion de Recursos',label: 'Gestión de Recursos',icon: <Briefcase size={18} />,color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
];

const pmeEstadoConfig: Record<PMEEstado, { label: string; color: string; bg: string; border: string }> = {
  BORRADOR:     { label: 'Borrador',     color: 'var(--muted)', bg: 'rgba(136,153,170,0.15)', border: 'rgba(136,153,170,0.3)' },
  APROBADO:     { label: 'Aprobado',     color: '#10b981', bg: 'rgba(16,185,129,0.15)',  border: 'rgba(16,185,129,0.3)' },
  EN_EJECUCION: { label: 'En Ejecución', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)' },
  CERRADO:      { label: 'Cerrado',      color: 'var(--muted)', bg: 'rgba(136,153,170,0.15)', border: 'rgba(136,153,170,0.3)' },
};

const accionEstadoConfig: Record<AccionEstado, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  PENDIENTE:   { label: 'Pendiente',   icon: <Clock size={12} />,        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.3)' },
  EN_PROGRESO: { label: 'En Progreso', icon: <TrendingUp size={12} />,    color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.3)' },
  COMPLETADO:  { label: 'Completado',  icon: <CheckCircle size={12} />,   color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  CANCELADO:   { label: 'Cancelado',   icon: <MinusCircle size={12} />,   color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.3)' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar: React.FC<{ value: number; color: string; height?: number }> = ({ value, color, height = 6 }) => (
  <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.08)', borderRadius: height / 2, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.5s ease' }} />
  </div>
);

const AccionEstadoBadge: React.FC<{ estado: AccionEstado }> = ({ estado }) => {
  const cfg = accionEstadoConfig[estado];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

const CircularProgress: React.FC<{ value: number; size?: number }> = ({ value, size = 80 }) => {
  const radius = (size - 12) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={8} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: size < 80 ? 12 : 16, fontWeight: 700 }}>{value}%</span>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PME: React.FC = () => {
  const [pmes, setPmes] = useState<PME[]>(mockPMEs);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [expandedDims, setExpandedDims] = useState<Set<string>>(new Set(dimensions.map(d => d.key)));

  const fetchPMEs = useCallback(async () => {
    try {
      const res = await api.get('/pme');
      if (res.data?.data?.length) { setPmes(res.data.data); setSelectedYear(res.data.data[0].anio); }
    } catch {
      // use mock
    }
  }, []);

  useEffect(() => { fetchPMEs(); }, [fetchPMEs]);

  const currentPME = pmes.find(p => p.anio === selectedYear);
  const years = pmes.map(p => p.anio).sort((a, b) => b - a);

  const globalAvance = currentPME
    ? Math.round(currentPME.acciones.reduce((s, a) => s + Number(a.porcentajeAvance), 0) / currentPME.acciones.length)
    : 0;

  const toggleDim = (key: string) => {
    setExpandedDims(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const estadoCfg = currentPME ? pmeEstadoConfig[currentPME.estado] : null;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>Plan de Mejoramiento (PME)</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>Seguimiento de objetivos y metas institucionales</p>
        </div>
        {currentPME && estadoCfg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ backgroundColor: estadoCfg.bg, color: estadoCfg.color, border: `1px solid ${estadoCfg.border}`, borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600 }}>
              {estadoCfg.label}
            </span>
          </div>
        )}
      </div>

      {/* ── Year Tabs ── */}
      {years.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {years.map(y => (
            <button key={y} onClick={() => setSelectedYear(y)} style={{
              background: selectedYear === y ? '#3b82f6' : 'var(--card)',
              border: `1px solid ${selectedYear === y ? '#3b82f6' : 'var(--border)'}`,
              color: selectedYear === y ? '#fff' : 'var(--muted)',
              borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s',
            }}>{y}</button>
          ))}
        </div>
      )}

      {currentPME ? (
        <>
          {/* ── PME Info + Global Progress ── */}
          <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <CircularProgress value={globalAvance} size={90} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Avance Global PME {currentPME.anio}</div>
              <ProgressBar value={globalAvance} color={globalAvance >= 80 ? '#10b981' : globalAvance >= 50 ? '#f59e0b' : '#ef4444'} height={8} />
              <div style={{ display: 'flex', gap: 24, marginTop: 12 }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>Aprobado por</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{currentPME.aprobadoPor}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>Fecha aprobación</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>
                    {new Date(currentPME.fechaAprobacion).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>Total acciones</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{currentPME.acciones.length}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: 11 }}>Completadas</div>
                  <div style={{ color: '#10b981', fontSize: 13, fontWeight: 600 }}>
                    {currentPME.acciones.filter(a => a.estado === 'COMPLETADO').length}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Dimension Cards ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {dimensions.map(dim => {
              const acciones = currentPME.acciones.filter(a => a.dimension === dim.key);
              if (acciones.length === 0) return null;
              const dimAvance = Math.round(acciones.reduce((s, a) => s + Number(a.porcentajeAvance), 0) / acciones.length);
              const isOpen = expandedDims.has(dim.key);

              return (
                <div key={dim.key} style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, overflow: 'hidden' }}>
                  {/* Dimension Header */}
                  <button onClick={() => toggleDim(dim.key)} style={{
                    width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
                  }}>
                    <div style={{ background: dim.bg, border: `1px solid ${dim.border}`, borderRadius: 8, padding: 8, color: dim.color, flexShrink: 0 }}>
                      {dim.icon}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{dim.label}</span>
                        <span style={{ color: 'var(--muted)', fontSize: 12 }}>{acciones.length} acción{acciones.length !== 1 ? 'es' : ''}</span>
                        <span style={{ color: dim.color, fontSize: 12, fontWeight: 600, marginLeft: 'auto', marginRight: 12 }}>{dimAvance}%</span>
                      </div>
                      <ProgressBar value={dimAvance} color={dim.color} height={5} />
                    </div>
                    <ChevronRight size={16} color="var(--muted)" style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0)', transition: 'transform 0.2s', flexShrink: 0 }} />
                  </button>

                  {/* Acciones */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #2a3a4a' }}>
                      {acciones.map((accion, i) => {
                        const pct = Number(accion.porcentajeAvance);
                        return (
                          <div key={accion.id} style={{
                            padding: '14px 20px 14px 58px',
                            borderTop: i > 0 ? '1px solid rgba(42,58,74,0.6)' : 'none',
                            background: i % 2 === 0 ? 'transparent' : 'rgba(42,58,74,0.1)',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 200 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                                  <Target size={13} color={dim.color} />
                                  <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{accion.objetivo}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                                  <Flag size={11} color="var(--muted)" />
                                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>{accion.meta}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <div style={{ flex: 1, maxWidth: 200 }}>
                                    <ProgressBar value={pct} color={dim.color} height={4} />
                                  </div>
                                  <span style={{ color: dim.color, fontSize: 12, fontWeight: 600, minWidth: 32 }}>{pct}%</span>
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <AccionEstadoBadge estado={accion.estado} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>
          No se encontró un PME para el año seleccionado.
        </div>
      )}
    </div>
  );
};

export default PME;
