import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, Search, Filter, Eye, X, ChevronRight,
  Briefcase, Clock, Calendar, CreditCard, Building2,
  UserCheck, UserX, AlertCircle, Download
} from 'lucide-react';
import api from '../../api/client';
import { exportToCSV } from '../../utils/export';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const COLORS = {
  bg: 'var(--bg)', card: 'var(--card)', border: 'var(--border)', muted: 'var(--muted)',
  green: '#10b981', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', cyan: '#06b6d4',
};

type Tipo = 'DOCENTE' | 'ASISTENTE' | 'DIRECTIVO';
type Estado = 'ACTIVO' | 'INACTIVO' | 'CON_LICENCIA' | 'DESVINCULADO';

interface Funcionario {
  id: string;
  run: string;
  nombres: string;
  apellidos: string;
  tipo: Tipo;
  cargo: string;
  tramoCarrera: string;
  horasContrato: number;
  tipoContrato: string;
  fechaIngreso: string;
  estado: Estado;
  cursosJefatura: string[];
  afp?: string;
  isapre?: string;
  banco?: string;
}

const estadoBadge: Record<Estado, { label: string; color: string; bg: string }> = {
  ACTIVO:              { label: 'Activo',          color: COLORS.green,  bg: '#10b98122' },
  INACTIVO:            { label: 'Inactivo',         color: COLORS.muted,  bg: '#8899aa22' },
  CON_LICENCIA:        { label: 'Con Licencia',     color: COLORS.amber,  bg: '#f59e0b22' },
  DESVINCULADO:        { label: 'Desvinculado',     color: COLORS.red,    bg: '#ef444422' },
};

const tipoBadge: Record<Tipo, { label: string; color: string; bg: string }> = {
  DOCENTE:   { label: 'Docente',   color: COLORS.blue,   bg: '#3b82f622' },
  ASISTENTE: { label: 'Asistente', color: COLORS.cyan,   bg: '#06b6d422' },
  DIRECTIVO: { label: 'Directivo', color: COLORS.purple, bg: '#8b5cf622' },
};

function Badge({ config }: { config: { label: string; color: string; bg: string } }) {
  return (
    <span style={{
      background: config.bg, color: config.color,
      padding: '2px 10px', borderRadius: 9999,
      fontSize: 12, fontWeight: 600, display: 'inline-block',
    }}>
      {config.label}
    </span>
  );
}

function KpiCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div style={{
      background: COLORS.card, border: `1px solid ${COLORS.border}`,
      borderRadius: 12, padding: '20px 24px',
      display: 'flex', alignItems: 'center', gap: 16, flex: 1,
    }}>
      <div style={{ background: `${color}22`, borderRadius: 10, padding: 12 }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ color: COLORS.muted, fontSize: 13, marginBottom: 2 }}>{label}</div>
        <div style={{ color: '#fff', fontSize: 26, fontWeight: 700 }}>{value}</div>
      </div>
    </div>
  );
}

function FichaPanel({ funcionario, onClose }: { funcionario: Funcionario; onClose: () => void }) {
  const tipo = tipoBadge[funcionario.tipo] ?? tipoBadge.ASISTENTE;
  const estado = estadoBadge[funcionario.estado] ?? estadoBadge.INACTIVO;

  const Field = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: COLORS.muted, fontSize: 12, marginBottom: 2 }}>{label}</div>
      <div style={{ color: '#fff', fontSize: 15 }}>{value || '—'}</div>
    </div>
  );

  return (
    <div style={{
      position: 'fixed', top: 0, right: 0, bottom: 0, width: 420,
      background: COLORS.card, borderLeft: `1px solid ${COLORS.border}`,
      zIndex: 100, overflowY: 'auto', padding: 28,
      boxShadow: '-8px 0 40px rgba(0,0,0,0.5)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>Ficha Funcionario</h2>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: COLORS.muted, padding: 4 }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        <Badge config={tipo} />
        <Badge config={estado} />
      </div>

      <div style={{ background: COLORS.bg, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ color: COLORS.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, margin: '0 0 16px' }}>
          Datos Personales
        </h3>
        <Field label="RUN" value={funcionario.run} />
        <Field label="Nombres" value={funcionario.nombres} />
        <Field label="Apellidos" value={funcionario.apellidos} />
        <Field label="Nombre completo" value={`${funcionario.nombres} ${funcionario.apellidos}`} />
      </div>

      <div style={{ background: COLORS.bg, borderRadius: 10, padding: 20, marginBottom: 20 }}>
        <h3 style={{ color: COLORS.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>
          Información Laboral
        </h3>
        <Field label="Cargo" value={funcionario.cargo} />
        <Field label="Tramo Carrera" value={funcionario.tramoCarrera} />
        <Field label="Horas Contrato" value={`${funcionario.horasContrato} hrs`} />
        <Field label="Tipo Contrato" value={funcionario.tipoContrato} />
        <Field label="Fecha Ingreso" value={new Date(funcionario.fechaIngreso).toLocaleDateString('es-CL')} />
        {funcionario.cursosJefatura?.length > 0 && (
          <Field label="Cursos Jefatura" value={funcionario.cursosJefatura.join(', ')} />
        )}
      </div>

      <div style={{ background: COLORS.bg, borderRadius: 10, padding: 20 }}>
        <h3 style={{ color: COLORS.muted, fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, margin: '0 0 16px' }}>
          Previsión y Banco
        </h3>
        <Field label="AFP" value={funcionario.afp} />
        <Field label="Isapre" value={funcionario.isapre} />
        <Field label="Banco" value={funcionario.banco} />
      </div>
    </div>
  );
}

export default function Funcionarios() {
  const [tab, setTab] = useState<'DOCENTE' | 'ASISTENTE'>('DOCENTE');
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [selected, setSelected] = useState<Funcionario | null>(null);

  const fetchFuncionarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tipo: tab });
      if (estadoFilter) params.set('estado', estadoFilter);
      if (search) params.set('q', search);
      const res = await api.get(`/rrhh/funcionarios?${params}`);
      setFuncionarios(res.data?.data ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tab, estadoFilter, search]);

  useEffect(() => {
    fetchFuncionarios();
  }, [fetchFuncionarios]);

  // Fetch all for KPIs (no filter)
  const [kpis, setKpis] = useState({ docentes: 0, asistentes: 0 });
  useEffect(() => {
    const fetchKpis = async () => {
      try {
        const [dRes, aRes] = await Promise.all([
          api.get('/rrhh/funcionarios?tipo=DOCENTE'),
          api.get('/rrhh/funcionarios?tipo=ASISTENTE'),
        ]);
        setKpis({
          docentes: (dRes.data?.data ?? []).length,
          asistentes: (aRes.data?.data ?? []).length,
        });
      } catch (e) {
        console.error(e);
      }
    };
    fetchKpis();
  }, []);

  const thStyle: React.CSSProperties = {
    color: COLORS.muted, fontSize: 12, fontWeight: 600,
    textTransform: 'uppercase', letterSpacing: 0.5,
    padding: '12px 16px', textAlign: 'left', whiteSpace: 'nowrap',
    borderBottom: `1px solid ${COLORS.border}`,
  };
  const tdStyle: React.CSSProperties = {
    padding: '14px 16px', color: '#fff', fontSize: 14,
    borderBottom: `1px solid ${COLORS.border}20`,
    verticalAlign: 'middle',
  };

  return (
    <div style={{ background: COLORS.bg, minHeight: '100vh', padding: '32px 40px', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ background: `${COLORS.blue}22`, borderRadius: 10, padding: 10 }}>
            <Users size={24} color={COLORS.blue} />
          </div>
          <h1 style={{ color: '#fff', fontSize: 24, fontWeight: 700, margin: 0 }}>Funcionarios</h1>
        </div>
        <button
          onClick={() => exportToCSV(
            funcionarios.map((f) => ({
              RUN: f.run,
              Nombres: f.nombres,
              Apellidos: f.apellidos,
              Tipo: f.tipo,
              Cargo: f.cargo,
              'Tramo Carrera': f.tramoCarrera,
              'Horas Contrato': f.horasContrato,
              'Tipo Contrato': f.tipoContrato,
              'Fecha Ingreso': new Date(f.fechaIngreso).toLocaleDateString('es-CL'),
              Estado: f.estado,
              AFP: f.afp ?? '',
              Isapre: f.isapre ?? '',
              Banco: f.banco ?? '',
            })),
            `funcionarios-${tab.toLowerCase()}`,
          )}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#10b981', color: '#fff', border: 'none',
            borderRadius: 8, padding: '10px 18px', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
          }}
        >
          <Download size={16} /> Exportar Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <KpiCard label="Total Docentes"     value={kpis.docentes}                    icon={Briefcase}  color={COLORS.blue} />
        <KpiCard label="Total Asistentes"   value={kpis.asistentes}                  icon={UserCheck}  color={COLORS.cyan} />
        <KpiCard label="Total Funcionarios" value={kpis.docentes + kpis.asistentes}  icon={Users}      color={COLORS.green} />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: COLORS.card, borderRadius: 10, padding: 4, width: 'fit-content', border: `1px solid ${COLORS.border}` }}>
        {(['DOCENTE', 'ASISTENTE'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: tab === t ? COLORS.blue : 'transparent',
              color: tab === t ? '#fff' : COLORS.muted,
              fontWeight: tab === t ? 600 : 400, fontSize: 14, transition: 'all 0.2s',
            }}
          >
            {t === 'DOCENTE' ? 'Docentes' : 'Asistentes'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.muted }} />
          <input
            type="text"
            placeholder="Buscar por nombre, RUN, cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: '10px 12px 10px 38px', color: '#fff', fontSize: 14,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <div style={{ position: 'relative' }}>
          <Filter size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.muted }} />
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            style={{
              background: COLORS.card, border: `1px solid ${COLORS.border}`,
              borderRadius: 8, padding: '10px 12px 10px 36px', color: estadoFilter ? '#fff' : COLORS.muted,
              fontSize: 14, outline: 'none', appearance: 'none', paddingRight: 32, cursor: 'pointer',
            }}
          >
            <option value="">Todos los estados</option>
            <option value="ACTIVO">Activo</option>
            <option value="INACTIVO">Inactivo</option>
            <option value="CON_LICENCIA">Con Licencia</option>
            <option value="DESVINCULADO">Desvinculado</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: COLORS.card, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: COLORS.bg }}>
                <th style={thStyle}>RUN</th>
                <th style={thStyle}>Nombre Completo</th>
                <th style={thStyle}>Cargo</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>Horas</th>
                <th style={thStyle}>Tramo Carrera</th>
                <th style={thStyle}>Contrato</th>
                <th style={thStyle}>Ingreso</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    Cargando funcionarios...
                  </td>
                </tr>
              ) : funcionarios.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ ...tdStyle, textAlign: 'center', color: COLORS.muted, padding: '40px 0' }}>
                    <AlertCircle size={32} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                    No se encontraron funcionarios
                  </td>
                </tr>
              ) : (
                funcionarios.map((f) => (
                  <tr
                    key={f.id}
                    style={{ transition: 'background 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = `${COLORS.border}40`)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: COLORS.muted }}>{f.run}</td>
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{f.nombres} {f.apellidos}</td>
                    <td style={{ ...tdStyle, color: COLORS.muted, maxWidth: 200 }}>{f.cargo}</td>
                    <td style={tdStyle}>
                      <Badge config={tipoBadge[f.tipo] ?? tipoBadge.ASISTENTE} />
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>{f.horasContrato}</td>
                    <td style={{ ...tdStyle, color: COLORS.muted, fontSize: 13 }}>{f.tramoCarrera}</td>
                    <td style={{ ...tdStyle, fontSize: 13 }}>{f.tipoContrato}</td>
                    <td style={{ ...tdStyle, color: COLORS.muted, fontSize: 13 }}>
                      {new Date(f.fechaIngreso).toLocaleDateString('es-CL')}
                    </td>
                    <td style={tdStyle}>
                      <Badge config={estadoBadge[f.estado] ?? estadoBadge.INACTIVO} />
                    </td>
                    <td style={tdStyle}>
                      <button
                        onClick={() => setSelected(f)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          background: `${COLORS.blue}22`, color: COLORS.blue,
                          border: 'none', borderRadius: 6, padding: '6px 12px',
                          cursor: 'pointer', fontSize: 13, fontWeight: 500,
                        }}
                      >
                        <Eye size={14} /> Ver ficha
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side panel */}
      {selected && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 99 }}
            onClick={() => setSelected(null)}
          />
          <FichaPanel funcionario={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}
