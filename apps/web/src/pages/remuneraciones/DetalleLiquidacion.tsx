import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, DollarSign, Download, RefreshCw } from 'lucide-react';
import api from '../../api/client';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const colors = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#16a34a',
  red: '#ef4444',
  blue: '#3b82f6',
  gray: '#6b7280',
};

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const ESTADO_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  BORRADOR: { color: colors.gray, bg: 'rgba(107,114,128,0.12)', label: 'Borrador' },
  APROBADA: { color: colors.blue, bg: 'rgba(59,130,246,0.12)', label: 'Aprobada' },
  PAGADA: { color: colors.green, bg: 'rgba(22,163,74,0.12)', label: 'Pagada' },
};

interface LiquidacionDetalle {
  id: string;
  funcionario: {
    nombres: string;
    apellidos: string;
    run: string;
    cargo: string;
    tipo: string;
  };
  mes: number;
  anio: number;
  diasTrabajados: number;
  sueldoBase: number;
  asignacionFamiliar: number;
  bonoZona: number;
  horasExtra: number;
  otrosHaberes: number;
  totalHaberes: number;
  afp: string;
  tasaAfp: number;
  montoAfp: number;
  salud: string;
  montoSalud: number;
  seguroCesantia: number;
  impuestoUnico: number;
  otrosDescuentos: number;
  totalDescuentos: number;
  sueldoLiquido: number;
  estado: string;
  fechaPago: string | null;
}

function SectionRow({ label, value, highlighted = false }: { label: string; value: string; highlighted?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${colors.border}20` }}>
      <span style={{ color: highlighted ? 'var(--text-primary)' : colors.muted, fontSize: '13px', fontWeight: highlighted ? 600 : 400 }}>{label}</span>
      <span style={{ color: highlighted ? 'var(--text-primary)' : 'var(--text-body)', fontSize: '13px', fontWeight: highlighted ? 700 : 500 }}>{value}</span>
    </div>
  );
}

function SectionTotal({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', background: `${color}10`, borderRadius: 8, marginTop: 8, border: `1px solid ${color}30` }}>
      <span style={{ fontSize: '13px', fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
      <span style={{ fontSize: '16px', fontWeight: 800, color }}>{value}</span>
    </div>
  );
}

export default function DetalleLiquidacion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<LiquidacionDetalle | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    api.get(`/remuneraciones/liquidaciones/${id}`)
      .then(res => setData(res.data))
      .catch((e: unknown) => {
        const err = e as { message?: string };
        setError(err?.message || 'Error al cargar la liquidación');
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: colors.muted }}>
          <RefreshCw size={28} style={{ animation: 'spin 1s linear infinite' }} />
        </div>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px' }}>
        <button onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px', background: 'none', border: 'none', color: colors.muted, cursor: 'pointer', fontSize: '14px' }}>
          <ArrowLeft size={16} /> Volver
        </button>
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: 8, padding: '14px 18px', color: colors.red }}>{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const cfg = ESTADO_CONFIG[data.estado] ?? ESTADO_CONFIG['BORRADOR'];

  const haberes = [
    { label: 'Sueldo Base', value: data.sueldoBase, always: true },
    { label: 'Asignación Familiar', value: data.asignacionFamiliar, always: false },
    { label: 'Bono Zona', value: data.bonoZona, always: false },
    { label: 'Horas Extra', value: data.horasExtra, always: false },
    { label: 'Otros Haberes', value: data.otrosHaberes, always: false },
  ].filter(h => h.always || h.value > 0);

  const descuentos = [
    { label: `AFP ${data.afp} (${data.tasaAfp}%)`, value: data.montoAfp },
    { label: `${data.salud} (7%)`, value: data.montoSalud },
    { label: 'Seguro de Cesantía (0.6%)', value: data.seguroCesantia },
    { label: 'Impuesto Único 2ª Categoría', value: data.impuestoUnico },
    { label: 'Otros Descuentos', value: data.otrosDescuentos },
  ].filter(d => d.value > 0);

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', padding: '7px 14px', color: 'var(--text-body)', cursor: 'pointer', fontSize: '13px', fontWeight: 500 }}
      >
        <ArrowLeft size={15} />
        Volver a Liquidaciones
      </button>

      {/* Header card */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '22px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: 52, height: 52, borderRadius: 12, background: 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <DollarSign size={26} style={{ color: colors.blue }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)' }}>
                {data.funcionario.apellidos} {data.funcionario.nombres}
              </h2>
              <div style={{ color: colors.muted, fontSize: '13px', marginTop: '4px' }}>
                RUN: <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{data.funcionario.run}</span>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                {data.funcionario.cargo}
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <span style={{ fontSize: '12px', opacity: 0.8 }}>{data.funcionario.tipo}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
            <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: '20px', padding: '4px 14px', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>
              {cfg.label.toUpperCase()}
            </span>
            <div style={{ fontSize: '13px', color: colors.muted, textAlign: 'right' }}>
              Período: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{MESES[data.mes]} {data.anio}</span>
            </div>
            <div style={{ fontSize: '12px', color: colors.muted }}>
              Días trabajados: <span style={{ color: 'var(--text-body)', fontWeight: 500 }}>{data.diasTrabajados}</span>
            </div>
            {data.fechaPago && (
              <div style={{ fontSize: '12px', color: colors.muted }}>
                Fecha pago: <span style={{ color: colors.green, fontWeight: 500 }}>{new Date(data.fechaPago).toLocaleDateString('es-CL')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '20px' }}>
        {/* Haberes */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ width: 6, height: 22, background: colors.blue, borderRadius: 3 }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: colors.blue, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Haberes</h3>
          </div>
          {haberes.map(h => (
            <SectionRow key={h.label} label={h.label} value={fmt(h.value)} />
          ))}
          <SectionTotal label="Total Haberes" value={fmt(data.totalHaberes)} color={colors.blue} />
        </div>

        {/* Descuentos */}
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', paddingBottom: '12px', borderBottom: `1px solid ${colors.border}` }}>
            <div style={{ width: 6, height: 22, background: colors.red, borderRadius: 3 }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: colors.red, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Descuentos</h3>
          </div>
          {descuentos.length === 0 ? (
            <div style={{ color: colors.muted, fontSize: '13px', padding: '8px 0' }}>Sin descuentos registrados</div>
          ) : (
            descuentos.map(d => (
              <SectionRow key={d.label} label={d.label} value={fmt(d.value)} />
            ))
          )}
          <SectionTotal label="Total Descuentos" value={fmt(data.totalDescuentos)} color={colors.red} />
        </div>
      </div>

      {/* Sueldo Líquido */}
      <div style={{ background: 'rgba(22,163,74,0.07)', border: `2px solid ${colors.green}40`, borderRadius: 14, padding: '28px', textAlign: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', fontWeight: 700, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Sueldo Líquido a Pagar</div>
        <div style={{ fontSize: '46px', fontWeight: 900, color: colors.green, letterSpacing: '-1px' }}>{fmt(data.sueldoLiquido)}</div>
        <div style={{ fontSize: '13px', color: colors.muted, marginTop: '8px' }}>
          {MESES[data.mes]} {data.anio} · {data.diasTrabajados} días trabajados
        </div>
      </div>

      {/* Download button (stub) */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          disabled
          style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: colors.muted, fontWeight: 600, fontSize: '14px', cursor: 'not-allowed', opacity: 0.5 }}
        >
          <Download size={15} />
          Descargar PDF
        </button>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
