import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, Clock, AlertTriangle, MinusCircle,
  Shield, BookOpen, DollarSign, Users, Building2,
  ChevronDown, ChevronRight, FileText, Check
} from 'lucide-react';
import api from '../api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

type Area = 'ACADEMICA' | 'FINANCIERA' | 'LABORAL' | 'CONVIVENCIA' | 'INFRAESTRUCTURA';
type ItemEstado = 'CUMPLIDO' | 'PENDIENTE' | 'VENCIDO' | 'NO_APLICA';

interface ResumenArea {
  area: Area;
  total: number;
  cumplidos: number;
  pendientes: number;
  vencidos: number;
  noAplica: number;
}

interface ResumenGlobal {
  resumenPorArea: ResumenArea[];
  porcentajeCumplimiento: number;
  totalItems: number;
  totalCumplidos: number;
  totalVencidos: number;
}

interface ItemCumplimiento {
  id: string;
  area: Area;
  nombre: string;
  descripcion: string;
  normativaReferencia: string;
  plazoLegal: string;
  estado: ItemEstado;
  responsableId: string;
  documentoRespaldo: string;
  observaciones: string;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const mockResumen: ResumenGlobal = {
  porcentajeCumplimiento: 72,
  totalItems: 38,
  totalCumplidos: 27,
  totalVencidos: 4,
  resumenPorArea: [
    { area: 'ACADEMICA',       total: 10, cumplidos: 8,  pendientes: 1, vencidos: 1, noAplica: 0 },
    { area: 'FINANCIERA',      total: 8,  cumplidos: 7,  pendientes: 1, vencidos: 0, noAplica: 0 },
    { area: 'LABORAL',         total: 7,  cumplidos: 4,  pendientes: 1, vencidos: 2, noAplica: 0 },
    { area: 'CONVIVENCIA',     total: 7,  cumplidos: 5,  pendientes: 2, vencidos: 0, noAplica: 0 },
    { area: 'INFRAESTRUCTURA', total: 6,  cumplidos: 3,  pendientes: 2, vencidos: 1, noAplica: 0 },
  ],
};

const mockItems: ItemCumplimiento[] = [
  // ACADEMICA
  { id: 'ac1', area: 'ACADEMICA', nombre: 'Plan de Estudios aprobado Mineduc', descripcion: 'Plan curricular vigente con resolución de aprobación', normativaReferencia: 'DFL-2/2009 Art. 15', plazoLegal: '2026-03-31', estado: 'CUMPLIDO', responsableId: 'r1', documentoRespaldo: 'plan_estudios_2026.pdf', observaciones: 'Aprobado en Consejo Escolar' },
  { id: 'ac2', area: 'ACADEMICA', nombre: 'Reglamento de Evaluación publicado', descripcion: 'Reglamento difundido a apoderados y estudiantes', normativaReferencia: 'Decreto 67/2018', plazoLegal: '2026-03-15', estado: 'CUMPLIDO', responsableId: 'r2', documentoRespaldo: 'reg_evaluacion.pdf', observaciones: '' },
  { id: 'ac3', area: 'ACADEMICA', nombre: 'Informe técnico-pedagógico semestral', descripcion: 'Informe presentado a SLEP con resultados académicos', normativaReferencia: 'Ley 21.040 Art. 32', plazoLegal: '2026-07-31', estado: 'PENDIENTE', responsableId: 'r1', documentoRespaldo: '', observaciones: 'En elaboración por UTP' },
  { id: 'ac4', area: 'ACADEMICA', nombre: 'Actas Consejo Escolar primer trimestre', descripcion: 'Actas firmadas y archivadas en libro oficial', normativaReferencia: 'Ley 19.979', plazoLegal: '2026-04-30', estado: 'CUMPLIDO', responsableId: 'r3', documentoRespaldo: 'actas_ce_q1.pdf', observaciones: '' },
  { id: 'ac5', area: 'ACADEMICA', nombre: 'Informe DAEM asistencia mensual', descripcion: 'Reporte de asistencia enviado a DAEM', normativaReferencia: 'Resolución 60/2019', plazoLegal: '2026-03-31', estado: 'VENCIDO', responsableId: 'r2', documentoRespaldo: '', observaciones: 'Pendiente de firma directora' },
  { id: 'ac6', area: 'ACADEMICA', nombre: 'Nómina de matrícula validada', descripcion: 'Nómina enviada a MINEDUC a través de SIGE', normativaReferencia: 'Decreto 152/2021', plazoLegal: '2026-04-15', estado: 'CUMPLIDO', responsableId: 'r1', documentoRespaldo: 'nomina_sige.pdf', observaciones: '' },
  { id: 'ac7', area: 'ACADEMICA', nombre: 'PIE – Registro SUR actualizado', descripcion: 'Registro de estudiantes PIE en sistema SUR vigente', normativaReferencia: 'Decreto 83/2015', plazoLegal: '2026-03-31', estado: 'CUMPLIDO', responsableId: 'r4', documentoRespaldo: 'sur_pie.pdf', observaciones: '' },
  { id: 'ac8', area: 'ACADEMICA', nombre: 'Docentes con título habilitante', descripcion: 'Verificación de títulos de todos los docentes en ejercicio', normativaReferencia: 'Ley 20.903', plazoLegal: '2026-02-28', estado: 'CUMPLIDO', responsableId: 'r1', documentoRespaldo: 'titulos_docentes.pdf', observaciones: '' },
  // FINANCIERA
  { id: 'fi1', area: 'FINANCIERA', nombre: 'Rendición SEP trimestre 1', descripcion: 'Rendición de cuentas recursos SEP primer trimestre', normativaReferencia: 'Ley 20.248 Art. 20', plazoLegal: '2026-04-30', estado: 'CUMPLIDO', responsableId: 'r5', documentoRespaldo: 'rendicion_sep_q1.pdf', observaciones: '' },
  { id: 'fi2', area: 'FINANCIERA', nombre: 'Presupuesto anual aprobado', descripcion: 'Presupuesto aprobado por Consejo Escolar', normativaReferencia: 'Ley 19.979 Art. 5', plazoLegal: '2026-01-31', estado: 'CUMPLIDO', responsableId: 'r5', documentoRespaldo: 'presupuesto_2026.pdf', observaciones: '' },
  { id: 'fi3', area: 'FINANCIERA', nombre: 'Declaración IVA mensual al día', descripcion: 'Formularios F29 presentados y pagados', normativaReferencia: 'DL 825', plazoLegal: '2026-04-15', estado: 'PENDIENTE', responsableId: 'r5', documentoRespaldo: '', observaciones: 'Vence el 15/04' },
  // LABORAL
  { id: 'la1', area: 'LABORAL', nombre: 'Contratos docentes firmados', descripcion: 'Todos los contratos del año lectivo firmados', normativaReferencia: 'Estatuto Docente Art. 24', plazoLegal: '2026-03-15', estado: 'CUMPLIDO', responsableId: 'r6', documentoRespaldo: 'contratos_docentes.pdf', observaciones: '' },
  { id: 'la2', area: 'LABORAL', nombre: 'Reglamento Interno de Orden actualizado', descripcion: 'RIOHS aprobado por la Inspección del Trabajo', normativaReferencia: 'Código del Trabajo Art. 153', plazoLegal: '2026-01-31', estado: 'VENCIDO', responsableId: 'r6', documentoRespaldo: '', observaciones: 'En revisión legal' },
  { id: 'la3', area: 'LABORAL', nombre: 'Liquidaciones de sueldo al día', descripcion: 'Liquidaciones entregadas dentro del período legal', normativaReferencia: 'Código del Trabajo Art. 54', plazoLegal: '2026-04-30', estado: 'CUMPLIDO', responsableId: 'r5', documentoRespaldo: 'liquidaciones_abr.pdf', observaciones: '' },
  { id: 'la4', area: 'LABORAL', nombre: 'Cotizaciones previsionales pagadas', descripcion: 'AFP e Isapre/Fonasa al día', normativaReferencia: 'Ley 17.322', plazoLegal: '2026-04-13', estado: 'VENCIDO', responsableId: 'r5', documentoRespaldo: '', observaciones: 'Retraso por error bancario' },
  // CONVIVENCIA
  { id: 'co1', area: 'CONVIVENCIA', nombre: 'Manual de Convivencia actualizado 2026', descripcion: 'Aprobado por Consejo Escolar y publicado en web', normativaReferencia: 'Ley 20.536', plazoLegal: '2026-03-31', estado: 'CUMPLIDO', responsableId: 'r7', documentoRespaldo: 'manual_convivencia.pdf', observaciones: '' },
  { id: 'co2', area: 'CONVIVENCIA', nombre: 'Protocolo de acoso escolar', descripcion: 'Protocolo actualizado y difundido a la comunidad', normativaReferencia: 'Ley 20.536 Art. 16B', plazoLegal: '2026-03-15', estado: 'CUMPLIDO', responsableId: 'r7', documentoRespaldo: 'protocolo_acoso.pdf', observaciones: '' },
  { id: 'co3', area: 'CONVIVENCIA', nombre: 'Registro de sanciones disciplinarias', descripcion: 'Libro de registro al día con todas las sanciones', normativaReferencia: 'Manual de Convivencia', plazoLegal: '2026-12-31', estado: 'CUMPLIDO', responsableId: 'r7', documentoRespaldo: 'libro_sanciones.pdf', observaciones: '' },
  { id: 'co4', area: 'CONVIVENCIA', nombre: 'Mediador escolar capacitado', descripcion: 'Al menos un mediador escolar con certificación vigente', normativaReferencia: 'Ley 20.536', plazoLegal: '2026-04-30', estado: 'PENDIENTE', responsableId: 'r7', documentoRespaldo: '', observaciones: 'Capacitación agendada para mayo' },
  // INFRAESTRUCTURA
  { id: 'in1', area: 'INFRAESTRUCTURA', nombre: 'Certificado de ONEMI / Bomberos vigente', descripcion: 'Certificado de evacuación emitido por autoridades', normativaReferencia: 'DS 594/1999', plazoLegal: '2026-06-30', estado: 'CUMPLIDO', responsableId: 'r8', documentoRespaldo: 'cert_onemi.pdf', observaciones: '' },
  { id: 'in2', area: 'INFRAESTRUCTURA', nombre: 'Plan de emergencia actualizado', descripcion: 'Plan de evacuación y emergencias revisado y aprobado', normativaReferencia: 'DS 594/1999', plazoLegal: '2026-03-31', estado: 'VENCIDO', responsableId: 'r8', documentoRespaldo: '', observaciones: 'Pendiente de actualización de planos' },
  { id: 'in3', area: 'INFRAESTRUCTURA', nombre: 'Mantención extintores al día', descripcion: 'Servicio de recarga y certificación de extintores', normativaReferencia: 'DS 369/1996', plazoLegal: '2026-05-31', estado: 'PENDIENTE', responsableId: 'r8', documentoRespaldo: '', observaciones: 'Cotización enviada' },
];

// ─── Config ───────────────────────────────────────────────────────────────────

const areaConfig: Record<Area, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  ACADEMICA:       { label: 'Académica',       icon: <BookOpen size={16} />,  color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  FINANCIERA:      { label: 'Financiera',      icon: <DollarSign size={16} />, color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
  LABORAL:         { label: 'Laboral',         icon: <Users size={16} />,      color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)' },
  CONVIVENCIA:     { label: 'Convivencia',     icon: <Shield size={16} />,     color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
  INFRAESTRUCTURA: { label: 'Infraestructura', icon: <Building2 size={16} />, color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',  border: 'rgba(6,182,212,0.25)' },
};

const estadoConfig: Record<ItemEstado, { label: string; icon: React.ReactNode; color: string; bg: string; border: string }> = {
  CUMPLIDO:  { label: 'Cumplido',  icon: <CheckCircle size={13} />,  color: '#10b981', bg: 'rgba(16,185,129,0.15)', border: 'rgba(16,185,129,0.3)' },
  PENDIENTE: { label: 'Pendiente', icon: <Clock size={13} />,        color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.3)' },
  VENCIDO:   { label: 'Vencido',   icon: <AlertTriangle size={13} />,color: '#ef4444', bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.3)' },
  NO_APLICA: { label: 'No Aplica', icon: <MinusCircle size={13} />,  color: 'var(--muted)', bg: 'rgba(136,153,170,0.15)', border: 'rgba(136,153,170,0.3)' },
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const CircularGauge: React.FC<{ value: number; size?: number }> = ({ value, size = 120 }) => {
  const radius = (size - 16) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (value / 100) * circ;
  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={10} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.4s' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color, fontSize: 26, fontWeight: 800 }}>{value}%</span>
        <span style={{ color: 'var(--muted)', fontSize: 11 }}>cumplimiento</span>
      </div>
    </div>
  );
};

const ProgressBar: React.FC<{ value: number; color: string; height?: number }> = ({ value, color, height = 6 }) => (
  <div style={{ width: '100%', height, background: 'rgba(255,255,255,0.06)', borderRadius: height / 2, overflow: 'hidden' }}>
    <div style={{ width: `${Math.min(value, 100)}%`, height: '100%', background: color, borderRadius: height / 2, transition: 'width 0.5s ease' }} />
  </div>
);

const EstadoBadge: React.FC<{ estado: ItemEstado }> = ({ estado }) => {
  const cfg = estadoConfig[estado];
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {cfg.icon}{cfg.label}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const Cumplimiento: React.FC = () => {
  const [resumen, setResumen] = useState<ResumenGlobal>(mockResumen);
  const [items, setItems] = useState<ItemCumplimiento[]>(mockItems);
  const [activeArea, setActiveArea] = useState<Area>('ACADEMICA');
  const [estadoFilter, setEstadoFilter] = useState<string>('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const fetchResumen = useCallback(async () => {
    try {
      const res = await api.get('/cumplimiento/resumen');
      if (res.data?.data) setResumen(res.data.data);
    } catch { /* use mock */ }
  }, []);

  const fetchItems = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (activeArea) params.area = activeArea;
      if (estadoFilter) params.estado = estadoFilter;
      const res = await api.get('/cumplimiento/items', { params });
      if (res.data?.data) setItems(res.data.data);
    } catch { /* use mock */ }
  }, [activeArea, estadoFilter]);

  useEffect(() => { fetchResumen(); }, [fetchResumen]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  const handleMarcarCumplido = async (id: string) => {
    try {
      await api.patch(`/cumplimiento/items/${id}`, { estado: 'CUMPLIDO' });
    } catch { /* optimistic update below */ }
    setItems(prev => prev.map(item => item.id === id ? { ...item, estado: 'CUMPLIDO' } : item));
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const areaItems = items.filter(i => i.area === activeArea && (!estadoFilter || i.estado === estadoFilter));
  const areaResumen = resumen.resumenPorArea.find(r => r.area === activeArea);
  const areas = Object.keys(areaConfig) as Area[];

  const totalPendientes = resumen.resumenPorArea.reduce((s, a) => s + a.pendientes, 0);

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>Cumplimiento Normativo</h1>
        <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>Seguimiento de obligaciones legales y normativas del establecimiento</p>
      </div>

      {/* ── Global KPIs ── */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
        {/* Gauge */}
        <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
          <CircularGauge value={resumen.porcentajeCumplimiento} size={120} />
          <div>
            <div style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Cumplimiento Global</div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 12 }}>Índice consolidado de todas las áreas</div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <div style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>{resumen.totalCumplidos}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Cumplidos</div>
              </div>
              <div>
                <div style={{ color: '#ef4444', fontSize: 18, fontWeight: 700 }}>{resumen.totalVencidos}</div>
                <div style={{ color: 'var(--muted)', fontSize: 11 }}>Vencidos</div>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'flex', gap: 14, flex: 1, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Items', value: resumen.totalItems, color: '#3b82f6', icon: <FileText size={18} />, sub: 'requisitos normativos' },
            { label: 'Cumplidos', value: resumen.totalCumplidos, color: '#10b981', icon: <CheckCircle size={18} />, sub: 'al día' },
            { label: 'Pendientes', value: totalPendientes, color: '#f59e0b', icon: <Clock size={18} />, sub: 'por gestionar' },
            { label: 'Vencidos', value: resumen.totalVencidos, color: '#ef4444', icon: <AlertTriangle size={18} />, sub: 'requieren acción urgente' },
          ].map(card => (
            <div key={card.label} style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, padding: '18px 20px', flex: 1, minWidth: 130 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 500 }}>{card.label}</span>
                <span style={{ color: card.color }}>{card.icon}</span>
              </div>
              <div style={{ color: 'var(--text-primary)', fontSize: 28, fontWeight: 800, lineHeight: 1 }}>{card.value}</div>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 4 }}>{card.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Area Tabs + Estado Filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {areas.map(area => {
            const cfg = areaConfig[area];
            const isActive = activeArea === area;
            const aRes = resumen.resumenPorArea.find(r => r.area === area);
            return (
              <button key={area} onClick={() => setActiveArea(area)} style={{
                background: isActive ? cfg.bg : 'var(--card)',
                border: `1px solid ${isActive ? cfg.border : 'var(--border)'}`,
                color: isActive ? cfg.color : 'var(--muted)',
                borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
              }}>
                {cfg.icon}
                {cfg.label}
                {aRes && aRes.vencidos > 0 && (
                  <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 10, fontWeight: 700 }}>{aRes.vencidos}</span>
                )}
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ value: '', label: 'Todos' }, { value: 'CUMPLIDO', label: 'Cumplidos' }, { value: 'PENDIENTE', label: 'Pendientes' }, { value: 'VENCIDO', label: 'Vencidos' }].map(f => (
            <button key={f.value} onClick={() => setEstadoFilter(f.value)} style={{
              background: estadoFilter === f.value ? 'rgba(59,130,246,0.15)' : 'var(--card)',
              border: `1px solid ${estadoFilter === f.value ? 'rgba(59,130,246,0.4)' : 'var(--border)'}`,
              color: estadoFilter === f.value ? '#3b82f6' : 'var(--muted)',
              borderRadius: 20, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Area Card ── */}
      <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, overflow: 'hidden' }}>
        {/* Area Header */}
        {areaResumen && (() => {
          const cfg = areaConfig[activeArea];
          const pct = Math.round((areaResumen.cumplidos / areaResumen.total) * 100);
          return (
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a3a4a', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 8, padding: 8, color: cfg.color }}>
                {cfg.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-primary)', fontSize: 15, fontWeight: 700 }}>{cfg.label}</span>
                  <span style={{ color: cfg.color, fontSize: 13, fontWeight: 600 }}>{pct}% cumplido</span>
                  <span style={{ color: 'var(--muted)', fontSize: 12 }}>({areaResumen.cumplidos}/{areaResumen.total})</span>
                </div>
                <ProgressBar value={pct} color={cfg.color} height={6} />
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                {[
                  { label: 'Cumplidos', val: areaResumen.cumplidos, color: '#10b981' },
                  { label: 'Pendientes', val: areaResumen.pendientes, color: '#f59e0b' },
                  { label: 'Vencidos', val: areaResumen.vencidos, color: '#ef4444' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ color: s.color, fontSize: 18, fontWeight: 700 }}>{s.val}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Items List */}
        <div>
          {areaItems.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              No hay items para mostrar con los filtros actuales.
            </div>
          ) : (
            areaItems.map((item, idx) => {
              const cfg = estadoConfig[item.estado];
              const isVencido = item.estado === 'VENCIDO';
              const isCumplido = item.estado === 'CUMPLIDO';
              const isExpanded = expandedItems.has(item.id);

              return (
                <div key={item.id} style={{
                  borderTop: idx > 0 ? '1px solid #2a3a4a' : 'none',
                  background: isVencido ? 'rgba(239,68,68,0.04)' : 'transparent',
                  borderLeft: isVencido ? '3px solid rgba(239,68,68,0.4)' : '3px solid transparent',
                }}>
                  {/* Item Row */}
                  <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                    {/* Estado Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: cfg.bg, border: `1px solid ${cfg.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: cfg.color,
                    }}>
                      {cfg.icon}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{
                          color: isCumplido ? 'var(--muted)' : 'var(--text-primary)',
                          fontSize: 14, fontWeight: 600,
                          textDecoration: isCumplido ? 'line-through' : 'none',
                          opacity: isCumplido ? 0.7 : 1,
                        }}>{item.nombre}</span>
                        <EstadoBadge estado={item.estado} />
                      </div>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <span style={{ color: 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <FileText size={11} /> {item.normativaReferencia}
                        </span>
                        <span style={{ color: isVencido ? '#ef4444' : 'var(--muted)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, fontWeight: isVencido ? 600 : 400 }}>
                          <Clock size={11} /> Plazo: {new Date(item.plazoLegal).toLocaleDateString('es-CL')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      {item.estado === 'PENDIENTE' && (
                        <button onClick={() => handleMarcarCumplido(item.id)} style={{
                          background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)',
                          color: '#10b981', borderRadius: 7, padding: '6px 12px', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <Check size={13} /> Marcar cumplido
                        </button>
                      )}
                      {item.estado === 'VENCIDO' && (
                        <button onClick={() => handleMarcarCumplido(item.id)} style={{
                          background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444', borderRadius: 7, padding: '6px 12px', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
                        }}>
                          <Check size={13} /> Regularizar
                        </button>
                      )}
                      <button onClick={() => toggleExpand(item.id)} style={{
                        background: 'transparent', border: '1px solid #2a3a4a', color: 'var(--muted)',
                        borderRadius: 6, padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      }}>
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div style={{ padding: '0 20px 16px 66px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      <div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Descripción</div>
                        <div style={{ color: 'var(--text-alt)', fontSize: 13 }}>{item.descripcion || '—'}</div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Observaciones</div>
                        <div style={{ color: 'var(--text-alt)', fontSize: 13 }}>{item.observaciones || '—'}</div>
                      </div>
                      {item.documentoRespaldo && (
                        <div>
                          <div style={{ color: 'var(--muted)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>Documento Respaldo</div>
                          <a href={`/documentos/${item.documentoRespaldo}`} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none' }}>
                            <FileText size={13} /> {item.documentoRespaldo}
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Cumplimiento;
