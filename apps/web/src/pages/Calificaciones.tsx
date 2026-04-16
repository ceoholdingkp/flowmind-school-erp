import React, { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Users, Award, AlertCircle, Download } from 'lucide-react';
import api from '../api/client';
import { exportToCSV } from '../utils/export';

interface DashboardData {
  totalNotas: number;
  promedioGeneral: number | null;
  porCurso: Array<{
    cursoId: string;
    curso: string;
    profJefe: string;
    promedio: number;
    aprobados: number;
    reprobados: number;
    total: number;
  }>;
}

function GaugePct({ value }: { value: number }) {
  const color = value >= 90 ? '#10b981' : value >= 75 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
          <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="16" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${(value / 100) * 100.53} 100.53`}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-bold" style={{ color }}>
          {value}%
        </span>
      </div>
    </div>
  );
}

function GradeCircle({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#8899aa]">—</span>;
  const color = value >= 5.0 ? '#10b981' : value >= 4.0 ? '#f59e0b' : '#ef4444';
  return (
    <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center font-bold text-sm"
      style={{ borderColor: color, color }}>
      {value.toFixed(1)}
    </div>
  );
}

export default function Calificaciones() {
  const [dash, setDash] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [periodo, setPeriodo] = useState(1);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/calificaciones/dashboard', { params: { anio, periodo } });
      setDash(res.data.data ?? res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [anio, periodo]);

  const globalPct = dash?.porCurso.length
    ? Math.round(
        dash.porCurso.reduce((s, c) => s + (c.total > 0 ? (c.aprobados / c.total) * 100 : 0), 0) /
        (dash.porCurso.length || 1)
      )
    : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Calificaciones</h1>
          <p className="text-xs text-[#8899aa] mt-0.5">Vista global por curso</p>
        </div>
        <div className="flex gap-2">
          <select value={periodo} onChange={(e) => setPeriodo(+e.target.value)}
            className="bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            <option value={1}>Período 1</option>
            <option value={2}>Período 2</option>
            <option value={3}>Período 3</option>
            <option value={4}>Período 4</option>
          </select>
          <select value={anio} onChange={(e) => setAnio(+e.target.value)}
            className="bg-[#1a2332] border border-[#2a3a4a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
            {[2024, 2025, 2026].map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button
            onClick={() => dash && exportToCSV(
              dash.porCurso.map((c) => ({
                Curso: c.curso,
                'Profesor Jefe': c.profJefe || '',
                Promedio: c.promedio?.toFixed(1) ?? '',
                Aprobados: c.aprobados,
                Reprobados: c.reprobados,
                'Total Notas': c.total,
                '% Aprobación': c.total > 0 ? Math.round((c.aprobados / c.total) * 100) + '%' : '',
              })),
              `calificaciones-periodo${periodo}-${anio}`,
            )}
            className="flex items-center gap-1.5 text-xs bg-[#10b981] hover:bg-[#059669] text-white px-3 py-2 rounded-lg transition-colors"
          >
            <Download size={13} /> Exportar Excel
          </button>
          <button onClick={load} className="p-2 bg-[#1a2332] border border-[#2a3a4a] rounded-lg text-[#8899aa] hover:text-white">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Global KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total notas', val: dash?.totalNotas ?? 0, icon: <TrendingUp size={18} />, color: '#3b82f6' },
          { label: 'Promedio global', val: dash?.promedioGeneral?.toFixed(1) ?? '—', icon: <Award size={18} />, color: '#10b981' },
          { label: '% Aprobación', val: `${globalPct}%`, icon: <Users size={18} />, color: '#8b5cf6' },
          { label: 'Cursos activos', val: dash?.porCurso.length ?? 0, icon: <AlertCircle size={18} />, color: '#06b6d4' },
        ].map((k) => (
          <div key={k.label} className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#8899aa]">{k.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{k.val}</p>
              </div>
              <div className="p-2.5 rounded-lg" style={{ backgroundColor: k.color + '20', color: k.color }}>
                {k.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Course cards */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-[#8899aa]">
          <RefreshCw className="animate-spin mr-2" size={16} /> Cargando...
        </div>
      ) : !dash?.porCurso.length ? (
        <div className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-12 text-center text-[#8899aa]">
          No hay datos de calificaciones para este período
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dash.porCurso.map((curso) => {
            const pct = curso.total > 0 ? Math.round((curso.aprobados / curso.total) * 100) : 0;
            const barColor = pct >= 90 ? '#10b981' : pct >= 75 ? '#f59e0b' : '#ef4444';
            return (
              <div key={curso.cursoId} className="bg-[#1a2332] border border-[#2a3a4a] rounded-xl p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{curso.curso}</h3>
                    <p className="text-xs text-[#8899aa] mt-0.5">{curso.profJefe || 'Sin profesor jefe'}</p>
                  </div>
                  <GradeCircle value={curso.promedio} />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5">
                    <GaugePct value={pct} />
                    <div>
                      <div className="text-xs text-[#10b981]">{curso.aprobados} aprobados</div>
                      <div className="text-xs text-[#ef4444]">{curso.reprobados} reprobados</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#8899aa]">{curso.total} notas</div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#0f1923] rounded-full h-1.5">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
