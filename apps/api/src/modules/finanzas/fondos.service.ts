import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import { CreateFondoDto, UpdateFondoDto, FondoQueryDto } from './dto/fondos.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FondosService {
  private readonly logger = new Logger(FondosService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CRUD ─────────────────────────────────────────────────────

  async create(dto: CreateFondoDto, usuarioId: string) {
    const establecimiento = await this.db.establecimiento.findFirst();
    if (!establecimiento) throw new NotFoundException('Establecimiento no configurado');

    const existing = await this.db.fondo.findFirst({
      where: { nombre: dto.nombre, anio: dto.anio, establecimientoId: establecimiento.id },
    });
    if (existing) throw new ConflictException(`Fondo "${dto.nombre}" ya existe para el año ${dto.anio}`);

    const fondo = await this.db.$transaction(async (tx: any) => {
      const f = await tx.fondo.create({
        data: {
          nombre: dto.nombre,
          presupuestoAnual: dto.presupuestoAnual,
          anio: dto.anio,
          activo: dto.activo ?? true,
          establecimientoId: establecimiento.id,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Fondo',
          entidadId: f.id,
          datosDespues: { nombre: dto.nombre, presupuestoAnual: dto.presupuestoAnual, anio: dto.anio } as object,
        },
      });
      return f;
    });

    return { data: fondo };
  }

  async findAll(query: FondoQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.anio) where['anio'] = query.anio;
    if (query.activo !== undefined) where['activo'] = query.activo;

    const fondos = await this.db.fondo.findMany({ where, orderBy: { anio: 'desc' } });
    return { data: fondos };
  }

  async findOne(id: string) {
    const fondo = await this.db.fondo.findUnique({ where: { id } });
    if (!fondo) throw new NotFoundException(`Fondo ${id} no encontrado`);
    return { data: fondo };
  }

  async update(id: string, dto: UpdateFondoDto, usuarioId: string) {
    const fondo = await this.db.fondo.findUnique({ where: { id } });
    if (!fondo) throw new NotFoundException(`Fondo ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const f = await tx.fondo.update({
        where: { id },
        data: {
          ...(dto.nombre !== undefined ? { nombre: dto.nombre } : {}),
          ...(dto.presupuestoAnual !== undefined ? { presupuestoAnual: dto.presupuestoAnual } : {}),
          ...(dto.activo !== undefined ? { activo: dto.activo } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Fondo', entidadId: id, datosDespues: dto as object },
      });
      return f;
    });

    return { data: updated };
  }

  async remove(id: string, usuarioId: string) {
    const fondo = await this.db.fondo.findUnique({ where: { id } });
    if (!fondo) throw new NotFoundException(`Fondo ${id} no encontrado`);

    await this.db.$transaction(async (tx: any) => {
      await tx.fondo.update({ where: { id }, data: { activo: false } });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'DELETE', entidad: 'Fondo', entidadId: id, datosAntes: fondo as object },
      });
    });

    return { data: { message: 'Fondo desactivado' } };
  }

  // ─── SEMÁFORO DE FONDOS ───────────────────────────────────────
  // Verde < 80%, Amarillo 80–99%, Rojo >= 100%

  async getSemaforo(anio?: number) {
    const currentAnio = anio ?? new Date().getFullYear();

    const fondos = await this.db.fondo.findMany({
      where: { anio: currentAnio, activo: true },
    });

    const semaforo = await Promise.all(
      fondos.map(async (f: any) => {
        const agg = await this.db.movimientoFinanciero.aggregate({
          where: { fondoId: f.id, anio: currentAnio, tipo: 'EGRESO' },
          _sum: { monto: true },
        });
        const gastoEjecutado = Number(agg._sum.monto ?? 0);
        const presupuesto = Number(f.presupuestoAnual);
        const porcentaje = presupuesto > 0 ? (gastoEjecutado / presupuesto) * 100 : 0;

        let estado: string;
        if (porcentaje >= 100) estado = 'ROJO';
        else if (porcentaje >= 80) estado = 'AMARILLO';
        else estado = 'VERDE';

        // Emit FONDO_ALERTA_90 if crossing 90%
        if (porcentaje >= 90 && porcentaje < 101) {
          await this.eventBus.publish({
            type: 'FONDO_ALERTA_90',
            timestamp: new Date(),
            userId: 'system',
            tenantId: this.tenantService.getTenantId() ?? 'default',
            correlationId: uuidv4(),
            payload: {
              fondoId: f.id,
              fondoNombre: f.nombre,
              presupuestoAnual: presupuesto,
              gastoAcumulado: gastoEjecutado,
              porcentajeEjecucion: Math.round(porcentaje * 10) / 10,
            },
          }).catch(() => undefined);
        }

        return {
          id: f.id,
          nombre: f.nombre,
          presupuestoAnual: presupuesto,
          gastoEjecutado,
          saldoDisponible: presupuesto - gastoEjecutado,
          porcentajeEjecucion: Math.round(porcentaje * 10) / 10,
          estado,
        };
      }),
    );

    return {
      data: {
        anio: currentAnio,
        fondos: semaforo,
        resumen: {
          verde: semaforo.filter((f) => f.estado === 'VERDE').length,
          amarillo: semaforo.filter((f) => f.estado === 'AMARILLO').length,
          rojo: semaforo.filter((f) => f.estado === 'ROJO').length,
        },
      },
    };
  }
}
