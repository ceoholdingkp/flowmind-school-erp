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
