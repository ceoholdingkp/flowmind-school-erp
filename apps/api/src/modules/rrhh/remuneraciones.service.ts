import {
  Injectable, NotFoundException, ConflictException, BadRequestException, Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  GenerarLiquidacionDto, GenerarMasivaDto, LiquidacionQueryDto, AprobarLiquidacionDto,
} from './dto/remuneraciones.dto';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';

// ─── TASAS LEGALES CHILE (aproximadas 2026) ──────────────────────
const TASA_AFP_DEFAULT = 10.0;       // % del imponible
const TASA_SALUD_DEFAULT = 7.0;      // % del imponible
const TASA_CESANTIA_TRABAJADOR = 0.6; // % del imponible
const UTM_2026 = 66_000;             // CLP por UTM (aproximado)

// Valor hora docente por tramo de carrera (SBM base ≈ 360,000 CLP / 44h)
const VALOR_HORA_TRAMO: Record<string, number> = {
  INICIAL:   8_182,
  TEMPRANO:  9_818,
  AVANZADO: 11_454,
  EXPERTO_I: 13_090,
  EXPERTO_II: 14_727,
};

// BRP por tramo (% adicional sobre SBM)
const BRP_TRAMO: Record<string, number> = {
  INICIAL:   0,
  TEMPRANO:  10,
  AVANZADO:  25,
  EXPERTO_I: 40,
  EXPERTO_II: 60,
};

// ─── IMPUESTO ÚNICO (tramos mensuales en CLP, año 2026 aprox.) ───
function calcularImpuestoUnico(baseImponible: number): number {
  const utm = UTM_2026;
  const tramos = [
    { hasta: 13.5 * utm, tasa: 0,    rebaja: 0 },
    { hasta: 30 * utm,   tasa: 0.04, rebaja: 13.5 * utm * 0.04 },
    { hasta: 50 * utm,   tasa: 0.08, rebaja: 13.5 * utm * 0.04 + 16.5 * utm * 0.04 },
    { hasta: 70 * utm,   tasa: 0.135,rebaja: 0 },
    { hasta: 90 * utm,   tasa: 0.23, rebaja: 0 },
    { hasta: 120 * utm,  tasa: 0.304,rebaja: 0 },
    { hasta: Infinity,   tasa: 0.35, rebaja: 0 },
  ];

  for (const t of tramos) {
    if (baseImponible <= t.hasta) {
      return Math.max(0, baseImponible * t.tasa - t.rebaja);
    }
  }
  return 0;
}

@Injectable()
export class RemuneracionesService {
  private readonly logger = new Logger(RemuneracionesService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CALCULAR HABERES DOCENTE ─────────────────────────────────

  private calcularHaberesDocente(
    funcionario: any,
    sueldoBase: number,
    horasExtra: number,
    bonoExtra: number,
  ): Array<{ concepto: string; monto: number }> {
    const tramo = funcionario.tramoCarrera ?? 'INICIAL';
    const valorHora = VALOR_HORA_TRAMO[tramo] ?? VALOR_HORA_TRAMO.INICIAL;
    const sbm = funcionario.horasContrato * valorHora;

    // Si se proveyó sueldoBase explícito, usarlo; si no, calcular desde SBM
    const base = sueldoBase > 0 ? sueldoBase : sbm;

    const brp = Math.round(base * (BRP_TRAMO[tramo] ?? 0) / 100);

    // Años de experiencia (aprox desde fechaIngreso)
    const aniosServicio = funcionario.fechaIngreso
      ? Math.floor((Date.now() - new Date(funcionario.fechaIngreso).getTime()) / (365.25 * 24 * 3600000))
      : 0;
    const asigExperiencia = Math.round(base * Math.min(aniosServicio * 0.02, 0.20)); // max 20%

    // Horas extra (valor hora × 1.5)
    const valorHoraExtra = Math.round(base / (funcionario.horasContrato * 4.33) * 1.5);
    const montoHorasExtra = Math.round(horasExtra * valorHoraExtra);

    const haberes = [
      { concepto: 'Sueldo Base', monto: base },
      { concepto: 'BRP (Bonificación Reconocimiento Profesional)', monto: brp },
      { concepto: 'Asignación de Experiencia', monto: asigExperiencia },
    ];

    if (montoHorasExtra > 0) haberes.push({ concepto: 'Horas Extra', monto: montoHorasExtra });
    if (bonoExtra > 0) haberes.push({ concepto: 'Bono Extra', monto: bonoExtra });

    return haberes;
  }

  // ─── CALCULAR HABERES ASISTENTE ───────────────────────────────

  private calcularHaberesAsistente(
    funcionario: any,
    sueldoBase: number,
    horasExtra: number,
    bonoExtra: number,
  ): Array<{ concepto: string; monto: number }> {
    const base = sueldoBase > 0 ? sueldoBase : (Number(funcionario.sueldoBase) || 450_000);

    // Gratificación legal: 25% con tope de 4.75 UTM mensual
    const topeGratificacion = Math.round(4.75 * UTM_2026);
    const gratificacion = Math.min(Math.round(base * 0.25), topeGratificacion);

    // Horas extra
    const valorHoraExtra = Math.round(base / (funcionario.horasContrato * 4.33) * 1.5);
    const montoHorasExtra = Math.round(horasExtra * valorHoraExtra);

    const haberes = [
      { concepto: 'Sueldo Base', monto: base },
      { concepto: 'Gratificación Legal', monto: gratificacion },
    ];

    if (montoHorasExtra > 0) haberes.push({ concepto: 'Horas Extra', monto: montoHorasExtra });
    if (bonoExtra > 0) haberes.push({ concepto: 'Bono Extra', monto: bonoExtra });

    return haberes;
  }

  // ─── CALCULAR DESCUENTOS ──────────────────────────────────────

  private calcularDescuentos(
    totalHaberes: number,
    tasaAFP: number,
    tasaSalud: number,
  ): Array<{ concepto: string; monto: number }> {
    const afp = Math.round(totalHaberes * tasaAFP / 100);
    const salud = Math.round(totalHaberes * tasaSalud / 100);
    const cesantia = Math.round(totalHaberes * TASA_CESANTIA_TRABAJADOR / 100);

    // Base para impuesto = totalHaberes - descuentos previsionales
    const baseImpuesto = totalHaberes - afp - salud - cesantia;
    const impuesto = Math.round(calcularImpuestoUnico(Math.max(0, baseImpuesto)));

    return [
      { concepto: `AFP (${tasaAFP}%)`, monto: afp },
      { concepto: `Salud (${tasaSalud}%)`, monto: salud },
      { concepto: `Seguro Cesantía (${TASA_CESANTIA_TRABAJADOR}%)`, monto: cesantia },
      { concepto: 'Impuesto Único 2ª Categoría', monto: impuesto },
    ];
  }

  // ─── GENERAR LIQUIDACIÓN ──────────────────────────────────────

  async generar(dto: GenerarLiquidacionDto, usuarioId: string) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: dto.funcionarioId, deletedAt: null },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${dto.funcionarioId} no encontrado`);

    // Verificar que no exista ya una liquidación para este mes/año
    const existing = await this.db.liquidacion.findUnique({
      where: { funcionarioId_mes_anio: { funcionarioId: dto.funcionarioId, mes: dto.mes, anio: dto.anio } },
    });
    if (existing) {
      throw new ConflictException(
        `Ya existe una liquidación para ${funcionario.nombres} en ${dto.mes}/${dto.anio}`,
      );
    }

    const tasaAFP = dto.tasaAFP ?? TASA_AFP_DEFAULT;
    const tasaSalud = dto.tasaSalud ?? TASA_SALUD_DEFAULT;
    const sueldoBase = dto.sueldoBase ?? Number(funcionario.sueldoBase ?? 0);
    const horasExtra = dto.horasExtra ?? 0;
    const bonoExtra = dto.bonoExtra ?? 0;

    // Calcular haberes según tipo de funcionario
    const esDocente = ['DOCENTE', 'DIRECTIVO'].includes(funcionario.tipo);
    const detalleHaberes = esDocente
      ? this.calcularHaberesDocente(funcionario, sueldoBase, horasExtra, bonoExtra)
      : this.calcularHaberesAsistente(funcionario, sueldoBase, horasExtra, bonoExtra);

    const totalHaberes = detalleHaberes.reduce((s, h) => s + h.monto, 0);

    const detalleDescuentos = this.calcularDescuentos(totalHaberes, tasaAFP, tasaSalud);
    const totalDescuentos = detalleDescuentos.reduce((s, d) => s + d.monto, 0);
    const liquidoAPago = totalHaberes - totalDescuentos;

    // Validar imputación por fondo (deben sumar 100%)
    const fondoImputacion = dto.fondoImputacion ?? [];
    if (fondoImputacion.length > 0) {
      const totalPct = fondoImputacion.reduce((s, f) => s + f.porcentaje, 0);
      if (Math.abs(totalPct - 100) > 0.01) {
        throw new BadRequestException(`La imputación por fondos debe sumar 100% (actual: ${totalPct}%)`);
      }
    }

    // Build fondoImputacion con montos calculados
    const imputacionConMontos = await Promise.all(
      fondoImputacion.map(async (fi) => {
        const fondo = await this.db.fondo.findUnique({
          where: { id: fi.fondoId },
          select: { id: true, nombre: true },
        });
        if (!fondo) throw new NotFoundException(`Fondo ${fi.fondoId} no encontrado`);
        return {
          fondoId: fi.fondoId,
          fondoNombre: (fondo as any).nombre,
          porcentaje: fi.porcentaje,
          monto: Math.round(totalHaberes * fi.porcentaje / 100),
        };
      }),
    );

    const liquidacion = await this.db.$transaction(async (tx: any) => {
      const liq = await tx.liquidacion.create({
        data: {
          funcionarioId: dto.funcionarioId,
          mes: dto.mes,
          anio: dto.anio,
          sueldoBase: detalleHaberes[0]?.monto ?? sueldoBase,
          totalHaberes,
          totalDescuentos,
          liquidoAPago,
          detalleHaberes,
          detalleDescuentos,
          fondoImputacion: imputacionConMontos,
          estado: 'BORRADOR',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Liquidacion',
          entidadId: liq.id,
          datosDespues: {
            funcionarioId: dto.funcionarioId,
            mes: dto.mes,
            anio: dto.anio,
            totalHaberes,
            liquidoAPago,
          } as object,
        },
      });
      return liq;
    });

    // Publish LIQUIDACION_GENERADA event
    await this.eventBus.publish({
      type: 'LIQUIDACION_GENERADA',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        liquidacionId: liquidacion.id,
        funcionarioId: funcionario.id,
        nombreFuncionario: `${funcionario.nombres} ${funcionario.apellidos}`,
        mes: dto.mes,
        anio: dto.anio,
        totalHaberes,
        totalDescuentos,
        liquidoAPago,
        fondoImputacion: imputacionConMontos,
      },
    });

    this.logger.log(
      `LIQUIDACION_GENERADA: ${funcionario.nombres} ${funcionario.apellidos} ` +
      `${dto.mes}/${dto.anio} — líquido=$${liquidoAPago.toLocaleString()}`,
    );

    return { data: liquidacion };
  }

  // ─── GENERACIÓN MASIVA ────────────────────────────────────────

  async generarMasiva(dto: GenerarMasivaDto, usuarioId: string) {
    const resultados: any[] = [];

    for (const liq of dto.liquidaciones) {
      try {
        const res = await this.generar(liq, usuarioId);
        resultados.push({ funcionarioId: liq.funcionarioId, ok: true, liquidacionId: (res.data as any).id });
      } catch (err: any) {
        resultados.push({ funcionarioId: liq.funcionarioId, ok: false, error: err.message });
      }
    }

    const exitosas = resultados.filter((r) => r.ok).length;
    return {
      data: {
        total: dto.liquidaciones.length,
        exitosas,
        conError: dto.liquidaciones.length - exitosas,
        resultados,
      },
    };
  }

  // ─── LISTAR LIQUIDACIONES ─────────────────────────────────────

  async findAll(query: LiquidacionQueryDto) {
    const { funcionarioId, mes, anio, estado, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (funcionarioId) where['funcionarioId'] = funcionarioId;
    if (mes) where['mes'] = mes;
    if (anio) where['anio'] = anio;
    if (estado) where['estado'] = estado;

    const [total, liquidaciones] = await Promise.all([
      this.db.liquidacion.count({ where }),
      this.db.liquidacion.findMany({
        where,
        skip,
        take: limit,
        include: {
          funcionario: { select: { id: true, run: true, nombres: true, apellidos: true, tipo: true } },
        },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      }),
    ]);

    return {
      data: liquidaciones,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── VER UNA ──────────────────────────────────────────────────

  async findOne(id: string) {
    const liq = await this.db.liquidacion.findUnique({
      where: { id },
      include: {
        funcionario: {
          select: { id: true, run: true, nombres: true, apellidos: true, tipo: true, cargo: true, afp: true, isapre: true },
        },
      },
    });
    if (!liq) throw new NotFoundException(`Liquidación ${id} no encontrada`);
    return { data: liq };
  }

  // ─── APROBAR LIQUIDACIÓN ──────────────────────────────────────

  async aprobar(id: string, dto: AprobarLiquidacionDto, usuarioId: string) {
    const liq = await this.db.liquidacion.findUnique({ where: { id } });
    if (!liq) throw new NotFoundException(`Liquidación ${id} no encontrada`);
    if (liq.estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden aprobar liquidaciones en BORRADOR');

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.liquidacion.update({
        where: { id },
        data: {
          estado: 'APROBADA',
          ...(dto.fechaPago ? { fechaPago: new Date(dto.fechaPago) } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Liquidacion', entidadId: id, datosDespues: { accion: 'APROBAR' } as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── EXPORT PREVIRED ──────────────────────────────────────────

  async exportPrevired(mes: number, anio: number): Promise<Buffer> {
    const liquidaciones = await this.db.liquidacion.findMany({
      where: { mes, anio, estado: { in: ['APROBADA', 'PAGADA'] } },
      include: {
        funcionario: {
          select: { run: true, nombres: true, apellidos: true, afp: true, isapre: true, horasContrato: true },
        },
      },
    });

    const rows = (liquidaciones as any[]).map((liq) => {
      const func = liq.funcionario;
      const haberes = liq.detalleHaberes as any[];
      const descuentos = liq.detalleDescuentos as any[];
      const afpMonto = descuentos.find((d: any) => d.concepto?.includes('AFP'))?.monto ?? 0;
      const saludMonto = descuentos.find((d: any) => d.concepto?.includes('Salud'))?.monto ?? 0;

      return {
        RUT: func.run,
        Nombre: `${func.apellidos} ${func.nombres}`,
        AFP: func.afp ?? 'CAPITAL',
        CodAFP: '02',
        Monto_AFP: afpMonto,
        Isapre: func.isapre ?? 'FONASA',
        CodIsapre: '7',
        Monto_Salud: saludMonto,
        Sueldo_Bruto: liq.totalHaberes,
        Sueldo_Imponible: liq.totalHaberes,
        Dias_Trabajados: 30,
        Horas_Semana: func.horasContrato,
        Mes: mes,
        Anio: anio,
      };
    });

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Previred');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── EXPORT LRE (Libro Remuneraciones Electrónico) ────────────

  async exportLRE(mes: number, anio: number): Promise<Buffer> {
    const liquidaciones = await this.db.liquidacion.findMany({
      where: { mes, anio },
      include: {
        funcionario: {
          select: { run: true, nombres: true, apellidos: true, cargo: true, tipo: true },
        },
      },
    });

    const rows = (liquidaciones as any[]).map((liq) => {
      const func = liq.funcionario;
      return {
        RUN: func.run,
        Apellido_Paterno: func.apellidos.split(' ')[0],
        Apellido_Materno: func.apellidos.split(' ')[1] ?? '',
        Nombres: func.nombres,
        Cargo: func.cargo,
        Tipo: func.tipo,
        Sueldo_Base: liq.sueldoBase,
        Total_Haberes: liq.totalHaberes,
        Total_Descuentos: liq.totalDescuentos,
        Liquido_Pago: liq.liquidoAPago,
        Estado: liq.estado,
        Mes: mes,
        Anio: anio,
      };
    });

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'LRE');
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
