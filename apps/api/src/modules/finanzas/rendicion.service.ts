import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateRendicionDto,
  AprobarRendicionDto,
  EnviarRendicionDto,
  RendicionQueryDto,
} from './dto/rendicion.dto';
import { v4 as uuidv4 } from 'uuid';

// Categorías permitidas por fondo SEP (vinculadas al PME)
const CATEGORIAS_PERMITIDAS_SEP = [
  'Recursos de Aprendizaje',
  'Remuneraciones SEP',
  'Asesoría y Capacitación',
];

@Injectable()
export class RendicionService {
  private readonly logger = new Logger(RendicionService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── GENERAR RENDICIÓN ────────────────────────────────────────

  async create(dto: CreateRendicionDto, usuarioId: string) {
    const fondo = await this.db.fondo.findUnique({ where: { id: dto.fondoId } });
    if (!fondo) throw new NotFoundException(`Fondo ${dto.fondoId} no encontrado`);

    // Obtener movimientos del periodo
    const movimientos = await this.db.movimientoFinanciero.findMany({
      where: {
        fondoId: dto.fondoId,
        anio: dto.anio,
        mes: { gte: dto.mesInicio, lte: dto.mesFin },
      },
      select: { tipo: true, categoria: true, monto: true },
    });

    // Validar categorías para fondo SEP
    const esSEP = (fondo as any).nombre.toUpperCase().includes('SEP');
    if (esSEP) {
      const egresosInvalidos = movimientos.filter(
        (m: any) => m.tipo === 'EGRESO' && !CATEGORIAS_PERMITIDAS_SEP.includes(m.categoria),
      );
      if (egresosInvalidos.length > 0) {
        const cats = [...new Set(egresosInvalidos.map((m: any) => m.categoria))];
        throw new BadRequestException(
          `Fondo SEP contiene gastos en categorías no vinculadas al PME: ${cats.join(', ')}`,
        );
      }
    }

    const totalIngresos = movimientos
      .filter((m: any) => m.tipo === 'INGRESO')
      .reduce((s: number, m: any) => s + Number(m.monto), 0);

    const totalGastos = movimientos
      .filter((m: any) => m.tipo === 'EGRESO')
      .reduce((s: number, m: any) => s + Number(m.monto), 0);

    const saldo = totalIngresos - totalGastos;

    const rendicion = await this.db.$transaction(async (tx: any) => {
      const r = await tx.rendicion.create({
        data: {
          fondoId: dto.fondoId,
          periodo: dto.periodo,
          mesInicio: dto.mesInicio,
          mesFin: dto.mesFin,
          anio: dto.anio,
          totalIngresos,
          totalGastos,
          saldo,
          estado: 'BORRADOR',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Rendicion',
          entidadId: r.id,
          datosDespues: { fondoId: dto.fondoId, periodo: dto.periodo, saldo } as object,
        },
      });
      return r;
    });

    return { data: rendicion };
  }

  // ─── LISTAR ───────────────────────────────────────────────────

  async findAll(query: RendicionQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.fondoId) where['fondoId'] = query.fondoId;
    if (query.estado) where['estado'] = query.estado;
    if (query.anio) where['anio'] = query.anio;

    const rendiciones = await this.db.rendicion.findMany({
      where,
      include: { fondo: { select: { id: true, nombre: true } } },
      orderBy: [{ anio: 'desc' }, { mesFin: 'desc' }],
    });

    return { data: rendiciones };
  }

  // ─── VER UNA ──────────────────────────────────────────────────

  async findOne(id: string) {
    const r = await this.db.rendicion.findUnique({
      where: { id },
      include: { fondo: { select: { id: true, nombre: true } } },
    });
    if (!r) throw new NotFoundException(`Rendición ${id} no encontrada`);
    return { data: r };
  }

  // ─── APROBAR ──────────────────────────────────────────────────

  async aprobar(id: string, dto: AprobarRendicionDto, usuarioId: string) {
    const r = await this.db.rendicion.findUnique({ where: { id } });
    if (!r) throw new NotFoundException(`Rendición ${id} no encontrada`);
    if (r.estado !== 'BORRADOR' && r.estado !== 'EN_REVISION') {
      throw new BadRequestException(`No se puede aprobar una rendición en estado ${r.estado}`);
    }

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.rendicion.update({
        where: { id },
        data: {
          estado: 'APROBADA_DIRECTOR',
          aprobadoPor: usuarioId,
          ...(dto.observaciones ? { observacionesSuperEduc: dto.observaciones } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Rendicion', entidadId: id, datosDespues: { accion: 'APROBAR' } as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── ENVIAR A SUPEREDUC ───────────────────────────────────────

  async enviar(id: string, dto: EnviarRendicionDto, usuarioId: string) {
    const r = await this.db.rendicion.findUnique({
      where: { id },
      include: { fondo: { select: { id: true, nombre: true } } },
    });
    if (!r) throw new NotFoundException(`Rendición ${id} no encontrada`);
    if (r.estado !== 'APROBADA_DIRECTOR') {
      throw new BadRequestException('La rendición debe estar aprobada por el Director antes de enviar a SuperEduc');
    }

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.rendicion.update({
        where: { id },
        data: {
          estado: 'ENVIADA_SUPEREDUC',
          fechaEnvio: new Date(),
          ...(dto.observaciones ? { observacionesSuperEduc: dto.observaciones } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Rendicion', entidadId: id, datosDespues: { accion: 'ENVIAR_SUPEREDUC' } as object },
      });
      return u;
    });

    const fondo = (r as any).fondo;
    await this.eventBus.publish({
      type: 'RENDICION_ENVIADA',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        rendicionId: id,
        fondoId: fondo.id,
        fondoNombre: fondo.nombre,
        periodo: r.periodo,
        anio: r.anio,
        totalIngresos: Number(r.totalIngresos),
        totalGastos: Number(r.totalGastos),
        saldo: Number(r.saldo),
      },
    });

    this.logger.log(`RENDICION_ENVIADA: ${id} fondo=${fondo.nombre} por ${usuarioId}`);

    return { data: updated };
  }
}
