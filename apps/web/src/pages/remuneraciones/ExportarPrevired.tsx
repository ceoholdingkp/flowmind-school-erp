import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
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
};

const MESES = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

interface PreviredRow {
  rut: string;
  nombre: string;
  afp: string;
  montoAfp: number;
  salud: string;
  montoSalud: number;
  seguroCesantia: number;
  sueldoBruto: number;
  sueldoImponible: number;
  impuestoUnico: number;
  sueldoLiquido: number;
  diasTrabajados: number;
  mes: number;
  anio: number;
}

const CSV_HEADERS = [
  'RUT', 'NOMBRE', 'AFP', 'MONTO_AFP', 'SALUD', 'MONTO_SALUD',
  'SEGURO_CESANTIA', 'SUELDO_BRUTO', 'SUELDO_IMPONIBLE',
  'IMPUESTO_UNICO', 'SUELDO_LIQUIDO', 'DIAS_TRABAJADOS', 'MES', 'ANO',
];

function rowToCsvLine(row: PreviredRow): string {
  return [
    row.rut,
    row.nombre,
    row.afp,
    row.montoAfp,
    row.salud,
    row.montoSalud,
    row.seguroCesantia,
    row.sueldoBruto,
    row.sueldoImponible,
    row.impuestoUnico,
    row.sueldoLiquido,
    row.diasTrabajados,
    row.mes,
    row.anio,
  ].join(';');
}

export default function ExportarPrevired() {
  const now = new Date();
  const [mes, setMes] = useState<number>(now.getMonth() + 1);
  const [anio, setAnio] = useState<number>(2026);
  const [rows, setRows] = useState<PreviredRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/remuneraciones/previred', { params: { mes, anio } });
      setRows(Array.isArray(res.data) ? res.data : (res.data.data ?? []));
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message || 'Error al cargar datos Previred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [mes, anio]);

  const handleDownloadCsv = () => {
    if (rows.length === 0) return;
    const header = CSV_HEADERS.join(';');
    const lines = rows.map(rowToCsvLine);
    const csvContent = [header, ...lines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `previred_${anio}_${String(mes).padStart(2, '0')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const TABLE_COLS: { label: string; key: keyof PreviredRow; align?: 'right'; render?: (row: PreviredRow) => React.ReactNode }[] = [
    { label: 'RUT', key: 'rut' },
    { label: 'Nombre', key: 'nombre' },
    { label: 'AFP', key: 'afp' },
    { label: 'Monto AFP', key: 'montoAfp', align: 'right', render: r => fmt(r.montoAfp) },
    { label: 'Salud', key: 'salud' },
    { label: 'Monto Salud', key: 'montoSalud', align: 'right', render: r => fmt(r.montoSalud) },
    { label: 'Seg. Cesantía', key: 'seguroCesantia', align: 'right', render: r => fmt(r.seguroCesantia) },
    { label: 'S. Bruto', key: 'sueldoBruto', align: 'right', render: r => fmt(r.sueldoBruto) },
    { label: 'S. Imponible', key: 'sueldoImponible', align: 'right', render: r => fmt(r.sueldoImponible) },
    { label: 'Imp. Único', key: 'impuestoUnico', align: 'right', render: r => fmt(r.impuestoUnico) },
    { label: 'S. Líquido', key: 'sueldoLiquido', align: 'right', render: r => <span style={{ color: colors.green, fontWeight: 700 }}>{fmt(r.sueldoLiquido)}</span> },
    { label: 'Días', key: 'diasTrabajados', align: 'right' },
    { label: 'Mes', key: 'mes' },
    { label: 'Año', key: 'anio' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'rgba(22,163,74,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Download size={22} style={{ color: colors.green }} />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>Exportar Previred</h1>
            <p style={{ color: colors.muted, margin: '3px 0 0', fontSize: '13px' }}>Generación del archivo mensual para plataforma Previred</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-body)', cursor: 'pointer', fontSize: '14px' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* Selectors + Download */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '14px', flexWrap: 'wrap', marginBottom: '24px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: '18px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mes</label>
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '8px 12px', background: 'var(--bg)', border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', minWidth: 140 }}
          >
            {MESES.slice(1).map((nombre, idx) => (
              <option key={idx + 1} value={idx + 1}>{nombre}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <label style={{ fontSize: '11px', fontWeight: 600, color: colors.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Año</label>
          <select
            value={anio}
            onChange={e => setAnio(Number(e.target.value))}
            style={{ padding: '8px 12px', background: 'var(--bg)', border: `1px solid ${colors.border}`, borderRadius: '8px', color: 'var(--text-primary)', fontSize: '14px', cursor: 'pointer', minWidth: 100 }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleDownloadCsv}
            disabled={rows.length === 0 || loading}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '10px 20px', background: rows.length > 0 ? colors.green : colors.muted,
              border: 'none', borderRadius: '8px', color: '#fff',
              fontWeight: 700, fontSize: '14px',
              cursor: rows.length > 0 && !loading ? 'pointer' : 'not-allowed',
              opacity: rows.length === 0 || loading ? 0.5 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            <Download size={15} />
            Descargar CSV
          </button>
        </div>
      </div>

      {/* Info: format note */}
      {rows.length > 0 && (
        <div style={{ fontSize: '12px', color: colors.muted, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ background: `${colors.blue}15`, color: colors.blue, borderRadius: 4, padding: '2px 8px', fontWeight: 600, fontSize: '11px' }}>CSV</span>
          Separado por punto y coma (;) · {rows.length} registro{rows.length !== 1 ? 's' : ''} · {MESES[mes]} {anio}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Preview Table */}
      <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Vista previa del archivo</span>
          {!loading && rows.length > 0 && (
            <span style={{ fontSize: '12px', color: colors.muted }}>{rows.length} registros</span>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'var(--sidebar)' }}>
                {TABLE_COLS.map(col => (
                  <th key={col.key} style={{ padding: '11px 14px', textAlign: col.align ?? 'left', color: colors.muted, fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: `1px solid ${colors.border}`, whiteSpace: 'nowrap' }}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Skeleton */}
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                  {TABLE_COLS.map(col => (
                    <td key={col.key} style={{ padding: '11px 14px' }}>
                      <div style={{ height: 12, background: `${colors.muted}20`, borderRadius: 4, animation: 'pulse 1.5s ease-in-out infinite', width: col.key === 'nombre' ? 120 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Data */}
              {!loading && rows.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: `1px solid ${colors.border}15` }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--nav-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {TABLE_COLS.map(col => (
                    <td key={col.key} style={{ padding: '11px 14px', textAlign: col.align ?? 'left', color: 'var(--text-body)', whiteSpace: 'nowrap' }}>
                      {col.render ? col.render(row) : String(row[col.key])}
                    </td>
                  ))}
                </tr>
              ))}

              {/* Empty */}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={TABLE_COLS.length} style={{ padding: '60px 20px', textAlign: 'center', color: colors.muted }}>
                    <Download size={34} style={{ margin: '0 auto 12px', opacity: 0.3, display: 'block' }} />
                    <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: 4, color: 'var(--text-body)' }}>Sin datos para exportar</div>
                    <div style={{ fontSize: '13px' }}>No hay liquidaciones procesadas para {MESES[mes]} {anio}.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
