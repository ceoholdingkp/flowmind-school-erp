import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  CreatePresupuestoDto,
  AprobarPresupuestoDto,
  ComparativaQueryDto,
} from './dto/presupuesto.dto';

@Injectable()
export class PresupuestoService {
  private readonly logger = new Logger(PresupuestoService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CREAR PRESUPUESTO ────────────────────────────────────────

  async create(dto: CreatePresupuestoDto, usuarioId: string) {
    const existing = await this.db.presupuesto.findUnique({ where: { anio: dto.anio } });
    if (existing) throw new ConflictException(`Ya existe un presupuesto para el año ${dto.anio}`);

    const presupuesto = await this.db.$transaction(async (tx: any) => {
      const p = await tx.presupuesto.create({
        data: {
          anio: dto.anio,
          estado: 'BORRADOR',
        },
      });

      for (const linea of dto.lineas) {
        const fondo = await tx.fondo.findUnique({ where: { id: linea.fondoId } });
        if (!fondo) throw new NotFoundException(`Fondo ${linea.fondoId} no encontrado`);

        await tx.presupuestoLinea.create({
          data: {
            presupuestoId: p.id,
            fondoId: linea.fondoId,
            categoriaGasto: linea.categoriaGasto,
            montoAnual: linea.montoAnual,
            montoMensual: linea.montoMensual ?? null,
          },
        });
      }

      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Presupuesto',
          entidadId: p.id,
          datosDespues: { anio: dto.anio, totalLineas: dto.lineas.length } as object,
        },
      });

      return p;
    });

    return { data: presupuesto };
  }

  // ─── LISTAR / VER ─────────────────────────────────────────────

  async findAll() {
    const presupuestos = await this.db.presupuesto.findMany({
      include: { lineas: { include: { fondo: { select: { nombre: true } } } } },
      orderBy: { anio: 'desc' },
    });
    return { data: presupuestos };
  }

  async findOne(id: string) {
    const p = await this.db.presupuesto.findUnique({
      where: { id },
      include: { lineas: { include: { fondo: { select: { id: true, nombre: true } } } } },
    });
    if (!p) throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    return { data: p };
  }

  // ─── APROBAR ──────────────────────────────────────────────────

  async aprobar(id: string, dto: AprobarPresupuestoDto, usuarioId: string) {
    const p = await this.db.presupuesto.findUnique({ where: { id } });
    if (!p) throw new NotFoundException(`Presupuesto ${id} no encontrado`);
    if (p.estado !== 'BORRADOR') throw new BadRequestException('Solo se pueden aprobar presupuestos en estado BORRADOR');

    const updated = await this.db.$transaction(async (tx: any) => {
      const u = await tx.presupuesto.update({
        where: { id },
        data: { estado: 'APROBADO', aprobadoPor: usuarioId, fechaAprobacion: new Date() },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Presupuesto', entidadId: id, datosDespues: { accion: 'APROBAR' } as object },
      });
      return u;
    });

    return { data: updated };
  }

  // ─── COMPARATIVA PRESUPUESTADO vs EJECUTADO ───────────────────

  async getComparativa(query: ComparativaQueryDto) {
    const anio = query.anio ?? new Date().getFullYear();

    const presupuesto = await this.db.presupuesto.findUnique({
      where: { anio },
      include: {
        lineas: {
          where: query.fondoId ? { fondoId: query.fondoId } : undefined,
          include: { fondo: { select: { id: true, nombre: true } } },
        },
      },
    });

    if (!presupuesto) {
      return { data: { anio, mensaje: 'No existe presupuesto para este año', lineas: [] } };
    }

    const comparativa = await Promise.all(
      (presupuesto.lineas as any[]).map(async (linea: any) => {
        const ejecutado = await this.db.movimientoFinanciero.aggregate({
          where: {
            fondoId: linea.fondoId,
            categoria: linea.categoriaGasto,
            anio,
            tipo: 'EGRESO',
          },
          _sum: { monto: true },
        });

        const montoEjecutado = Number(ejecutado._sum.monto ?? 0);
        const montoPresupuestado = Number(linea.montoAnual);
        const porcentaje = montoPresupuestado > 0 ? (montoEjecutado / montoPresupuestado) * 100 : 0;

        let alerta: string | null = null;
        if (porcentaje >= 100) alerta = 'SUPERADO';
        else if (porcentaje >= 80) alerta = 'CERCA_LIMITE';

        return {
          lineaId: linea.id,
          fondo: linea.fondo,
          categoriaGasto: linea.categoriaGasto,
          montoPresupuestado,
          montoEjecutado,
          saldo: montoPresupuestado - montoEjecutado,
          porcentajeEjecucion: Math.round(porcentaje * 10) / 10,
          alerta,
        };
      }),
    );

    const totalPresupuestado = comparativa.reduce((s, l) => s + l.montoPresupuestado, 0);
    const totalEjecutado = comparativa.reduce((s, l) => s + l.montoEjecutado, 0);

    return {
      data: {
        presupuestoId: presupuesto.id,
        anio,
        estado: presupuesto.estado,
        lineas: comparativa,
        totales: {
          presupuestado: Math.round(totalPresupuestado * 100) / 100,
          ejecutado: Math.round(totalEjecutado * 100) / 100,
          saldo: Math.round((totalPresupuestado - totalEjecutado) * 100) / 100,
          porcentajeEjecucion: totalPresupuestado > 0
            ? Math.round((totalEjecutado / totalPresupuestado) * 1000) / 10
            : 0,
        },
        alertas: comparativa.filter((l) => l.alerta !== null).length,
      },
    };
  }
}
