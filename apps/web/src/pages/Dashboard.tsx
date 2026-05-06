import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, ClipboardCheck, DollarSign, UserCheck,
  RefreshCw, AlertTriangle, Info, CheckCircle,
  School, Receipt, Activity, TrendingUp, TrendingDown, MessageSquare,
} from 'lucide-react';
import api from '../api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface NivelRow { nivel: string; total: number; hombres: number; mujeres: number }
interface CuentaUsada { codigo: string; nombre: string; monto: number; movimientos: number }
interface Alerta { tipo: string; mensaje: string; severidad: 'error' | 'warning' | 'info' }
interface ActividadItem { tipo: string; descripcion: string; usuario: string | null; fecha: string }

interface DirectorData {
  matriculas: {
    totalVigentes: number; totalRetirados: number; nuevosMes: number;
    porNivel: NivelRow[]; pie: number; prioritarios: number; preferentes: number;
  };
  finanzas: {
    totalIngresos: number; totalEgresos: number; balance: number;
    movimientosMes: number; rendicionEstado: string; cuentasMasUsadas: CuentaUsada[];
  };
  asistencia: {
    promedioGeneral: number | null; mock: boolean;
    asistenciaHoy: { presentes: number; ausentes: number; total: number };
    tendenciaSemanal: { dia: string; porcentaje: number }[];
  };
  personal: { totalFuncionarios: number; docentes: number; asistentes: number; licenciasMes: number; mock?: boolean };
  alertas: Alerta[];
  actualizadoEn: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n);

const fmtRelativo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora mismo';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20 }: { w?: string | number; h?: number }) {
  return (
    <div
      className="rounded animate-pulse bg-[#1e2d40]"
      style={{ width: w, height: h }}
    />
  );
}

function KpiCard({
  label, value, sub, icon, color, delta, loading,
}: {
  label: string; value: string | number; sub?: string; icon: React.ReactNode;
  color: string; delta?: number; loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5 space-y-3">
        <Skeleton h={12} w="60%" />
        <Skeleton h={28} w="40%" />
        <Skeleton h={10} w="80%" />
      </div>
    );
  }
  return (
    <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#8899aa] uppercase tracking-wide truncate">{label}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-xs text-[#8899aa] mt-1 truncate">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-lg ml-3 shrink-0" style={{ backgroundColor: color + '20' }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
      {delta !== undefined && (
        <div className="flex items-center gap-1 mt-2">
          {delta >= 0
            ? <TrendingUp size={12} className="text-[#10b981]" />
            : <TrendingDown size={12} className="text-[#ef4444]" />}
          <span className={`text-xs ${delta >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
            {delta >= 0 ? '+' : ''}{delta} este mes
          </span>
        </div>
      )}
    </div>
  );
}

function AlertaBadge({ sev }: { sev: string }) {
  if (sev === 'error') return <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#ef4444]" />;
  if (sev === 'warning') return <AlertTriangle size={14} className="shrink-0 mt-0.5 text-[#f59e0b]" />;
  return <Info size={14} className="shrink-0 mt-0.5 text-[#3b82f6]" />;
}

function ActividadIcon({ tipo }: { tipo: string }) {
  if (tipo === 'MATRICULA') return <School size={14} className="text-[#8b5cf6]" />;
  if (tipo === 'MOVIMIENTO') return <Receipt size={14} className="text-[#10b981]" />;
  return <Activity size={14} className="text-[#3b82f6]" />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface RemuneracionesKpi { totalHaberes: number; totalLiquido: number; funcionarios: number; variacion: number }
interface ComunicacionesKpi { totalEnviados: number; totalLeidos: number; porcentajeLeido: number }

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DirectorData | null>(null);
  const [actividad, setActividad] = useState<ActividadItem[]>([]);
  const [remKpi, setRemKpi] = useState<RemuneracionesKpi | null>(null);
  const [comKpi, setComKpi] = useState<ComunicacionesKpi | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingActividad, setLoadingActividad] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anioActual = new Date().getFullYear();
  const mesActual = new Date().getMonth() + 1;

  const load = async () => {
    setLoading(true);
    setLoadingActividad(true);
    try {
      const [dirRes, actRes, remRes, comRes] = await Promise.allSettled([
        api.get('/dashboard/director'),
        api.get('/dashboard/actividad-reciente', { params: { limit: 8 } }),
        api.get('/remuneraciones/resumen', { params: { anio: anioActual } }),
        api.get('/comunicaciones/resumen', { params: { mes: mesActual, anio: anioActual } }),
      ]);
      if (dirRes.status === 'fulfilled') setData(dirRes.value.data.data);
      if (actRes.status === 'fulfilled') setActividad(actRes.value.data.data ?? []);
      if (remRes.status === 'fulfilled') {
        const resumen = remRes.value.data;
        const mesDatos = resumen?.porMes?.find((m: any) => m.mes === mesActual);
        const mesPrevDatos = resumen?.porMes?.find((m: any) => m.mes === (mesActual === 1 ? 12 : mesActual - 1));
        if (mesDatos) {
          const prev = mesPrevDatos?.totalHaberes ?? 0;
          const variacion = prev > 0 ? Math.round((mesDatos.totalHaberes - prev) / prev * 100) : 0;
          setRemKpi({ totalHaberes: mesDatos.totalHaberes, totalLiquido: mesDatos.totalLiquido, funcionarios: mesDatos.funcionarios, variacion });
        }
      }
      if (comRes.status === 'fulfilled') {
        const cd = comRes.value.data;
        setComKpi({ totalEnviados: cd.totalEnviados ?? 0, totalLeidos: cd.totalLeidos ?? 0, porcentajeLeido: cd.porcentajeLeido ?? 0 });
      }
      setLastUpdate(new Date());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
      setLoadingActividad(false);
    }
  };

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, 5 * 60 * 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const maxNivel = data
    ? Math.max(...(data.matriculas.porNivel.map((n) => n.total)), 1)
    : 1;

  return (
    <div className="space-y-5">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Dashboard del Director</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">
            {lastUpdate
              ? `Actualizado a las ${lastUpdate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}`
              : 'Cargando datos...'}
            {' · '}
            <span className="text-[#3b82f6]">auto-refresh cada 5 min</span>
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-xs text-[#8899aa] hover:text-white bg-[#1a2332] border border-[#2a3a4a] px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Actualizar
        </button>
      </div>

      {/* ─── Fila 1: KPI Cards (6 columnas) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          loading={loading}
          label="Alumnos Matriculados"
          value={data?.matriculas.totalVigentes ?? '—'}
          sub={`${data?.matriculas.totalRetirados ?? 0} retirados · ${data?.matriculas.pie ?? 0} PIE`}
          icon={<Users size={20} />}
          color="#3b82f6"
          delta={data?.matriculas.nuevosMes}
        />
        <KpiCard
          loading={loading}
          label="Asistencia Hoy"
          value={
            data?.asistencia.promedioGeneral != null
              ? `${data.asistencia.promedioGeneral}%`
              : data?.asistencia.mock
              ? 'Sin datos'
              : '—'
          }
          sub={
            data?.asistencia.asistenciaHoy.total
              ? `${data.asistencia.asistenciaHoy.presentes} presentes · ${data.asistencia.asistenciaHoy.ausentes} ausentes`
              : data?.asistencia.mock
              ? 'Módulo de asistencia sin datos'
              : undefined
          }
          icon={<ClipboardCheck size={20} />}
          color="#10b981"
        />
        <KpiCard
          loading={loading}
          label="Balance Financiero"
          value={data ? fmt(data.finanzas.balance) : '—'}
          sub={`Ingresos ${data ? fmt(data.finanzas.totalIngresos) : '—'} · Egresos ${data ? fmt(data.finanzas.totalEgresos) : '—'}`}
          icon={<DollarSign size={20} />}
          color={!data || data.finanzas.balance >= 0 ? '#10b981' : '#ef4444'}
        />
        <KpiCard
          loading={loading}
          label="Funcionarios"
          value={data?.personal.totalFuncionarios ?? '—'}
          sub={`${data?.personal.docentes ?? 0} docentes · ${data?.personal.asistentes ?? 0} asistentes`}
          icon={<UserCheck size={20} />}
          color="#8b5cf6"
        />
        <KpiCard
          loading={loading}
          label="Remuneraciones"
          value={remKpi ? fmt(remKpi.totalHaberes) : '—'}
          sub={remKpi ? `Líquido ${fmt(remKpi.totalLiquido)} · ${remKpi.funcionarios} func.` : 'Sin datos del mes'}
          icon={<Receipt size={20} />}
          color="#f59e0b"
          delta={remKpi?.variacion ?? undefined}
        />
        <KpiCard
          loading={loading}
          label="Comunicados"
          value={comKpi?.totalEnviados ?? '—'}
          sub={comKpi ? `${comKpi.porcentajeLeido}% leído · ${comKpi.totalLeidos} lecturas` : 'Sin datos del mes'}
          icon={<MessageSquare size={20} />}
          color="#06b6d4"
        />
      </div>

      {/* ─── Fila 2: Gráfico matriculas + Alertas ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Bar chart matriculas por nivel (60%) */}
        <div className="lg:col-span-3 bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Matrículas por Nivel</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} h={20} />)}
            </div>
          ) : !data || data.matriculas.porNivel.length === 0 ? (
            <div className="text-[#8899aa] text-sm text-center py-8">Sin datos de matrícula</div>
          ) : (
            <div className="space-y-3">
              {data.matriculas.porNivel.map((row) => (
                <div key={row.nivel} className="flex items-center gap-3">
                  <div className="w-28 text-right text-xs text-[#8899aa] shrink-0 truncate">{row.nivel}</div>
                  <div className="flex-1 bg-[#0f1923] rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 rounded-full transition-all duration-700 flex items-center justify-end pr-2"
                      style={{
                        width: `${Math.max((row.total / maxNivel) * 100, 4)}%`,
                        background: 'linear-gradient(90deg, #3b82f6 0%, #6366f1 100%)',
                      }}
                    >
                      <span className="text-[10px] font-bold text-white">{row.total}</span>
                    </div>
                  </div>
                  <div className="w-20 shrink-0 text-[10px] text-[#8899aa]">
                    {row.hombres}H · {row.mujeres}M
                  </div>
                </div>
              ))}
            </div>
          )}
          {data && (
            <div className="mt-4 flex gap-4 text-xs text-[#8899aa] border-t border-[#2a3a4a] pt-3">
              <span><span className="text-[#3b82f6] font-semibold">{data.matriculas.prioritarios}</span> prioritarios</span>
              <span><span className="text-[#f59e0b] font-semibold">{data.matriculas.preferentes}</span> preferentes</span>
              <span><span className="text-[#8b5cf6] font-semibold">{data.matriculas.pie}</span> PIE</span>
            </div>
          )}
        </div>

        {/* Alertas (40%) */}
        <div className="lg:col-span-2 bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-3">Alertas del Sistema</h2>
          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <Skeleton key={i} h={48} />)}
            </div>
          ) : !data || data.alertas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <CheckCircle size={24} className="text-[#10b981]" />
              <p className="text-[#8899aa] text-sm">Sin alertas activas</p>
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-64">
              {data.alertas.map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 p-2.5 bg-[#0f1923] rounded-lg cursor-pointer hover:bg-[#131f2e] transition-colors"
                  onClick={() => {
                    if (a.tipo === 'RENDICION') navigate('/finanzas/rendicion/movimientos');
                    else if (a.tipo === 'MATRICULA') navigate('/matricula/alumnos');
                    else if (a.tipo === 'ASISTENCIA') navigate('/asistencia');
                  }}
                >
                  <AlertaBadge sev={a.severidad} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">{a.tipo}</p>
                    <p className="text-[10px] text-[#8899aa] leading-tight">{a.mensaje}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Fila 3: Top Cuentas + Actividad Reciente ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top cuentas SuperEduc */}
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-white">Top Cuentas SuperEduc</h2>
            <button
              onClick={() => navigate('/finanzas/rendicion/resumen')}
              className="text-[10px] text-[#3b82f6] hover:underline"
            >
              Ver rendición completa →
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} h={36} />)}
            </div>
          ) : !data || data.finanzas.cuentasMasUsadas.length === 0 ? (
            <p className="text-[#8899aa] text-sm text-center py-6">Sin movimientos registrados</p>
          ) : (
            <div className="space-y-1">
              {data.finanzas.cuentasMasUsadas.map((c) => (
                <div
                  key={c.codigo}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-[#0f1923] transition-colors"
                >
                  <div className="w-14 shrink-0">
                    <span className="text-[10px] bg-[#0f1923] border border-[#2a3a4a] text-[#3b82f6] px-1.5 py-0.5 rounded font-mono">
                      {c.codigo}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{c.nombre}</p>
                    <p className="text-[10px] text-[#8899aa]">{c.movimientos} mov.</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-[#ef4444]">{fmt(c.monto)}</p>
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-2 border-t border-[#2a3a4a] flex justify-between text-xs text-[#8899aa]">
                <span>{data.finanzas.movimientosMes} mov. este mes</span>
                <span className={`font-semibold ${data.finanzas.balance >= 0 ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                  Balance {fmt(data.finanzas.balance)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-3">Actividad Reciente</h2>
          {loadingActividad ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} h={40} />)}
            </div>
          ) : actividad.length === 0 ? (
            <p className="text-[#8899aa] text-sm text-center py-6">Sin actividad reciente</p>
          ) : (
            <div className="space-y-0">
              {actividad.map((item, i) => (
                <div key={i} className="flex gap-3 pb-3 relative">
                  {/* timeline line */}
                  {i < actividad.length - 1 && (
                    <div className="absolute left-3.5 top-6 bottom-0 w-px bg-[#2a3a4a]" />
                  )}
                  <div className="w-7 h-7 bg-[#0f1923] border border-[#2a3a4a] rounded-full flex items-center justify-center shrink-0 z-10">
                    <ActividadIcon tipo={item.tipo} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <p className="text-xs text-white leading-tight line-clamp-2">{item.descripcion}</p>
                    <p className="text-[10px] text-[#8899aa] mt-0.5">{fmtRelativo(item.fecha)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Fila 4: Tendencia asistencia (si hay datos) ─── */}
      {data && data.asistencia.tendenciaSemanal.length > 0 && (
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
          <h2 className="text-sm font-medium text-white mb-4">Tendencia de Asistencia Semanal</h2>
          <div className="flex items-end gap-3 h-24">
            {data.asistencia.tendenciaSemanal.map((d) => (
              <div key={d.dia} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-[#8899aa]">{d.porcentaje}%</span>
                <div className="w-full bg-[#0f1923] rounded-t" style={{ height: `${d.porcentaje}%` }}>
                  <div
                    className="w-full h-full rounded-t transition-all"
                    style={{
                      background: d.porcentaje >= 90 ? '#10b981' : d.porcentaje >= 80 ? '#f59e0b' : '#ef4444',
                    }}
                  />
                </div>
                <span className="text-[10px] text-[#8899aa]">{d.dia}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
