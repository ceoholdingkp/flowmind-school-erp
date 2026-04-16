import {
  Injectable, NotFoundException, BadRequestException, Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateContratoLaboralDto, UpdateContratoLaboralDto,
  AddAnexoDto, TerminarContratoDto, ContratoQueryDto,
} from './dto/contratos.dto';
import { v4 as uuidv4 } from 'uuid';

const DIAS_ALERTA_VENCIMIENTO = 30;

@Injectable()
export class ContratosService {
  private readonly logger = new Logger(ContratosService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CREAR CONTRATO ───────────────────────────────────────────

  async create(funcionarioId: string, dto: CreateContratoLaboralDto, usuarioId: string) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const contrato = await this.db.$transaction(async (tx: any) => {
      const c = await tx.contratoLaboral.create({
        data: {
          funcionarioId,
          tipo: dto.tipo,
          cargo: dto.cargo,
          funciones: dto.funciones ?? null,
          horasSemanales: dto.horasSemanales,
          sueldoBruto: dto.sueldoBruto,
          fechaInicio: new Date(dto.fechaInicio),
          fechaTermino: dto.fechaTermino ? new Date(dto.fechaTermino) : null,
          estado: 'VIGENTE',
          documento: dto.documento ?? null,
          anexos: [],
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'ContratoLaboral',
          entidadId: c.id,
          datosDespues: { funcionarioId, tipo: dto.tipo, sueldoBruto: dto.sueldoBruto } as object,
        },
      });
      return c;
    });

    return { data: contrato };
  }

  // ─── LISTAR CONTRATOS DE UN FUNCIONARIO ───────────────────────

  async findAll(funcionarioId: string, query: ContratoQueryDto) {
    const funcionario = await this.db.funcionario.findFirst({
      where: { id: funcionarioId, deletedAt: null },
    });
    if (!funcionario) throw new NotFoundException(`Funcionario ${funcionarioId} no encontrado`);

    const where: Record<string, unknown> = { funcionarioId };
    if (query.estado) where['estado'] = query.estado;

    const contratos = await this.db.contratoLaboral.findMany({
      where,
      orderBy: { fechaInicio: 'desc' },
    });

    return { data: contratos };
  }

  // ─── VER UNO ──────────────────────────────────────────────────

  async findOne(id: string) {
    const c = await this.db.contratoLaboral.findUnique({
      where: { id },
      include: { funcionario: { select: { id: true, nombres: true, apellidos: true, run: true } } },
    });
    if (!c) throw new NotFoundException(`Contrato ${id} no encontrado`);
    return { data: c };
  }

  // ─── ACTUALIZAR ───────────────────────────────────────────────

  async update(id: string, dto: UpdateContratoLaboralDto, usuarioId: string) {
    const c = await this.db.contratoLaboral.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Contrato ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.contratoLaboral.update({
        where: { id },
        data: {
          ...(dto.cargo !== undefined ? { cargo: dto.cargo } : {}),
          ...(dto.funciones !== undefined ? { funciones: dto.funciones } : {}),
          ...(dto.horasSemanales !== undefined ? { horasSemanales: dto.horasSemanales } : {}),
          ...(dto.sueldoBruto !== undefined ? { sueldoBruto: dto.sueldoBruto } : {}),
          ...(dto.fechaTermino !== undefined ? { fechaTermino: new Date(dto.fechaTermino) } : {}),
          ...(dto.estado !== undefined ? { estado: dto.estado } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'ContratoLaboral', entidadId: id, datosDespues: dto as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── AGREGAR ANEXO ────────────────────────────────────────────

  async addAnexo(id: string, dto: AddAnexoDto, usuarioId: string) {
    const c = await this.db.contratoLaboral.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Contrato ${id} no encontrado`);

    const anexos: any[] = Array.isArray(c.anexos) ? (c.anexos as any[]) : [];
    anexos.push({
      fecha: dto.fecha,
      descripcion: dto.descripcion,
      documento: dto.documento ?? null,
      registradoPor: usuarioId,
      createdAt: new Date().toISOString(),
    });

    await this.db.contratoLaboral.update({ where: { id }, data: { anexos } });
    return { data: { message: 'Anexo agregado', anexos } };
  }

  // ─── TERMINAR CONTRATO ────────────────────────────────────────

  async terminar(id: string, dto: TerminarContratoDto, usuarioId: string) {
    const c = await this.db.contratoLaboral.findUnique({
      where: { id },
      include: { funcionario: { select: { id: true, nombres: true, apellidos: true } } },
    });
    if (!c) throw new NotFoundException(`Contrato ${id} no encontrado`);
    if (c.estado === 'TERMINADO') throw new BadRequestException('El contrato ya está terminado');

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.contratoLaboral.update({
        where: { id },
        data: {
          estado: 'TERMINADO',
          fechaTermino: new Date(dto.fechaTermino),
          causalTermino: dto.causalTermino,
          finiquito: dto.finiquito ?? null,
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'ContratoLaboral', entidadId: id, datosDespues: { accion: 'TERMINAR', causalTermino: dto.causalTermino } as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── CONTRATOS POR VENCER ─────────────────────────────────────

  async getPorVencer(usuarioId: string) {
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_ALERTA_VENCIMIENTO);

    const contratos = await this.db.contratoLaboral.findMany({
      where: {
        estado: 'VIGENTE',
        fechaTermino: { gte: hoy, lte: limite },
      },
      include: {
        funcionario: { select: { id: true, run: true, nombres: true, apellidos: true, cargo: true } },
      },
      orderBy: { fechaTermino: 'asc' },
    });

    // Emit CONTRATO_POR_VENCER for each
    for (const c of contratos) {
      const diasRestantes = Math.ceil(
        (new Date(c.fechaTermino!).getTime() - hoy.getTime()) / 86400000,
      );
      const func = (c as any).funcionario;

      await this.eventBus.publish({
        type: 'CONTRATO_POR_VENCER',
        timestamp: new Date(),
        userId: usuarioId,
        tenantId: this.tenantService.getTenantId() ?? 'default',
        correlationId: uuidv4(),
        payload: {
          contratoId: c.id,
          funcionarioId: func.id,
          nombreFuncionario: `${func.nombres} ${func.apellidos}`,
          cargo: func.cargo,
          fechaTermino: new Date(c.fechaTermino!).toISOString().split('T')[0],
          diasRestantes,
        },
      }).catch(() => undefined);

      this.logger.warn(
        `CONTRATO_POR_VENCER: ${func.nombres} ${func.apellidos} — ${diasRestantes} días`,
      );
    }

    return {
      data: {
        total: contratos.length,
        contratos: contratos.map((c: any) => ({
          ...c,
          diasRestantes: Math.ceil(
            (new Date(c.fechaTermino!).getTime() - hoy.getTime()) / 86400000,
          ),
        })),
      },
    };
  }
}
