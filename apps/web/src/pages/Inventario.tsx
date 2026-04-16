import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, Eye, Pencil, X, Search, Plus, TrendingUp,
  CheckCircle, AlertTriangle, XCircle, DollarSign, Monitor,
  Armchair, Layers, Box, ChevronDown, Download
} from 'lucide-react';
import { exportToCSV } from '../utils/export';
import api from '../api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Sala { nombre: string; }
interface Responsable { nombres: string; apellidos: string; }

interface Bien {
  id: string;
  codigoInventario: string;
  nombre: string;
  descripcion: string;
  categoria: 'TECNOLOGICO' | 'MOBILIARIO' | 'FUNGIBLE' | 'ACTIVO_FIJO';
  marca: string;
  modelo: string;
  salaId: string;
  responsableId: string;
  estado: 'BUENO' | 'REGULAR' | 'MALO' | 'DADO_DE_BAJA';
  valorAdquisicion: number;
  fechaAdquisicion: string;
  fondoCompra: string;
  sala: Sala;
  responsable: Responsable;
}

interface DashboardData {
  total: number;
  valorTotal: number;
  porCategoria: { categoria: string; cantidad: number }[];
  porEstado: { estado: string; cantidad: number }[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCLP = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const categoriaColor: Record<string, { bg: string; text: string; border: string }> = {
  TECNOLOGICO: { bg: 'rgba(6,182,212,0.15)',   text: '#06b6d4', border: 'rgba(6,182,212,0.3)'   }, // cyan
  MOBILIARIO:  { bg: 'rgba(139,92,246,0.15)',  text: '#8b5cf6', border: 'rgba(139,92,246,0.3)'  }, // purple
  FUNGIBLE:    { bg: 'rgba(16,185,129,0.15)',  text: '#10b981', border: 'rgba(16,185,129,0.3)'  }, // green
  ACTIVO_FIJO: { bg: 'rgba(245,158,11,0.15)',  text: '#f59e0b', border: 'rgba(245,158,11,0.3)'  }, // amber
};

const estadoColor: Record<string, { bg: string; text: string; border: string }> = {
  BUENO:        { bg: 'rgba(16,185,129,0.15)', text: '#10b981', border: 'rgba(16,185,129,0.3)' },
  REGULAR:      { bg: 'rgba(245,158,11,0.15)', text: '#f59e0b', border: 'rgba(245,158,11,0.3)' },
  MALO:         { bg: 'rgba(239,68,68,0.15)',  text: '#ef4444', border: 'rgba(239,68,68,0.3)' },
  DADO_DE_BAJA: { bg: 'rgba(136,153,170,0.15)', text: 'var(--muted)', border: 'rgba(136,153,170,0.3)' },
};

const categoriaLabel: Record<string, string> = {
  TECNOLOGICO: 'Tecnológico', MOBILIARIO: 'Mobiliario',
  FUNGIBLE: 'Fungible', ACTIVO_FIJO: 'Activo Fijo',
};

// ─── Mock data (replace fetch with real API calls) ───────────────────────────

const mockDashboard: DashboardData = {
  total: 248,
  valorTotal: 45320000,
  porCategoria: [
    { categoria: 'TECNOLOGICO', cantidad: 87 },
    { categoria: 'MOBILIARIO', cantidad: 102 },
    { categoria: 'FUNGIBLE', cantidad: 34 },
    { categoria: 'ACTIVO_FIJO', cantidad: 25 },
  ],
  porEstado: [
    { estado: 'BUENO', cantidad: 178 },
    { estado: 'REGULAR', cantidad: 42 },
    { estado: 'MALO', cantidad: 11 },
    { estado: 'DADO_DE_BAJA', cantidad: 17 },
  ],
};

const mockBienes: Bien[] = [
  { id: '1', codigoInventario: 'TEC-001', nombre: 'Notebook Dell Latitude', descripcion: '', categoria: 'TECNOLOGICO', marca: 'Dell', modelo: 'Latitude 5530', salaId: 's1', responsableId: 'r1', estado: 'BUENO', valorAdquisicion: 850000, fechaAdquisicion: '2024-03-15', fondoCompra: 'PIE', sala: { nombre: 'Sala Computación' }, responsable: { nombres: 'Ana', apellidos: 'González' } },
  { id: '2', codigoInventario: 'MOB-045', nombre: 'Silla Ergonómica', descripcion: '', categoria: 'MOBILIARIO', marca: 'Silla Pro', modelo: 'EP-200', salaId: 's2', responsableId: 'r2', estado: 'BUENO', valorAdquisicion: 120000, fechaAdquisicion: '2023-08-10', fondoCompra: 'SEP', sala: { nombre: 'Dirección' }, responsable: { nombres: 'Carlos', apellidos: 'Muñoz' } },
  { id: '3', codigoInventario: 'TEC-023', nombre: 'Proyector Epson', descripcion: '', categoria: 'TECNOLOGICO', marca: 'Epson', modelo: 'PowerLite X51', salaId: 's3', responsableId: 'r3', estado: 'REGULAR', valorAdquisicion: 380000, fechaAdquisicion: '2022-11-20', fondoCompra: 'SEP', sala: { nombre: 'Sala 3A' }, responsable: { nombres: 'Luisa', apellidos: 'Pérez' } },
  { id: '4', codigoInventario: 'FUN-012', nombre: 'Resmas de Papel A4', descripcion: '', categoria: 'FUNGIBLE', marca: 'Navigator', modelo: 'A4 80g', salaId: 's4', responsableId: 'r1', estado: 'BUENO', valorAdquisicion: 15000, fechaAdquisicion: '2025-01-08', fondoCompra: 'FPM', sala: { nombre: 'Bodega' }, responsable: { nombres: 'Ana', apellidos: 'González' } },
  { id: '5', codigoInventario: 'ACT-007', nombre: 'Generador Eléctrico', descripcion: '', categoria: 'ACTIVO_FIJO', marca: 'Honda', modelo: 'EU2200i', salaId: 's5', responsableId: 'r4', estado: 'MALO', valorAdquisicion: 620000, fechaAdquisicion: '2020-06-01', fondoCompra: 'PIE', sala: { nombre: 'Sala Técnica' }, responsable: { nombres: 'Roberto', apellidos: 'Silva' } },
  { id: '6', codigoInventario: 'TEC-098', nombre: 'Tablet Samsung Galaxy', descripcion: '', categoria: 'TECNOLOGICO', marca: 'Samsung', modelo: 'Galaxy Tab A8', salaId: 's1', responsableId: 'r2', estado: 'DADO_DE_BAJA', valorAdquisicion: 240000, fechaAdquisicion: '2019-03-22', fondoCompra: 'SEP', sala: { nombre: 'Sala Computación' }, responsable: { nombres: 'Carlos', apellidos: 'Muñoz' } },
  { id: '7', codigoInventario: 'MOB-088', nombre: 'Mesa de Reuniones', descripcion: '', categoria: 'MOBILIARIO', marca: 'Mobinter', modelo: 'MR-1800', salaId: 's2', responsableId: 'r3', estado: 'BUENO', valorAdquisicion: 280000, fechaAdquisicion: '2023-02-14', fondoCompra: 'FPM', sala: { nombre: 'Sala Reuniones' }, responsable: { nombres: 'Luisa', apellidos: 'Pérez' } },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge: React.FC<{ colors: { bg: string; text: string; border: string }; label: string }> = ({ colors, label }) => (
  <span style={{
    backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`,
    borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
  }}>{label}</span>
);

const KPICard: React.FC<{
  label: string; value: string | number; icon: React.ReactNode; accent: string; sub?: string;
}> = ({ label, value, icon, accent, sub }) => (
  <div style={{
    background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12,
    padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1, minWidth: 160,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span style={{ color: accent }}>{icon}</span>
    </div>
    <span style={{ color: 'var(--text-primary)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px' }}>{value}</span>
    {sub && <span style={{ color: 'var(--muted)', fontSize: 12 }}>{sub}</span>}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const Inventario: React.FC = () => {
  const [dashboard, setDashboard] = useState<DashboardData>(mockDashboard);
  const [bienes, setBienes] = useState<Bien[]>(mockBienes);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [estado, setEstado] = useState('');
  const [bajaModal, setBajaModal] = useState<{ id: string; nombre: string } | null>(null);
  const [motivoBaja, setMotivoBaja] = useState('');
  const [bajaLoading, setBajaLoading] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const emptyForm = {
    nombre: '', categoria: '', descripcion: '', marca: '', modelo: '',
    numeroSerie: '', estado: 'BUENO', valorAdquisicion: '', fechaAdquisicion: today,
    fondoCompra: '', vidaUtilAnios: '',
  };
  const [nuevoBienOpen, setNuevoBienOpen] = useState(false);
  const [nuevoBienForm, setNuevoBienForm] = useState(emptyForm);
  const [nuevoBienLoading, setNuevoBienLoading] = useState(false);
  const [nuevoBienError, setNuevoBienError] = useState('');

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/bienes/dashboard');
      setDashboard(res.data.data);
    } catch {
      // use mock
    }
  }, []);

  const fetchBienes = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (q) params.q = q;
      if (categoria) params.categoria = categoria;
      if (estado) params.estado = estado;
      const res = await api.get('/bienes', { params });
      setBienes(res.data.data ?? res.data);
    } catch {
      // use mock
    } finally {
      setLoading(false);
    }
  }, [q, categoria, estado]);

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);
  useEffect(() => {
    const t = setTimeout(fetchBienes, 300);
    return () => clearTimeout(t);
  }, [fetchBienes]);

  const filtered = bienes.filter(b => {
    const matchQ = !q || b.nombre.toLowerCase().includes(q.toLowerCase()) || b.codigoInventario.toLowerCase().includes(q.toLowerCase());
    const matchCat = !categoria || b.categoria === categoria;
    const matchEst = !estado || b.estado === estado;
    return matchQ && matchCat && matchEst;
  });

  const handleBaja = async () => {
    if (!bajaModal || !motivoBaja.trim()) return;
    setBajaLoading(true);
    try {
      await api.post(`/bienes/${bajaModal.id}/baja`, { motivoBaja });
      setBienes(prev => prev.map(b => b.id === bajaModal.id ? { ...b, estado: 'DADO_DE_BAJA' } : b));
    } catch {
      // handle error
    } finally {
      setBajaLoading(false);
      setBajaModal(null);
      setMotivoBaja('');
    }
  };

  const handleNuevoBien = async (e: React.FormEvent) => {
    e.preventDefault();
    setNuevoBienError('');
    setNuevoBienLoading(true);
    try {
      const body: Record<string, unknown> = {
        nombre: nuevoBienForm.nombre,
        categoria: nuevoBienForm.categoria,
        estado: nuevoBienForm.estado,
        valorAdquisicion: Number(nuevoBienForm.valorAdquisicion),
        fechaAdquisicion: nuevoBienForm.fechaAdquisicion,
      };
      if (nuevoBienForm.descripcion) body.descripcion = nuevoBienForm.descripcion;
      if (nuevoBienForm.marca) body.marca = nuevoBienForm.marca;
      if (nuevoBienForm.modelo) body.modelo = nuevoBienForm.modelo;
      if (nuevoBienForm.numeroSerie) body.numeroSerie = nuevoBienForm.numeroSerie;
      if (nuevoBienForm.fondoCompra) body.fondoCompra = nuevoBienForm.fondoCompra;
      if (nuevoBienForm.vidaUtilAnios) body.vidaUtilAnios = Number(nuevoBienForm.vidaUtilAnios);
      await api.post('/bienes', body);
      setNuevoBienOpen(false);
      setNuevoBienForm(emptyForm);
      fetchBienes();
      fetchDashboard();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setNuevoBienError(msg || 'Error al guardar el bien. Intente nuevamente.');
    } finally {
      setNuevoBienLoading(false);
    }
  };

  const getEstadoCount = (e: string) => dashboard.porEstado.find(x => x.estado === e)?.cantidad ?? 0;

  const inputStyle: React.CSSProperties = {
    background: 'var(--card)', border: '1px solid #2a3a4a', color: 'var(--text-primary)',
    borderRadius: 8, padding: '8px 12px', fontSize: 14, outline: 'none',
    appearance: 'none' as const,
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle, paddingRight: 32, cursor: 'pointer',
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '28px 32px', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', fontSize: 24, fontWeight: 700, margin: 0 }}>Inventario</h1>
          <p style={{ color: 'var(--muted)', fontSize: 14, margin: '4px 0 0' }}>Gestión de bienes institucionales</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => exportToCSV(
              filtered.map((b) => ({
                Código: b.codigoInventario,
                Nombre: b.nombre,
                Categoría: categoriaLabel[b.categoria] ?? b.categoria,
                Marca: b.marca,
                Modelo: b.modelo,
                Sala: b.sala?.nombre ?? '',
                Responsable: b.responsable ? `${b.responsable.nombres} ${b.responsable.apellidos}` : '',
                Estado: b.estado,
                'Valor Adquisición': b.valorAdquisicion,
                'Fondo Compra': b.fondoCompra ?? '',
                'Fecha Adquisición': b.fechaAdquisicion ? new Date(b.fechaAdquisicion).toLocaleDateString('es-CL') : '',
              })),
              'inventario',
            )}
            style={{
              background: '#10b981', color: '#fff', border: 'none', borderRadius: 8,
              padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Download size={16} /> Exportar Excel
          </button>
          <button style={{
            background: 'var(--card)', color: 'var(--muted)', border: '1px solid #2a3a4a', borderRadius: 8,
            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={16} /> Importar Excel
          </button>
          <button onClick={() => { setNuevoBienOpen(true); setNuevoBienError(''); setNuevoBienForm(emptyForm); }} style={{
            background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}>
            <Plus size={16} /> Nuevo Bien
          </button>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
        <KPICard label="Total Bienes" value={dashboard.total} icon={<Package size={20} />} accent="#3b82f6" sub="activos en sistema" />
        <KPICard label="Estado Bueno" value={getEstadoCount('BUENO')} icon={<CheckCircle size={20} />} accent="#10b981" sub="en buen estado" />
        <KPICard label="Regular / Malo" value={getEstadoCount('REGULAR') + getEstadoCount('MALO')} icon={<AlertTriangle size={20} />} accent="#f59e0b" sub="requieren atención" />
        <KPICard label="Dados de Baja" value={getEstadoCount('DADO_DE_BAJA')} icon={<XCircle size={20} />} accent="#ef4444" sub="fuera de servicio" />
        <KPICard label="Valor Total" value={formatCLP(dashboard.valorTotal)} icon={<DollarSign size={20} />} accent="#10b981" sub="valor adquisición" />
      </div>

      {/* ── Category Breakdown ── */}
      <div style={{
        background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12,
        padding: '16px 20px', marginBottom: 20,
      }}>
        <p style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 600, margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: 1 }}>
          Distribución por Categoría
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {dashboard.porCategoria.map(({ categoria: cat, cantidad }) => {
            const col = categoriaColor[cat];
            const pct = Math.round((cantidad / dashboard.total) * 100);
            const icons: Record<string, React.ReactNode> = {
              TECNOLOGICO: <Monitor size={14} />, MOBILIARIO: <Armchair size={14} />,
              FUNGIBLE: <Layers size={14} />, ACTIVO_FIJO: <Box size={14} />,
            };
            return (
              <div key={cat} style={{
                background: col.bg, border: `1px solid ${col.border}`,
                borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ color: col.text }}>{icons[cat]}</span>
                <div>
                  <div style={{ color: col.text, fontSize: 12, fontWeight: 600 }}>{categoriaLabel[cat]}</div>
                  <div style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, lineHeight: 1.2 }}>
                    {cantidad} <span style={{ color: 'var(--muted)', fontSize: 12, fontWeight: 400 }}>({pct}%)</span>
                  </div>
                </div>
                <div style={{ width: 60, height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: col.text, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Filters Bar ── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nombre o código…"
            style={{ ...inputStyle, width: '100%', paddingLeft: 32, boxSizing: 'border-box' }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} style={selectStyle}>
            <option value="">Todas las categorías</option>
            <option value="TECNOLOGICO">Tecnológico</option>
            <option value="FUNGIBLE">Fungible</option>
            <option value="MOBILIARIO">Mobiliario</option>
            <option value="ACTIVO_FIJO">Activo Fijo</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        </div>
        <div style={{ position: 'relative' }}>
          <select value={estado} onChange={e => setEstado(e.target.value)} style={selectStyle}>
            <option value="">Todos los estados</option>
            <option value="BUENO">Bueno</option>
            <option value="REGULAR">Regular</option>
            <option value="MALO">Malo</option>
            <option value="DADO_DE_BAJA">Dado de Baja</option>
          </select>
          <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #2a3a4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {loading ? 'Cargando…' : `${filtered.length} bien${filtered.length !== 1 ? 'es' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`}
          </span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'rgba(42,58,74,0.4)' }}>
                {['Código', 'Nombre', 'Categoría', 'Marca', 'Sala', 'Responsable', 'Estado', 'Valor', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--muted)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((b, i) => (
                <tr key={b.id} style={{ borderTop: '1px solid #2a3a4a', background: i % 2 === 0 ? 'transparent' : 'rgba(42,58,74,0.15)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(42,58,74,0.4)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(42,58,74,0.15)')}>
                  <td style={{ padding: '12px 16px', color: 'var(--muted)', fontFamily: 'monospace', fontSize: 12 }}>{b.codigoInventario}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{b.nombre}</div>
                    <div style={{ color: 'var(--muted)', fontSize: 11 }}>{b.modelo}</div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge colors={categoriaColor[b.categoria]} label={categoriaLabel[b.categoria]} />
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-alt)' }}>{b.marca}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-alt)' }}>{b.sala.nombre}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-alt)' }}>{b.responsable.nombres} {b.responsable.apellidos}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge colors={estadoColor[b.estado]} label={b.estado.replace('_', ' ')} />
                  </td>
                  <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>{formatCLP(b.valorAdquisicion)}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button title="Ver" style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', color: '#3b82f6', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                        <Eye size={14} />
                      </button>
                      <button title="Editar" style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                        <Pencil size={14} />
                      </button>
                      {b.estado !== 'DADO_DE_BAJA' && (
                        <button title="Dar de Baja" onClick={() => setBajaModal({ id: b.id, nombre: b.nombre })}
                          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 6, padding: '5px 8px', cursor: 'pointer' }}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
                    No se encontraron bienes con los filtros actuales.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Nuevo Bien Modal ── */}
      {nuevoBienOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }} onClick={e => { if (e.target === e.currentTarget) { setNuevoBienOpen(false); } }}>
          <div style={{
            background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 14,
            padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 8, padding: 8 }}>
                  <Package size={20} color="#3b82f6" />
                </div>
                <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>Nuevo Bien</h2>
              </div>
              <button onClick={() => setNuevoBienOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleNuevoBien}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* Nombre */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Nombre <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required value={nuevoBienForm.nombre}
                    onChange={e => setNuevoBienForm(f => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej: Notebook Dell Latitude"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Categoría */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Categoría <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select required value={nuevoBienForm.categoria}
                      onChange={e => setNuevoBienForm(f => ({ ...f, categoria: e.target.value }))}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Seleccionar…</option>
                      <option value="TECNOLOGICO">Tecnológico</option>
                      <option value="FUNGIBLE">Fungible</option>
                      <option value="MOBILIARIO">Mobiliario</option>
                      <option value="ACTIVO_FIJO">Activo Fijo</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Estado */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Estado <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <select required value={nuevoBienForm.estado}
                      onChange={e => setNuevoBienForm(f => ({ ...f, estado: e.target.value }))}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="BUENO">Bueno</option>
                      <option value="REGULAR">Regular</option>
                      <option value="MALO">Malo</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Marca */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Marca</label>
                  <input value={nuevoBienForm.marca}
                    onChange={e => setNuevoBienForm(f => ({ ...f, marca: e.target.value }))}
                    placeholder="Ej: Dell, Samsung…"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Modelo */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Modelo</label>
                  <input value={nuevoBienForm.modelo}
                    onChange={e => setNuevoBienForm(f => ({ ...f, modelo: e.target.value }))}
                    placeholder="Ej: Latitude 5530…"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* N° de Serie */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>N° de Serie</label>
                  <input value={nuevoBienForm.numeroSerie}
                    onChange={e => setNuevoBienForm(f => ({ ...f, numeroSerie: e.target.value }))}
                    placeholder="Número de serie…"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Valor de Adquisición */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Valor de Adquisición <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="number" min="0" value={nuevoBienForm.valorAdquisicion}
                    onChange={e => setNuevoBienForm(f => ({ ...f, valorAdquisicion: e.target.value }))}
                    placeholder="0"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Fecha de Adquisición */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                    Fecha de Adquisición <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input required type="date" value={nuevoBienForm.fechaAdquisicion}
                    onChange={e => setNuevoBienForm(f => ({ ...f, fechaAdquisicion: e.target.value }))}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Fondo de Compra */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Fondo de Compra</label>
                  <div style={{ position: 'relative' }}>
                    <select value={nuevoBienForm.fondoCompra}
                      onChange={e => setNuevoBienForm(f => ({ ...f, fondoCompra: e.target.value }))}
                      style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }}>
                      <option value="">Sin especificar</option>
                      <option value="Subvención General">Subvención General</option>
                      <option value="SEP">SEP</option>
                      <option value="PIE">PIE</option>
                      <option value="FAEP">FAEP</option>
                    </select>
                    <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Vida Útil */}
                <div>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Vida Útil (años)</label>
                  <input type="number" min="0" value={nuevoBienForm.vidaUtilAnios}
                    onChange={e => setNuevoBienForm(f => ({ ...f, vidaUtilAnios: e.target.value }))}
                    placeholder="Ej: 5"
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                {/* Descripción */}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Descripción</label>
                  <textarea value={nuevoBienForm.descripcion}
                    onChange={e => setNuevoBienForm(f => ({ ...f, descripcion: e.target.value }))}
                    placeholder="Descripción opcional del bien…"
                    rows={3}
                    style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }} />
                </div>
              </div>

              {/* Error */}
              {nuevoBienError && (
                <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 13 }}>
                  {nuevoBienError}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setNuevoBienOpen(false)}
                  style={{ background: 'transparent', border: '1px solid #2a3a4a', color: 'var(--muted)', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                  Cancelar
                </button>
                <button type="submit" disabled={nuevoBienLoading}
                  style={{
                    background: '#3b82f6', border: 'none', color: '#fff',
                    borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: nuevoBienLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 600, opacity: nuevoBienLoading ? 0.7 : 1,
                  }}>
                  {nuevoBienLoading ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Baja Modal ── */}
      {bajaModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: 14,
            padding: 28, width: '100%', maxWidth: 480,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 8 }}>
                <XCircle size={20} color="#ef4444" />
              </div>
              <h2 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 700, margin: 0 }}>Dar de Baja</h2>
            </div>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 0 20px' }}>
              Estás a punto de dar de baja el bien: <strong style={{ color: 'var(--text-primary)' }}>{bajaModal.nombre}</strong>. Esta acción no se puede deshacer.
            </p>
            <label style={{ display: 'block', color: 'var(--muted)', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
              Motivo de Baja <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <textarea
              value={motivoBaja} onChange={e => setMotivoBaja(e.target.value)}
              placeholder="Describa el motivo por el cual se da de baja este bien…"
              rows={4}
              style={{
                ...inputStyle, width: '100%', boxSizing: 'border-box',
                resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5,
              }}
            />
            <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
              <button onClick={() => { setBajaModal(null); setMotivoBaja(''); }}
                style={{ background: 'transparent', border: '1px solid #2a3a4a', color: 'var(--muted)', borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                Cancelar
              </button>
              <button onClick={handleBaja} disabled={!motivoBaja.trim() || bajaLoading}
                style={{
                  background: motivoBaja.trim() ? '#ef4444' : 'var(--border)', border: 'none', color: '#fff',
                  borderRadius: 8, padding: '9px 18px', fontSize: 14, cursor: motivoBaja.trim() ? 'pointer' : 'not-allowed',
                  fontWeight: 600, opacity: bajaLoading ? 0.7 : 1,
                }}>
                {bajaLoading ? 'Procesando…' : 'Confirmar Baja'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
