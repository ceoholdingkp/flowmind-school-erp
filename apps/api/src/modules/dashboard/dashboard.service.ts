import { Injectable, Logger } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  async getKPIs() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    // ─── ALUMNOS ────────────────────────────────────────────────
    const [
      totalAlumnos, totalAlumnosPIE, totalPrioritarios, totalPreferentes,
      totalPersonalDocente, totalPersonalAll,
    ] = await Promise.all([
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null } }),
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null, esPIE: true } }),
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null, esPrioritario: true } }),
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null, esPreferente: true } }),
      this.db.funcionario.count({ where: { estado: 'ACTIVO', deletedAt: null, tipo: 'DOCENTE' } }),
      this.db.funcionario.count({ where: { estado: 'ACTIVO', deletedAt: null } }),
    ]);

    // ─── ASISTENCIA HOY ─────────────────────────────────────────
    const asistenciasHoy = await this.db.asistencia.findMany({
      where: { fecha: { gte: hoy, lt: manana } },
      select: { estado: true },
    });
    const totalHoy = asistenciasHoy.length;
    const presentesHoy = asistenciasHoy.filter(
      (a: any) => a.estado === 'PRESENTE' || a.estado === 'ATRASO',
    ).length;
    const pctAsistenciaHoy = totalHoy > 0 ? Math.round((presentesHoy / totalHoy) * 100 * 10) / 10 : null;

    // ─── FINANZAS MES ACTUAL ─────────────────────────────────────
    const [ingresosMes, egresosMes] = await Promise.all([
      this.db.movimientoFinanciero.aggregate({
        where: { mes: mesActual, anio: anioActual, tipo: 'INGRESO' },
        _sum: { monto: true },
      }),
      this.db.movimientoFinanciero.aggregate({
        where: { mes: mesActual, anio: anioActual, tipo: 'EGRESO' },
        _sum: { monto: true },
      }),
    ]);
    const ingresosTotal = Number(ingresosMes._sum.monto ?? 0);
    const egresosTotal = Number(egresosMes._sum.monto ?? 0);
    const saldoMes = ingresosTotal - egresosTotal;

    // ─── ALERTAS ACTIVAS ────────────────────────────────────────
    const alertas = await this.db.alerta.findMany({
      where: { estado: 'ACTIVA' },
      orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
      take: 10,
    });

    // ─── SEMÁFORO DE FONDOS ──────────────────────────────────────
    const fondos = await this.db.fondo.findMany({
      where: { anio: anioActual, activo: true },
    });
    const semaforo = await Promise.all(
      fondos.map(async (f: any) => {
        const agg = await this.db.movimientoFinanciero.aggregate({
          where: { fondoId: f.id, anio: anioActual, tipo: 'EGRESO' },
          _sum: { monto: true },
        });
        const gasto = Number(agg._sum.monto ?? 0);
        const presupuesto = Number(f.presupuestoAnual);
        const pct = presupuesto > 0 ? (gasto / presupuesto) * 100 : 0;
        return {
          nombre: f.nombre,
          presupuestoAnual: presupuesto,
          gastoEjecutado: gasto,
          porcentajeEjecucion: Math.round(pct * 10) / 10,
          estado: pct >= 100 ? 'ROJO' : pct >= 80 ? 'AMARILLO' : 'VERDE',
        };
      }),
    );

    // ─── INGRESOS VS GASTOS ÚLTIMOS 6 MESES ─────────────────────
    const ingresosPorMes: any[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(anioActual, mesActual - 1 - i, 1);
      const m = d.getMonth() + 1;
      const a = d.getFullYear();
      const [ing, egr] = await Promise.all([
        this.db.movimientoFinanciero.aggregate({ where: { mes: m, anio: a, tipo: 'INGRESO' }, _sum: { monto: true } }),
        this.db.movimientoFinanciero.aggregate({ where: { mes: m, anio: a, tipo: 'EGRESO' }, _sum: { monto: true } }),
      ]);
      ingresosPorMes.push({
        mes: m, anio: a,
        nombreMes: d.toLocaleString('es-CL', { month: 'short' }),
        ingresos: Number(ing._sum.monto ?? 0),
        egresos: Number(egr._sum.monto ?? 0),
      });
    }

    // ─── ÚLTIMOS 5 INGRESOS ──────────────────────────────────────
    const ultimosIngresos = await this.db.movimientoFinanciero.findMany({
      where: { tipo: 'INGRESO' },
      include: { fondo: { select: { nombre: true } } },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    // ─── MATRÍCULAS POR ESTADO ───────────────────────────────────
    const [matriculasActivas, retirados, trasladados] = await Promise.all([
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null } }),
      this.db.alumno.count({ where: { estadoMatricula: 'RETIRADO' } }),
      this.db.alumno.count({ where: { estadoMatricula: 'TRASLADADO' } }),
    ]);

    // ─── ÚLTIMAS ANOTACIONES CONVIVENCIA ─────────────────────────
    const alertasConvivencia = await this.db.anotacion.count({
      where: { tipo: 'NEGATIVA', gravedad: { in: ['GRAVE', 'GRAVISIMA'] }, fecha: { gte: new Date(anioActual, mesActual - 1, 1) } },
    });

    return {
      data: {
        timestamp: new Date().toISOString(),
        alumnos: {
          total: totalAlumnos,
          conPIE: totalAlumnosPIE,
          prioritarios: totalPrioritarios,
          preferentes: totalPreferentes,
          sepPreferenciales: totalPrioritarios + totalPreferentes,
          matriculasActivas,
          retirados,
          trasladados,
        },
        personal: {
          totalDocentes: totalPersonalDocente,
          totalPersonal: totalPersonalAll,
        },
        asistencia: {
          hoy: pctAsistenciaHoy,
          registrosHoy: totalHoy,
          presentesHoy,
          sinRegistro: pctAsistenciaHoy === null,
        },
        finanzas: {
          ingresosMes: Math.round(ingresosTotal * 100) / 100,
          egresosMes: Math.round(egresosTotal * 100) / 100,
          saldoMes: Math.round(saldoMes * 100) / 100,
          periodo: { mes: mesActual, anio: anioActual },
        },
        convivencia: {
          incidentesGravesMes: alertasConvivencia,
        },
        alertas: {
          total: alertas.length,
          criticas: alertas.filter((a: any) => a.severidad === 'CRITICA').length,
          lista: alertas,
        },
        semaforoFondos: {
          fondos: semaforo,
          resumen: {
            verde: semaforo.filter((f) => f.estado === 'VERDE').length,
            amarillo: semaforo.filter((f) => f.estado === 'AMARILLO').length,
            rojo: semaforo.filter((f) => f.estado === 'ROJO').length,
          },
        },
        graficoIngresosVsGastos: ingresosPorMes,
        ultimosIngresos,
      },
    };
  }

  // ─── DASHBOARD DIRECTOR ─────────────────────────────────────
  async getDirectorDashboard() {
    const hoy = new Date();
    const anioActual = hoy.getFullYear();
    const mesActual = hoy.getMonth() + 1;
    const inicioMes = new Date(anioActual, mesActual - 1, 1);

    // === MATRÍCULAS ===
    const [matriculasVigentes, matriculasRetiradas, nuevasMes] = await Promise.all([
      this.db.matricula.count({ where: { anio: anioActual, estado: 'VIGENTE' } }),
      this.db.matricula.count({ where: { anio: anioActual, estado: 'RETIRADO' } }),
      this.db.matricula.count({ where: { anio: anioActual, createdAt: { gte: inicioMes } } }),
    ]);

    // Group by nivel (with genero from alumno)
    const matriculasPorNivelRaw = await this.db.matricula.findMany({
      where: { anio: anioActual, estado: 'VIGENTE' },
      select: { nivel: true, alumno: { select: { genero: true } } },
    });
    const nivelMap = new Map<string, { total: number; hombres: number; mujeres: number }>();
    for (const m of matriculasPorNivelRaw) {
      const s = nivelMap.get(m.nivel) ?? { total: 0, hombres: 0, mujeres: 0 };
      s.total++;
      if ((m.alumno as any).genero === 'MASCULINO') s.hombres++;
      else if ((m.alumno as any).genero === 'FEMENINO') s.mujeres++;
      nivelMap.set(m.nivel, s);
    }
    const porNivel = Array.from(nivelMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([nivel, s]) => ({ nivel, ...s }));

    const [totalPIE, totalPrioritarios, totalPreferentes] = await Promise.all([
      this.db.matricula.count({ where: { anio: anioActual, estado: 'VIGENTE', pie: true } }),
      this.db.matricula.count({ where: { anio: anioActual, estado: 'VIGENTE', prioritario: true } }),
      this.db.matricula.count({ where: { anio: anioActual, estado: 'VIGENTE', preferente: true } }),
    ]);

    // === FINANZAS ===
    const [ingresosYear, egresosYear, movimientosMes] = await Promise.all([
      this.db.movimientoFinanciero.aggregate({
        where: { anio: anioActual, tipo: 'INGRESO' },
        _sum: { monto: true },
      }),
      this.db.movimientoFinanciero.aggregate({
        where: { anio: anioActual, tipo: 'EGRESO' },
        _sum: { monto: true },
      }),
      this.db.movimientoFinanciero.count({ where: { anio: anioActual, mes: mesActual } }),
    ]);

    // Top 5 cuentas SuperEduc por monto
    const topCuentasRaw = await this.db.movimientoFinanciero.groupBy({
      by: ['supereducCuentaCodigo'],
      where: { anio: anioActual, supereducCuentaCodigo: { not: null } },
      _sum: { monto: true },
      _count: { id: true },
      orderBy: { _sum: { monto: 'desc' } },
      take: 5,
    });
    const codigos = topCuentasRaw.map((c: any) => c.supereducCuentaCodigo).filter(Boolean);
    const cuentasInfo = codigos.length > 0
      ? await this.db.supereducCuenta.findMany({
          where: { codigo: { in: codigos } },
          select: { codigo: true, nombre: true },
        })
      : [];
    const cuentasMap = new Map((cuentasInfo as any[]).map((c) => [c.codigo, c.nombre]));
    const cuentasMasUsadas = topCuentasRaw.map((c: any) => ({
      codigo: c.supereducCuentaCodigo,
      nombre: cuentasMap.get(c.supereducCuentaCodigo) ?? 'Sin nombre',
      monto: Number(c._sum?.monto ?? 0),
      movimientos: c._count?.id ?? 0,
    }));

    // === ASISTENCIA ===
    let asistenciaData: any;
    try {
      const hoyStart = new Date(); hoyStart.setHours(0, 0, 0, 0);
      const hoyEnd = new Date(); hoyEnd.setHours(23, 59, 59, 999);

      // Últimos 5 días hábiles para tendencia semanal
      const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const tendenciaSemanal: any[] = [];
      let diaRef = new Date(hoyStart);
      let diasAgregados = 0;
      while (diasAgregados < 5) {
        const dow = diaRef.getDay();
        if (dow >= 1 && dow <= 5) { // Monday-Friday
          const dStart = new Date(diaRef); dStart.setHours(0, 0, 0, 0);
          const dEnd = new Date(diaRef); dEnd.setHours(23, 59, 59, 999);
          const regs = await this.db.asistencia.findMany({
            where: { fecha: { gte: dStart, lte: dEnd }, tramoHorario: null },
            select: { estado: true },
          });
          if (regs.length > 0) {
            const p = regs.filter((a: any) => ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(a.estado)).length;
            tendenciaSemanal.unshift({
              dia: DIAS_SEMANA[dow],
              fecha: dStart.toISOString().split('T')[0],
              porcentaje: Math.round((p / regs.length) * 100),
            });
          }
          diasAgregados++;
        }
        diaRef.setDate(diaRef.getDate() - 1);
      }

      // Hoy
      const asistenciasHoy = await this.db.asistencia.findMany({
        where: { fecha: { gte: hoyStart, lte: hoyEnd }, tramoHorario: null },
        select: { estado: true },
      });
      const total = asistenciasHoy.length;
      const presentes = asistenciasHoy.filter(
        (a: any) => ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(a.estado),
      ).length;
      const ausentes = asistenciasHoy.filter((a: any) => a.estado === 'AUSENTE').length;

      // Promedio mes actual
      const inicioMesAsist = new Date(anioActual, mesActual - 1, 1);
      const regsMes = await this.db.asistencia.findMany({
        where: { fecha: { gte: inicioMesAsist }, tramoHorario: null },
        select: { estado: true },
      });
      const presenciasMes = regsMes.filter((a: any) =>
        ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(a.estado),
      ).length;

      asistenciaData = {
        promedioGeneral: regsMes.length > 0 ? Math.round((presenciasMes / regsMes.length) * 1000) / 10 : null,
        asistenciaHoy: { presentes, ausentes, total },
        tendenciaSemanal,
        mock: total === 0 && tendenciaSemanal.length === 0,
      };
    } catch {
      asistenciaData = {
        promedioGeneral: null,
        asistenciaHoy: { presentes: 0, ausentes: 0, total: 0 },
        tendenciaSemanal: [],
        mock: true,
      };
    }

    // === PERSONAL ===
    let personalData: any;
    try {
      const [docentes, total] = await Promise.all([
        this.db.funcionario.count({ where: { estado: 'ACTIVO', tipo: 'DOCENTE', deletedAt: null } }),
        this.db.funcionario.count({ where: { estado: 'ACTIVO', deletedAt: null } }),
      ]);
      personalData = { totalFuncionarios: total, docentes, asistentes: total - docentes, licenciasMes: 0 };
    } catch {
      personalData = { totalFuncionarios: 0, docentes: 0, asistentes: 0, licenciasMes: 0, mock: true };
    }

    // === ALERTAS DINÁMICAS ===
    const alertas: any[] = [];

    const movSinDoc = await this.db.movimientoFinanciero.count({
      where: {
        anio: anioActual,
        tipo: 'EGRESO',
        documentoTributarioId: null,
        supereducCuentaCodigo: { not: null },
      },
    });
    if (movSinDoc > 0) {
      alertas.push({
        tipo: 'RENDICION',
        mensaje: `Rendición ${anioActual} tiene ${movSinDoc} movimiento(s) sin documento respaldo`,
        severidad: 'warning',
      });
    }

    // Prioritarios sin apoderado
    const prioritariosConRelacion = await this.db.matricula.findMany({
      where: { anio: anioActual, estado: 'VIGENTE', prioritario: true },
      select: { alumno: { select: { apoderados: { select: { apoderadoId: true } } } } },
    });
    const sinApoderado = prioritariosConRelacion.filter(
      (m: any) => (m.alumno?.apoderados?.length ?? 0) === 0,
    ).length;
    if (sinApoderado > 0) {
      alertas.push({
        tipo: 'MATRICULA',
        mensaje: `${sinApoderado} alumno(s) prioritario(s) sin apoderado registrado`,
        severidad: 'info',
      });
    }

    // Alertas del sistema (activas)
    const alertasSistema = await this.db.alerta.findMany({
      where: { estado: 'ACTIVA' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { tipo: true, titulo: true, descripcion: true, severidad: true },
    });
    for (const a of alertasSistema) {
      alertas.push({
        tipo: a.tipo,
        mensaje: a.descripcion ?? a.titulo,
        severidad: a.severidad === 'CRITICA' ? 'error' : a.severidad === 'ADVERTENCIA' ? 'warning' : 'info',
      });
    }

    return {
      data: {
        matriculas: {
          totalVigentes: matriculasVigentes,
          totalRetirados: matriculasRetiradas,
          nuevosMes: nuevasMes,
          porNivel,
          pie: totalPIE,
          prioritarios: totalPrioritarios,
          preferentes: totalPreferentes,
        },
        finanzas: {
          totalIngresos: Number(ingresosYear._sum.monto ?? 0),
          totalEgresos: Number(egresosYear._sum.monto ?? 0),
          balance: Number(ingresosYear._sum.monto ?? 0) - Number(egresosYear._sum.monto ?? 0),
          movimientosMes,
          rendicionEstado: 'EN_PROCESO',
          cuentasMasUsadas,
        },
        asistencia: asistenciaData,
        personal: personalData,
        alertas,
        actualizadoEn: new Date().toISOString(),
      },
    };
  }

  async getActividadReciente(limit = 10) {
    const n = Math.min(limit, 50);
    const [ultimasMatriculas, ultimosMovimientos] = await Promise.all([
      this.db.matricula.findMany({
        take: n,
        orderBy: { createdAt: 'desc' },
        select: {
          curso: true,
          nivel: true,
          createdAt: true,
          alumno: { select: { nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
        },
      }),
      this.db.movimientoFinanciero.findMany({
        take: n,
        orderBy: { createdAt: 'desc' },
        select: { tipo: true, monto: true, descripcion: true, categoria: true, createdAt: true },
      }),
    ]);

    const actividad: any[] = [
      ...ultimasMatriculas.map((m: any) => ({
        tipo: 'MATRICULA',
        descripcion: `Nueva matrícula: ${m.alumno.nombres} ${m.alumno.apellidoPaterno} — ${m.curso}`,
        usuario: null,
        fecha: m.createdAt.toISOString(),
      })),
      ...ultimosMovimientos.map((m: any) => ({
        tipo: 'MOVIMIENTO',
        descripcion: `${m.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso'} ${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(m.monto))} — ${m.descripcion ?? m.categoria}`,
        usuario: null,
        fecha: m.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
      .slice(0, n);

    return { data: actividad };
  }

  async createAlerta(data: {
    tipo: string;
    severidad: string;
    titulo: string;
    descripcion?: string;
    moduloDestino?: string;
  }) {
    return this.db.alerta.create({ data: { ...data, severidad: data.severidad as any, estado: 'ACTIVA' } });
  }

  async resolverAlerta(id: string, usuarioId: string) {
    return this.db.alerta.update({
      where: { id },
      data: { estado: 'RESUELTA', resueltaPor: usuarioId, fechaResolucion: new Date() },
    });
  }

  async getAlertas(estado?: string) {
    const where: any = {};
    if (estado) where.estado = estado;
    const alertas = await this.db.alerta.findMany({
      where,
      orderBy: [{ severidad: 'asc' }, { createdAt: 'desc' }],
    });
    return { data: alertas };
  }
}
