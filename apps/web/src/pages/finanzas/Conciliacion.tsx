import React, { useState, useEffect, useRef, DragEvent } from 'react';
import { RefreshCw, Upload, FileText, CheckCircle, AlertCircle, Clock, Inbox } from 'lucide-react';
import api from '../../api/client';

const colors = {
  bg: 'var(--bg)',
  card: 'var(--card)',
  border: 'var(--border)',
  muted: 'var(--muted)',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
  blue: '#3b82f6',
  cyan: '#06b6d4',
};

interface Conciliacion {
  id: string;
  fecha: string;
  entidad: string;
  movimientosTotal: number;
  conciliados: number;
  pendientes: number;
  estado: 'CONCILIADO' | 'PARCIAL' | 'PENDIENTE';
}

interface ImportResult {
  matched: number;
  unmatched: number;
  total: number;
}

const estadoConfig = {
  CONCILIADO: { color: colors.green, label: 'Conciliado', bg: '#0e2218', Icon: CheckCircle },
  PARCIAL: { color: colors.amber, label: 'Parcial', bg: '#2a1f0a', Icon: AlertCircle },
  PENDIENTE: { color: colors.muted, label: 'Pendiente', bg: 'var(--card)', Icon: Clock },
};

export default function Conciliacion() {
  const [items, setItems] = useState<Conciliacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/finanzas/conciliacion');
      setItems(res.data.data ?? []);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/finanzas/conciliacion/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportResult(res.data.data ?? { matched: 0, unmatched: 0, total: 0 });
      await fetchData();
    } catch (e: any) {
      setError(e?.message || 'Error al importar archivo');
    } finally {
      setImporting(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleImport(file);
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImport(file);
  };

  return (
    <div style={{ minHeight: '100vh', background: colors.bg, padding: '24px', color: 'var(--text-body)' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0 }}>Conciliación Bancaria</h1>
          <p style={{ color: colors.muted, margin: '4px 0 0', fontSize: '14px' }}>Importación y revisión de cartolas bancarias</p>
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

      {/* Error */}
      {error && (
        <div style={{ background: '#2d1b1b', border: `1px solid ${colors.red}`, borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', color: colors.red, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Import Result */}
      {importResult && (
        <div style={{ background: '#0e2218', border: `1px solid ${colors.green}60`, borderRadius: '10px', padding: '16px 20px', marginBottom: '20px', display: 'flex', gap: '24px', alignItems: 'center' }}>
          <CheckCircle size={20} style={{ color: colors.green, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: colors.green, marginBottom: '4px' }}>Importación completada</div>
            <div style={{ fontSize: '13px', color: colors.muted }}>
              Total: <strong style={{ color: 'var(--text-body)' }}>{importResult.total}</strong> movimientos —{' '}
              <span style={{ color: colors.green }}>{importResult.matched} conciliados</span> /{' '}
              <span style={{ color: colors.amber }}>{importResult.unmatched} sin conciliar</span>
            </div>
          </div>
        </div>
      )}

      {/* Drag & Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? colors.cyan : colors.border}`,
          borderRadius: '14px',
          padding: '40px 24px',
          textAlign: 'center',
          marginBottom: '28px',
          background: dragging ? '#091f2a' : colors.card,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onClick={() => fileInputRef.current?.click()}
      >
        <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={onFileChange} />
        <div style={{ width: '56px', height: '56px', background: dragging ? '#0e3344' : 'var(--card-deep)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <Upload size={24} style={{ color: dragging ? colors.cyan : colors.muted }} />
        </div>
        {importing ? (
          <div style={{ color: colors.cyan, fontWeight: 600 }}>Importando...</div>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: '16px', color: dragging ? colors.cyan : 'var(--text-body)', marginBottom: '6px' }}>
              {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
            </div>
            <div style={{ color: colors.muted, fontSize: '13px', marginBottom: '16px' }}>
              Soporta archivos Excel (.xlsx, .xls) y CSV
            </div>
            <button
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '8px',
                padding: '10px 20px', background: colors.cyan + '20',
                border: `1px solid ${colors.cyan}60`, borderRadius: '8px',
                color: colors.cyan, fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              }}
              onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              <FileText size={16} />
              Importar Cartola Excel/CSV
            </button>
          </>
        )}
      </div>

      {/* Table or Empty */}
      {items.length === 0 && !loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px' }}>
          <Inbox size={40} style={{ color: colors.muted, marginBottom: '14px', opacity: 0.5 }} />
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-body)', marginBottom: '6px' }}>Sin conciliaciones registradas</div>
          <div style={{ color: colors.muted, fontSize: '13px' }}>Importa una cartola bancaria para comenzar.</div>
        </div>
      ) : (
        <div style={{ background: colors.card, border: `1px solid ${colors.border}`, borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={16} style={{ color: colors.muted }} />
            <span style={{ fontWeight: 600, fontSize: '15px' }}>Historial de Conciliaciones</span>
            <span style={{ marginLeft: 'auto', background: 'var(--card-deep)', color: colors.muted, borderRadius: '20px', padding: '2px 10px', fontSize: '12px' }}>
              {items.length} registros
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'var(--card-deep)' }}>
                  {['Fecha', 'Entidad', 'Total Movimientos', 'Conciliados', 'Pendientes', 'Estado'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: h === 'Fecha' || h === 'Entidad' ? 'left' : 'right', color: colors.muted, fontWeight: 600, fontSize: '12px', borderBottom: `1px solid ${colors.border}` }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const cfg = estadoConfig[item.estado] ?? estadoConfig.PENDIENTE;
                  return (
                    <tr key={item.id} style={{ borderBottom: `1px solid ${colors.border}20` }}>
                      <td style={{ padding: '12px 16px', color: 'var(--text-alt)' }}>{item.fecha}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{item.entidad}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-body)' }}>{item.movimientosTotal}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: colors.green }}>{item.conciliados}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', color: item.pendientes > 0 ? colors.amber : colors.muted }}>{item.pendientes}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          background: cfg.bg, color: cfg.color,
                          border: `1px solid ${cfg.color}40`,
                          borderRadius: '20px', padding: '3px 10px',
                          fontSize: '11px', fontWeight: 600,
                        }}>
                          <cfg.Icon size={11} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
