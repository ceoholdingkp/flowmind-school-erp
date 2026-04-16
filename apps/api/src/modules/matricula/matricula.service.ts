import { Injectable } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';

// Subvención base 2026 (valores aproximados en pesos chilenos)
const SUBVENCION_BASE: Record<string, number> = {
  'BASICA': 82_000,
  'MEDIA_HC': 92_000,
  'MEDIA_TP': 110_000,
};

const FACTOR_PIE = 1.50; // 50% adicional por alumno PIE
const FACTOR_PRIORITARIO = 1.30; // 30% adicional SEP por alumno prioritario
const FACTOR_PREFERENTE = 1.10; // 10% adicional SEP por alumno preferente

@Injectable()
export class MatriculaService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  async getProyeccion(anio: number) {
    const alumnos = await this.db.alumno.findMany({
      where: { estadoMatricula: 'ACTIVA', deletedAt: null },
      include: { curso: true },
    });

    const totalActivos = alumnos.length;
    const pie = alumnos.filter((a: any) => a.esPIE).length;
    const prioritarios = alumnos.filter((a: any) => a.esPrioritario).length;
    const preferentes = alumnos.filter((a: any) => a.esPreferente).length;

    // Agrupar por tipo enseñanza del curso
    const grupos: Record<string, number> = { BASICA: 0, MEDIA_HC: 0, MEDIA_TP: 0 };
    for (const alumno of alumnos) {
      const tipo = (alumno as any).curso?.tipoEnsenanza ?? 'BASICA';
      if (tipo in grupos) grupos[tipo]++;
      else grupos['BASICA']++;
    }

    // Calcular subvención regular
    let subvencionRegular = 0;
    for (const [tipo, cantidad] of Object.entries(grupos)) {
      subvencionRegular += (SUBVENCION_BASE[tipo] ?? SUBVENCION_BASE.BASICA) * cantidad;
    }

    // SEP
    const montoPrioritarios = prioritarios * SUBVENCION_BASE.BASICA * FACTOR_PRIORITARIO;
    const montoPreferentes = preferentes * SUBVENCION_BASE.BASICA * FACTOR_PREFERENTE;
    const subvencionSEP = montoPrioritarios + montoPreferentes - (prioritarios + preferentes) * SUBVENCION_BASE.BASICA;

    // PIE
    const subvencionPIE = pie * SUBVENCION_BASE.BASICA * FACTOR_PIE - pie * SUBVENCION_BASE.BASICA;

    const totalEstimado = subvencionRegular + subvencionSEP + subvencionPIE;

    return {
      data: {
        anio,
        alumnos: {
          total: totalActivos,
          pie,
          prioritarios,
          preferentes,
          porTipoEnsenanza: grupos,
        },
        proyeccionSubvencion: {
          subvencionRegular: Math.round(subvencionRegular),
          subvencionSEP: Math.round(subvencionSEP),
          subvencionPIE: Math.round(subvencionPIE),
          totalMensualEstimado: Math.round(totalEstimado),
          totalAnualEstimado: Math.round(totalEstimado * 12),
        },
      },
    };
  }

  async simular(params: {
    totalAlumnos: number;
    pie: number;
    prioritarios: number;
    preferentes: number;
    tipoEnsenanza: string;
  }) {
    const base = SUBVENCION_BASE[params.tipoEnsenanza] ?? SUBVENCION_BASE.BASICA;
    const regular = base * params.totalAlumnos;
    const sep = (params.prioritarios * base * FACTOR_PRIORITARIO + params.preferentes * base * FACTOR_PREFERENTE)
      - (params.prioritarios + params.preferentes) * base;
    const pieAdicional = params.pie * base * (FACTOR_PIE - 1);
    const total = regular + sep + pieAdicional;

    return {
      data: {
        parametros: params,
        baseXAlumno: base,
        subvencionRegular: Math.round(regular),
        adicionSEP: Math.round(sep),
        adicionPIE: Math.round(pieAdicional),
        totalMensual: Math.round(total),
        totalAnual: Math.round(total * 12),
      },
    };
  }

  async getResumenMatriculas() {
    const [activas, retirados, trasladados, pendientes] = await Promise.all([
      this.db.alumno.count({ where: { estadoMatricula: 'ACTIVA', deletedAt: null } }),
      this.db.alumno.count({ where: { estadoMatricula: 'RETIRADO' } }),
      this.db.alumno.count({ where: { estadoMatricula: 'TRASLADADO' } }),
      this.db.alumno.count({ where: { estadoMatricula: 'SUSPENDIDA' } }),
    ]);

    // Matrículas por mes (últimos 6 meses)
    const hoy = new Date();
    const porMes = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 1);
      const count = await this.db.alumno.count({
        where: { fechaMatricula: { gte: d, lt: fin } },
      });
      porMes.push({
        mes: d.getMonth() + 1,
        anio: d.getFullYear(),
        nombreMes: d.toLocaleString('es-CL', { month: 'short' }),
        nuevasMatriculas: count,
      });
    }

    return {
      data: {
        activas,
        retirados,
        trasladados,
        pendientes,
        total: activas + retirados + trasladados + pendientes,
        matriculasPorMes: porMes,
      },
    };
  }
}
