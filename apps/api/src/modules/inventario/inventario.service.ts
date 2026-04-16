import { Injectable, Logger } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import { CreateBienDto, UpdateBienDto, DarDeBajaDto, BienQueryDto } from './inventario.dto';

@Injectable()
export class InventarioService {
  private readonly logger = new Logger(InventarioService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  private async generarCodigo(): Promise<string> {
    const count = await this.db.bienInventario.count();
    const num = (count + 1).toString().padStart(4, '0');
    return `INV-${num}`;
  }

  async create(data: CreateBienDto) {
    const codigoInventario = await this.generarCodigo();
    return this.db.bienInventario.create({
      data: {
        codigoInventario,
        nombre: data.nombre,
        descripcion: data.descripcion,
        categoria: data.categoria as any,
        marca: data.marca,
        modelo: data.modelo,
        numeroSerie: data.numeroSerie,
        salaId: data.salaId,
        responsableId: data.responsableId,
        estado: (data.estado ?? 'BUENO') as any,
        valorAdquisicion: data.valorAdquisicion,
        fechaAdquisicion: new Date(data.fechaAdquisicion),
        fondoCompra: data.fondoCompra,
        numeroFactura: data.numeroFactura,
        vidaUtilAnios: data.vidaUtilAnios,
        foto: data.foto,
        historial: [{ fecha: new Date().toISOString(), tipo: 'ALTA', detalle: 'Ingreso al inventario' }],
      },
    });
  }

  async findAll(query: BienQueryDto) {
    const where: any = {};
    if (query.categoria) where.categoria = query.categoria;
    if (query.estado) where.estado = query.estado;
    if (query.salaId) where.salaId = query.salaId;
    if (query.q) {
      where.OR = [
        { nombre: { contains: query.q, mode: 'insensitive' } },
        { codigoInventario: { contains: query.q, mode: 'insensitive' } },
        { marca: { contains: query.q, mode: 'insensitive' } },
        { numeroSerie: { contains: query.q, mode: 'insensitive' } },
      ];
    }
    const bienes = await this.db.bienInventario.findMany({
      where,
      include: {
        sala: { select: { nombre: true } },
        responsable: { select: { nombres: true, apellidos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return { data: bienes, total: bienes.length };
  }

  async findOne(id: string) {
    return this.db.bienInventario.findUniqueOrThrow({
      where: { id },
      include: {
        sala: { select: { nombre: true } },
        responsable: { select: { nombres: true, apellidos: true } },
      },
    });
  }

  async update(id: string, data: UpdateBienDto) {
    const bien = await this.db.bienInventario.findUniqueOrThrow({ where: { id } });
    const historial = [...((bien.historial as any[]) ?? []), {
      fecha: new Date().toISOString(),
      tipo: 'ACTUALIZACION',
      detalle: `Estado actualizado a ${data.estado ?? bien.estado}`,
    }];
    return this.db.bienInventario.update({
      where: { id },
      data: { ...data, categoria: data.categoria as any, estado: data.estado as any, historial },
    });
  }

  async darDeBaja(id: string, data: DarDeBajaDto, usuarioId: string) {
    const bien = await this.db.bienInventario.findUniqueOrThrow({ where: { id } });
    const historial = [...((bien.historial as any[]) ?? []), {
      fecha: new Date().toISOString(),
      tipo: 'BAJA',
      detalle: data.motivoBaja,
      usuario: usuarioId,
    }];
    const updated = await this.db.bienInventario.update({
      where: { id },
      data: { estado: 'DADO_DE_BAJA', motivoBaja: data.motivoBaja, fechaBaja: new Date(), historial },
    });
    await this.eventBus.publish({
      type: 'BIEN_DADO_DE_BAJA',
      payload: { bienId: id, nombre: bien.nombre, motivo: data.motivoBaja } as any,
    } as any);
    return updated;
  }

  async getDashboard() {
    const [total, byCategoria, byEstado] = await Promise.all([
      this.db.bienInventario.count(),
      this.db.bienInventario.groupBy({ by: ['categoria'], _count: { id: true } }),
      this.db.bienInventario.groupBy({ by: ['estado'], _count: { id: true } }),
    ]);

    const valorTotal = await this.db.bienInventario.aggregate({
      where: { estado: { not: 'DADO_DE_BAJA' } },
      _sum: { valorAdquisicion: true },
    });

    return {
      data: {
        total,
        valorTotal: Number(valorTotal._sum.valorAdquisicion ?? 0),
        porCategoria: byCategoria.map((g: any) => ({ categoria: g.categoria, cantidad: g._count.id })),
        porEstado: byEstado.map((g: any) => ({ estado: g.estado, cantidad: g._count.id })),
      },
    };
  }
}
