import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  GenerarMesDto, LiquidacionesQueryDto, AprobacionMesDto, MarcarPagadasDto,
  UpdateLiquidacionDto, UpdateConfiguracionDto,
} from './dto/remuneraciones.dto';

// ─── TASAS BASE (fallback si no hay ConfiguracionPrevisional) ────
export const TASA_SALUD_FONASA = 7.0;
const TASA_CESANTIA = 0.6;
const UTM_2026 = 66_000;
const UF_2026 = 38_000; // valor UF aprox. para tope imponible

// Tope imponible AFP = 81.6 UF
export const TOPE_IMPONIBLE = Math.round(81.6 * UF_2026);

// ─── IMPUESTO ÚNICO SEGUNDA CATEGORÍA (tabla 2026) ───────────────
function calcularImpuestoUnico(base: number): number {
  if (base <= 0) return 0;
  const utm = UTM_2026;
  // Tramos mensuales 2026 (simplificados)
  if (base <= 13.5 * utm) return 0;
  if (base <= 30 * utm) return Math.round(base * 0.04 - 13.5 * utm * 0.04);
  if (base <= 50 * utm) return Math.round(base * 0.08 - 30 * utm * 0.04 - 13.5 * utm * 0.04 + 30 * utm * 0.08 - 30 * utm * 0.08);
  if (base <= 70 * utm) return Math.round(base * 0.135 - 50 * utm * (0.135 - 0.08) - 30 * utm * 0.04);
  if (base <= 90 * utm) return Math.round(base * 0.23 - 70 * utm * (0.23 - 0.135) - 50 * utm * (0.135 - 0.08) - 30 * utm * 0.04);
  if (base <= 120 * utm) return Math.round(base * 0.304 - 90 * utm * (0.304 - 0.23) - 70 * utm * (0.23 - 0.135) - 50 * utm * (0.135 - 0.08) - 30 * utm * 0.04);
  return Math.round(base * 0.35 - 120 * utm * (0.35 - 0.304) - 90 * utm * (0.304 - 0.23) - 70 * utm * (0.23 - 0.135) - 50 * utm * (0.135 - 0.08) - 30 * utm * 0.04);
}

// ─── CALCULAR LIQUIDACION ────────────────────────────────────────
export function calcularLiquidacion(
  sueldoBase: number,
  asignacionFamiliar: number,
  bonoZona: number,
  horasExtra: number,
  otrosHaberes: number,
  otrosDescuentos: number,
  tasaAfp: number,
  salud: string,
  tasaSalud: number,
) {
  const totalHaberes = sueldoBase + asignacionFamiliar + bonoZona + horasExtra + otrosHaberes;

  // Tope imponible AFP
  const baseImponibleAfp = Math.min(totalHaberes, TOPE_IMPONIBLE);
  const montoAfp = Math.round(baseImponibleAfp * tasaAfp / 100);

  // Salud: FONASA = 7%, Isapre = tasa pactada
  const montoSalud = Math.round(totalHaberes * tasaSalud / 100);

  // Cesantia
  const seguroCesantia = Math.round(totalHaberes * TASA_CESANTIA / 100);

  // Base tributable = totalHaberes - descuentos previsionales
  const baseTributable = Math.max(0, totalHaberes - montoAfp - montoSalud - seguroCesantia);
  const impuestoUnico = Math.max(0, calcularImpuestoUnico(baseTributable));

  const totalDescuentos = montoAfp + montoSalud + seguroCesantia + impuestoUnico + otrosDescuentos;
  const sueldoLiquido = totalHaberes - totalDescuentos;

  return { totalHaberes, montoAfp, montoSalud, seguroCesantia, impuestoUnico, totalDescuentos, sueldoLiquido };
}

@Injectable()
export class RemuneracionesService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CONFIGURACION ───────────────────────────────────────────

  async getConfiguracion() {
    return this.db.configuracionPrevisional.findMany({ orderBy: { tipo: 'asc' } });
  }

  async updateConfiguracion(id: string, dto: UpdateConfiguracionDto) {
    const config = await this.db.configuracionPrevisional.findUnique({ where: { id } });
    if (!config) throw new NotFoundException('Configuración no encontrada');
    return this.db.configuracionPrevisional.update({ where: { id }, data: dto });
  }

  // Helper: obtener tasa AFP por nombre
  private async getTasaAfp(afpNombre: string): Promise<number> {
    const key = `AFP_${afpNombre.toUpperCase().replace(/ /g, '_')}`;
    const cfg = await this.db.configuracionPrevisional.findFirst({
      where: { nombre: key, vigente: true },
    });
    return cfg ? Number((cfg as any).tasa) : 11.44; // default
  }

  // Helper: obtener tasa salud
  private async getTasaSalud(saludNombre: string): Promise<number> {
    if (saludNombre.toUpperCase() === 'FONASA') return TASA_SALUD_FONASA;
    // Isapre: tasa fija 7% (mínimo legal — en la práctica el plan puede ser más caro)
    return TASA_SALUD_FONASA;
  }

  // ─── GENERAR LIQUIDACIONES DEL MES ───────────────────────────

  async generarMes(dto: GenerarMesDto) {
    const { mes, anio } = dto;
    const funcionarios = await this.db.funcionario.findMany({
      where: { estado: 'ACTIVO', deletedAt: null },
      select: {
        id: true, nombres: true, apellidos: true, cargo: true, tipo: true,
        sueldoBase: true, afp: true, isapre: true,
      },
    });

    if (funcionarios.length === 0) throw new BadRequestException('No hay funcionarios activos');

    const resultados: { funcionarioId: string; ok: boolean; id?: string; error?: string }[] = [];

    for (const func of funcionarios as any[]) {
      // Check if already exists
      const existing = await this.db.liquidacionSueldo.findUnique({
        where: { funcionarioId_mes_anio: { funcionarioId: func.id, mes, anio } },
      });
      if (existing) {
        resultados.push({ funcionarioId: func.id, ok: false, error: 'Ya existe liquidación para este período' });
        continue;
      }

      const sueldoBase = Number(func.sueldoBase ?? 600_000);
      const afp = func.afp ?? 'CAPITAL';
      const salud = func.isapre ?? 'FONASA';
      const tasaAfp = await this.getTasaAfp(afp);
      const tasaSalud = await this.getTasaSalud(salud);

      const calc = calcularLiquidacion(sueldoBase, 0, 0, 0, 0, 0, tasaAfp, salud, tasaSalud);

      try {
        const liq = await this.db.liquidacionSueldo.create({
          data: {
            funcionarioId: func.id,
            mes,
            anio,
            sueldoBase,
            asignacionFamiliar: 0,
            bonoZona: 0,
            horasExtra: 0,
            otrosHaberes: 0,
            totalHaberes: calc.totalHaberes,
            afp,
            tasaAfp,
            montoAfp: calc.montoAfp,
            salud,
            montoSalud: calc.montoSalud,
            seguroCesantia: calc.seguroCesantia,
            impuestoUnico: calc.impuestoUnico,
            otrosDescuentos: 0,
            totalDescuentos: calc.totalDescuentos,
            sueldoLiquido: calc.sueldoLiquido,
            estado: 'BORRADOR',
          },
        });
        resultados.push({ funcionarioId: func.id, ok: true, id: (liq as any).id });
      } catch (err: any) {
        resultados.push({ funcionarioId: func.id, ok: false, error: err.message });
      }
    }

    const exitosas = resultados.filter((r) => r.ok).length;
    return { total: funcionarios.length, generadas: exitosas, errores: resultados.filter((r) => !r.ok) };
  }

  // ─── LISTAR ──────────────────────────────────────────────────

  async findAll(query: LiquidacionesQueryDto) {
    const where: any = {};
    if (query.mes) where.mes = query.mes;
    if (query.anio) where.anio = query.anio;
    if (query.estado) where.estado = query.estado;

    const liquidaciones = await this.db.liquidacionSueldo.findMany({
      where,
      include: {
        funcionario: { select: { id: true, nombres: true, apellidos: true, cargo: true, tipo: true, run: true } },
      },
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { funcionario: { apellidos: 'asc' } }],
    });

    // Totals
    const totalHaberes = (liquidaciones as any[]).reduce((s, l) => s + Number(l.totalHaberes), 0);
    const totalLiquido = (liquidaciones as any[]).reduce((s, l) => s + Number(l.sueldoLiquido), 0);
    const totalDescuentos = (liquidaciones as any[]).reduce((s, l) => s + Number(l.totalDescuentos), 0);

    return { liquidaciones, totales: { totalHaberes, totalLiquido, totalDescuentos } };
  }

  // ─── DETALLE ─────────────────────────────────────────────────

  async findOne(id: string) {
    const liq = await this.db.liquidacionSueldo.findUnique({
      where: { id },
      include: { funcionario: true },
    });
    if (!liq) throw new NotFoundException('Liquidación no encontrada');
    return liq;
  }

  // ─── ACTUALIZAR ──────────────────────────────────────────────

  async update(id: string, dto: UpdateLiquidacionDto) {
    const liq = await this.db.liquidacionSueldo.findUnique({ where: { id } });
    if (!liq) throw new NotFoundException('Liquidación no encontrada');
    if ((liq as any).estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden editar liquidaciones en estado BORRADOR');

    const current = liq as any;
    const sueldoBase = dto.sueldoBase !== undefined ? dto.sueldoBase : Number(current.sueldoBase);
    const asignacionFamiliar = dto.asignacionFamiliar !== undefined ? dto.asignacionFamiliar : Number(current.asignacionFamiliar);
    const bonoZona = dto.bonoZona !== undefined ? dto.bonoZona : Number(current.bonoZona);
    const horasExtra = dto.horasExtra !== undefined ? dto.horasExtra : Number(current.horasExtra);
    const otrosHaberes = dto.otrosHaberes !== undefined ? dto.otrosHaberes : Number(current.otrosHaberes);
    const otrosDescuentos = dto.otrosDescuentos !== undefined ? dto.otrosDescuentos : Number(current.otrosDescuentos);

    const calc = calcularLiquidacion(
      sueldoBase, asignacionFamiliar, bonoZona, horasExtra, otrosHaberes, otrosDescuentos,
      Number(current.tasaAfp), current.salud, await this.getTasaSalud(current.salud),
    );

    return this.db.liquidacionSueldo.update({
      where: { id },
      data: {
        sueldoBase,
        asignacionFamiliar,
        bonoZona,
        horasExtra,
        otrosHaberes,
        otrosDescuentos,
        totalHaberes: calc.totalHaberes,
        montoAfp: calc.montoAfp,
        montoSalud: calc.montoSalud,
        seguroCesantia: calc.seguroCesantia,
        impuestoUnico: calc.impuestoUnico,
        totalDescuentos: calc.totalDescuentos,
        sueldoLiquido: calc.sueldoLiquido,
      },
    });
  }

  // ─── APROBAR TODAS DEL MES ────────────────────────────────────

  async aprobarMes(dto: AprobacionMesDto) {
    const result = await this.db.liquidacionSueldo.updateMany({
      where: { mes: dto.mes, anio: dto.anio, estado: 'BORRADOR' },
      data: { estado: 'APROBADA' },
    });
    return { aprobadas: result.count };
  }

  // ─── MARCAR PAGADAS ───────────────────────────────────────────

  async marcarPagadas(dto: MarcarPagadasDto) {
    const result = await this.db.liquidacionSueldo.updateMany({
      where: { mes: dto.mes, anio: dto.anio, estado: 'APROBADA' },
      data: { estado: 'PAGADA', fechaPago: new Date() },
    });
    return { pagadas: result.count };
  }

  // ─── RESUMEN ANUAL ────────────────────────────────────────────

  async getResumenAnual(anio: number) {
    const liquidaciones = await this.db.liquidacionSueldo.findMany({
      where: { anio },
      select: { mes: true, totalHaberes: true, totalDescuentos: true, sueldoLiquido: true, estado: true },
      orderBy: { mes: 'asc' },
    });

    const porMes: Record<number, { mes: number; totalHaberes: number; totalDescuentos: number; totalLiquido: number; funcionarios: number }> = {};
    for (let m = 1; m <= 12; m++) {
      porMes[m] = { mes: m, totalHaberes: 0, totalDescuentos: 0, totalLiquido: 0, funcionarios: 0 };
    }
    for (const l of liquidaciones as any[]) {
      const m = l.mes as number;
      porMes[m].totalHaberes += Number(l.totalHaberes);
      porMes[m].totalDescuentos += Number(l.totalDescuentos);
      porMes[m].totalLiquido += Number(l.sueldoLiquido);
      porMes[m].funcionarios++;
    }

    const mesesConDatos = Object.values(porMes).filter((m) => m.funcionarios > 0);
    const totalAnual = mesesConDatos.reduce((s, m) => s + m.totalHaberes, 0);
    const promedioMensual = mesesConDatos.length > 0 ? Math.round(totalAnual / mesesConDatos.length) : 0;

    return { anio, porMes: Object.values(porMes), kpi: { totalAnual, promedioMensual } };
  }

  // ─── PREVIRED ─────────────────────────────────────────────────

  async getPreviredData(mes: number, anio: number) {
    const liquidaciones = await this.db.liquidacionSueldo.findMany({
      where: { mes, anio },
      include: { funcionario: { select: { run: true, nombres: true, apellidos: true, tipo: true } } },
      orderBy: { funcionario: { apellidos: 'asc' } },
    });

    return (liquidaciones as any[]).map((l) => ({
      rut: l.funcionario.run,
      nombre: `${l.funcionario.apellidos} ${l.funcionario.nombres}`,
      tipo: l.funcionario.tipo,
      afp: l.afp,
      montoAfp: Number(l.montoAfp),
      salud: l.salud,
      montoSalud: Number(l.montoSalud),
      seguroCesantia: Number(l.seguroCesantia),
      sueldoBruto: Number(l.totalHaberes),
      sueldoImponible: Number(l.totalHaberes),
      impuestoUnico: Number(l.impuestoUnico),
      sueldoLiquido: Number(l.sueldoLiquido),
      diasTrabajados: l.diasTrabajados,
      mes,
      anio,
    }));
  }

  // ─── LIBRO DE REMUNERACIONES ──────────────────────────────────

  async getLibroRemuneraciones(mes: number, anio: number) {
    const liquidaciones = await this.db.liquidacionSueldo.findMany({
      where: { mes, anio },
      include: { funcionario: { select: { run: true, nombres: true, apellidos: true, cargo: true, tipo: true } } },
      orderBy: { funcionario: { apellidos: 'asc' } },
    });

    const totales = (liquidaciones as any[]).reduce(
      (acc, l) => ({
        totalHaberes: acc.totalHaberes + Number(l.totalHaberes),
        totalDescuentos: acc.totalDescuentos + Number(l.totalDescuentos),
        totalLiquido: acc.totalLiquido + Number(l.sueldoLiquido),
        totalAfp: acc.totalAfp + Number(l.montoAfp),
        totalSalud: acc.totalSalud + Number(l.montoSalud),
        totalImpuesto: acc.totalImpuesto + Number(l.impuestoUnico),
      }),
      { totalHaberes: 0, totalDescuentos: 0, totalLiquido: 0, totalAfp: 0, totalSalud: 0, totalImpuesto: 0 },
    );

    return { mes, anio, liquidaciones, totales };
  }

  // ─── RESUMEN PARA DASHBOARD ───────────────────────────────────

  async getResumenMes(mes: number, anio: number) {
    const current = await this.db.liquidacionSueldo.findMany({
      where: { mes, anio },
      select: { totalHaberes: true, sueldoLiquido: true, estado: true },
    });

    const mesPrev = mes === 1 ? 12 : mes - 1;
    const anioPrev = mes === 1 ? anio - 1 : anio;
    const previous = await this.db.liquidacionSueldo.findMany({
      where: { mes: mesPrev, anio: anioPrev },
      select: { totalHaberes: true },
    });

    const totalActual = (current as any[]).reduce((s, l) => s + Number(l.totalHaberes), 0);
    const totalAnterior = (previous as any[]).reduce((s, l) => s + Number(l.totalHaberes), 0);
    const variacion = totalAnterior > 0 ? Math.round((totalActual - totalAnterior) / totalAnterior * 100) : 0;

    return {
      mes, anio,
      totalHaberes: totalActual,
      totalLiquido: (current as any[]).reduce((s, l) => s + Number(l.sueldoLiquido), 0),
      funcionarios: current.length,
      variacionVsMesAnterior: variacion,
    };
  }
}
