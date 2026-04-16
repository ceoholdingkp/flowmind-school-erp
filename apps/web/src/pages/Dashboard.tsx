import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, UserCheck, ClipboardCheck, DollarSign, TrendingUp, AlertTriangle,
  RefreshCw, BookOpen, PenLine, UserPlus, BarChart2,
} from 'lucide-react';
import api from '../api/client';

interface KPIs {
  alumnos: { total: number; conPIE: number; prioritarios: number; preferentes: number; sepPreferenciales: number };
  personal: { totalDocentes: number; totalPersonal: number };
  asistencia: { hoy: number | null; registrosHoy: number; sinRegistro: boolean };
  finanzas: { ingresosMes: number; egresosMes: number; saldoMes: number; periodo: { mes: number; anio: number } };
  alertas: { total: number; criticas: number; lista: any[] };
  semaforoFondos: { fondos: any[]; resumen: { verde: number; amarillo: number; rojo: number } };
  graficoIngresosVsGastos: any[];
  ultimosIngresos: any[];
  convivencia: { incidentesGravesMes: number };
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

function KPICard({
  label, value, sub, icon, color,
}: { label: string; value: string | number; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-[#8899aa] uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-[#8899aa] mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg bg-opacity-10`} style={{ backgroundColor: color + '20' }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

const SEMAFORO_COLOR: Record<string, string> = { VERDE: '#10b981', AMARILLO: '#f59e0b', ROJO: '#ef4444' };

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<KPIs | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/dashboard');
      setData(res.data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-[#3b82f6]" size={28} />
      </div>
    );
  }

  if (!data) return <div className="text-[#8899aa]">Error cargando datos.</div>;

  const kpis = [
    {
      label: 'Total Alumnos',
      value: data.alumnos.total,
      sub: `${data.alumnos.conPIE} PIE · ${data.alumnos.sepPreferenciales} SEP`,
      icon: <Users size={20} />,
      color: '#3b82f6',
    },
    {
      label: 'Personal Docente',
      value: data.personal.totalDocentes,
      sub: `${data.personal.totalPersonal} total funcionarios`,
      icon: <UserCheck size={20} />,
      color: '#8b5cf6',
    },
    {
      label: 'Asistencia Hoy',
      value: data.asistencia.sinRegistro ? 'Sin datos' : `${data.asistencia.hoy}%`,
      sub: data.asistencia.sinRegistro ? 'Sin registros aún' : `${(data.asistencia as any).presentesHoy ?? data.asistencia.registrosHoy ?? 0} presentes`,
      icon: <ClipboardCheck size={20} />,
      color: '#10b981',
    },
    {
      label: 'Ingresos del Mes',
      value: fmt(data.finanzas.ingresosMes),
      sub: `${data.finanzas.periodo.mes}/${data.finanzas.periodo.anio}`,
      icon: <DollarSign size={20} />,
      color: '#10b981',
    },
    {
      label: 'Saldo del Mes',
      value: fmt(data.finanzas.saldoMes),
      sub: `Egresos: ${fmt(data.finanzas.egresosMes)}`,
      icon: <TrendingUp size={20} />,
      color: data.finanzas.saldoMes >= 0 ? '#10b981' : '#ef4444',
    },
    {
      label: 'Alertas Activas',
      value: data.alertas.total,
      sub: `${data.alertas.criticas} críticas · ${data.convivencia.incidentesGravesMes} incid. convivencia`,
      icon: <AlertTriangle size={20} />,
      color: data.alertas.criticas > 0 ? '#ef4444' : '#f59e0b',
    },
  ];

  const chartData = data.graficoIngresosVsGastos.map((m) => ({
    mes: m.nombreMes,
    Ingresos: m.ingresos,
    Gastos: m.egresos,
  }));

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Ahora mismo</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">KPIs en tiempo real · actualizado hace un momento</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-xs text-[#8899aa] hover:text-white bg-[#1a2332] border border-[#2a3a4a] px-3 py-2 rounded-lg transition-colors"
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Registrar Asistencia', icon: <ClipboardCheck size={18} />, color: '#10b981', path: '/asistencia' },
          { label: 'Ingresar Notas', icon: <PenLine size={18} />, color: '#3b82f6', path: '/calificaciones' },
          { label: 'Nueva Matrícula', icon: <UserPlus size={18} />, color: '#8b5cf6', path: '/matricula' },
          { label: 'Estado de Resultados', icon: <BarChart2 size={18} />, color: '#f59e0b', path: '/finanzas/salud' },
        ].map((a) => (
          <button
            key={a.label}
            onClick={() => navigate(a.path)}
            className="flex items-center gap-3 bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-4 hover:border-opacity-80 hover:bg-[#1e2d40] transition-all text-left group"
          >
            <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: a.color + '20' }}>
              <div style={{ color: a.color }}>{a.icon}</div>
            </div>
            <span className="text-sm text-[#8899aa] group-hover:text-white transition-colors font-medium">{a.label}</span>
          </button>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Chart + Semáforo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <div className="lg:col-span-2 bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Ingresos vs Gastos — últimos 6 meses</h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="mes" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid #2a3a4a', borderRadius: '8px', color: '#fff' }}
                formatter={(v) => [fmt(v as number)]}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px', color: 'var(--muted)' }} />
              <Area type="monotone" dataKey="Ingresos" stroke="#10b981" fill="url(#gIngresos)" strokeWidth={2} />
              <Area type="monotone" dataKey="Gastos" stroke="#ef4444" fill="url(#gGastos)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Semáforo Fondos */}
        <div
          className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5 cursor-pointer hover:border-[#3b82f6] transition-colors"
          onClick={() => navigate('/finanzas/salud')}
          title="Ver salud financiera completa"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-white">Semáforo de Fondos</h2>
            <span className="text-[10px] text-[#3b82f6] hover:underline">Ver detalle →</span>
          </div>
          <div className="flex gap-3 mb-4">
            {(['verde', 'amarillo', 'rojo'] as const).map((c) => (
              <div key={c} className="flex-1 text-center">
                <div className="text-xl font-bold" style={{ color: SEMAFORO_COLOR[c.toUpperCase()] }}>
                  {data.semaforoFondos.resumen[c]}
                </div>
                <div className="text-[10px] text-[#8899aa] capitalize">{c}</div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {data.semaforoFondos.fondos.map((f: any) => (
              <div key={f.nombre}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[#8899aa] truncate">{f.nombre}</span>
                  <span style={{ color: SEMAFORO_COLOR[f.estado] }}>{f.porcentajeEjecucion}%</span>
                </div>
                <div className="w-full bg-[#0f1923] rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(f.porcentajeEjecucion, 100)}%`, backgroundColor: SEMAFORO_COLOR[f.estado] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alertas + Últimos ingresos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alertas */}
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-3">Alertas activas</h2>
          {data.alertas.lista.length === 0 ? (
            <p className="text-[#8899aa] text-sm text-center py-6">✓ Sin alertas activas</p>
          ) : (
            <div className="space-y-2">
              {data.alertas.lista.slice(0, 5).map((a: any) => (
                <div key={a.id} className="flex items-start gap-3 p-2.5 bg-[#0f1923] rounded-lg">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5"
                    style={{ color: a.severidad === 'CRITICA' ? '#ef4444' : '#f59e0b' }}
                  />
                  <div>
                    <p className="text-xs text-white font-medium">{a.titulo}</p>
                    <p className="text-[10px] text-[#8899aa]">{a.descripcion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Últimos ingresos */}
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-3">Últimos ingresos</h2>
          <div className="space-y-2">
            {data.ultimosIngresos.slice(0, 5).map((ing: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-2.5 bg-[#0f1923] rounded-lg">
                <div>
                  <p className="text-xs text-white font-medium truncate max-w-[180px]">{ing.descripcion}</p>
                  <p className="text-[10px] text-[#8899aa]">{ing.fondo?.nombre ?? ing.categoria}</p>
                </div>
                <span className="text-sm font-semibold text-[#10b981] shrink-0">{fmt(ing.monto)}</span>
              </div>
            ))}
            {data.ultimosIngresos.length === 0 && (
              <p className="text-[#8899aa] text-sm text-center py-6">Sin ingresos registrados</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
