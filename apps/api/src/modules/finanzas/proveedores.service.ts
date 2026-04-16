import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateProveedorDto,
  UpdateProveedorDto,
  CreateContratoDto,
  ProveedorQueryDto,
} from './dto/proveedores.dto';
import { v4 as uuidv4 } from 'uuid';

const DIAS_ALERTA_VENCIMIENTO = 30;

@Injectable()
export class ProveedoresService {
  private readonly logger = new Logger(ProveedoresService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── PROVEEDORES CRUD ─────────────────────────────────────────

  async createProveedor(dto: CreateProveedorDto, usuarioId: string) {
    const existing = await this.db.proveedor.findUnique({ where: { rut: dto.rut } });
    if (existing) throw new ConflictException(`Proveedor con RUT ${dto.rut} ya existe`);

    const proveedor = await this.db.$transaction(async (tx: any) => {
      const p = await tx.proveedor.create({
        data: {
          rut: dto.rut,
          razonSocial: dto.razonSocial,
          giro: dto.giro ?? null,
          direccion: dto.direccion ?? null,
          telefono: dto.telefono ?? null,
          email: dto.email ?? null,
          contactoNombre: dto.contactoNombre ?? null,
          cuentaBancaria: dto.cuentaBancaria ?? null,
          banco: dto.banco ?? null,
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'CREATE', entidad: 'Proveedor', entidadId: p.id, datosDespues: { rut: dto.rut, razonSocial: dto.razonSocial } as object },
      });
      return p;
    });

    return { data: proveedor };
  }

  async findAllProveedores(query: ProveedorQueryDto) {
    const skip = ((query.page ?? 1) - 1) * (query.limit ?? 20);
    const where: Record<string, unknown> = {};
    if (query.q) {
      where['OR'] = [
        { rut: { contains: query.q, mode: 'insensitive' } },
        { razonSocial: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [total, proveedores] = await Promise.all([
      this.db.proveedor.count({ where }),
      this.db.proveedor.findMany({
        where,
        skip,
        take: query.limit ?? 20,
        include: { contratos: { where: { estado: 'VIGENTE' }, select: { id: true, tipoServicio: true, fechaTermino: true } } },
        orderBy: { razonSocial: 'asc' },
      }),
    ]);

    return {
      data: proveedores,
      meta: { page: query.page ?? 1, limit: query.limit ?? 20, total, totalPages: Math.ceil(total / (query.limit ?? 20)) },
    };
  }

  async findOneProveedor(id: string) {
    const p = await this.db.proveedor.findUnique({
      where: { id },
      include: { contratos: true },
    });
    if (!p) throw new NotFoundException(`Proveedor ${id} no encontrado`);
    return { data: p };
  }

  async updateProveedor(id: string, dto: UpdateProveedorDto, usuarioId: string) {
    const p = await this.db.proveedor.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Proveedor ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.proveedor.update({ where: { id }, data: dto });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Proveedor', entidadId: id, datosDespues: dto as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── CONTRATOS ────────────────────────────────────────────────

  async createContrato(proveedorId: string, dto: CreateContratoDto, usuarioId: string) {
    const proveedor = await this.db.proveedor.findUnique({ where: { id: proveedorId } });
    if (!proveedor) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);

    const contrato = await this.db.$transaction(async (tx: any) => {
      const c = await tx.contratoProveedor.create({
        data: {
          proveedorId,
          tipoServicio: dto.tipoServicio,
          numeroContrato: dto.numeroContrato ?? null,
          montoTotal: dto.montoTotal ?? null,
          montoMensual: dto.montoMensual ?? null,
          fechaInicio: new Date(dto.fechaInicio),
          fechaTermino: dto.fechaTermino ? new Date(dto.fechaTermino) : null,
          fondoImputacion: dto.fondoImputacion ?? null,
          estado: 'VIGENTE',
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'CREATE', entidad: 'ContratoProveedor', entidadId: c.id, datosDespues: { proveedorId, tipoServicio: dto.tipoServicio } as object },
      });
      return c;
    });

    return { data: contrato };
  }

  async findContratosProveedor(proveedorId: string) {
    const proveedor = await this.db.proveedor.findUnique({ where: { id: proveedorId } });
    if (!proveedor) throw new NotFoundException(`Proveedor ${proveedorId} no encontrado`);

    const contratos = await this.db.contratoProveedor.findMany({
      where: { proveedorId },
      orderBy: { fechaInicio: 'desc' },
    });

    return { data: contratos };
  }

  // ─── CONTRATOS POR VENCER ─────────────────────────────────────

  async getContratosPorVencer(usuarioId?: string) {
    const hoy = new Date();
    const limite = new Date();
    limite.setDate(limite.getDate() + DIAS_ALERTA_VENCIMIENTO);

    const contratos = await this.db.contratoProveedor.findMany({
      where: {
        estado: 'VIGENTE',
        fechaTermino: { gte: hoy, lte: limite },
      },
      include: {
        proveedor: { select: { id: true, rut: true, razonSocial: true } },
      },
      orderBy: { fechaTermino: 'asc' },
    });

    // Mark as POR_VENCER and emit events
    for (const c of contratos) {
      if (c.estado === 'VIGENTE') {
        await this.db.contratoProveedor.update({
          where: { id: c.id },
          data: { estado: 'POR_VENCER' },
        });
      }

      const diasRestantes = Math.ceil(
        ((c.fechaTermino as Date).getTime() - hoy.getTime()) / 86400000,
      );

      // Emit CONTRATO_POR_VENCER event (from RRHH domain - reuse for proveedor)
      this.logger.warn(
        `Contrato ${c.id} con ${(c as any).proveedor.razonSocial} vence en ${diasRestantes} días`,
      );
    }

    return {
      data: {
        contratos: contratos.map((c: any) => ({
          ...c,
          diasRestantes: Math.ceil((new Date(c.fechaTermino).getTime() - hoy.getTime()) / 86400000),
        })),
        total: contratos.length,
      },
    };
  }
}
