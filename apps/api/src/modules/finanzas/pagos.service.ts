import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreatePagoDto,
  UpdatePagoEstadoDto,
  WebhookPagoDto,
  PagoQueryDto,
} from './dto/pagos.dto';
import { v4 as uuidv4 } from 'uuid';

// Meses sin pago = moroso
const MESES_MORA = 2;

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── REGISTRAR PAGO ───────────────────────────────────────────

  async create(dto: CreatePagoDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: dto.alumnoId, deletedAt: null },
      include: {
        curso: { select: { id: true, nombre: true } },
        apoderados: {
          where: { esTitular: true },
          include: { apoderado: { select: { email: true, telefono: true } } },
        },
      },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${dto.alumnoId} no encontrado`);

    const pago = await this.db.$transaction(async (tx: any) => {
      const p = await tx.pago.create({
        data: {
          alumnoId: dto.alumnoId,
          monto: dto.monto,
          fecha: new Date(dto.fecha),
          metodo: dto.metodo,
          referencia: dto.referencia ?? null,
          estado: 'PAGADO',
          descripcion: dto.descripcion ?? null,
          cuotaNumero: dto.cuotaNumero ?? null,
          mesCorresponde: dto.mesCorresponde ?? null,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Pago',
          entidadId: p.id,
          datosDespues: { alumnoId: dto.alumnoId, monto: dto.monto, metodo: dto.metodo } as object,
        },
      });
      return p;
    });

    const apoderado = (alumno as any).apoderados?.[0]?.apoderado;
    await this.eventBus.publish({
      type: 'PAGO_REGISTRADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        pagoId: pago.id,
        alumnoId: alumno.id,
        nombreAlumno: `${(alumno as any).nombres} ${(alumno as any).apellidoPaterno}`,
        monto: dto.monto,
        metodo: dto.metodo,
        referencia: dto.referencia ?? null,
        cuotaNumero: dto.cuotaNumero ?? null,
        mesCorresponde: dto.mesCorresponde ?? null,
        apoderadoEmail: apoderado?.email ?? null,
        apoderadoTelefono: apoderado?.telefono ?? null,
      },
    });

    return { data: pago };
  }

  // ─── LISTAR PAGOS ─────────────────────────────────────────────

  async findAll(query: PagoQueryDto) {
    const { alumnoId, estado, mesCorresponde, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (alumnoId) where['alumnoId'] = alumnoId;
    if (estado) where['estado'] = estado;
    if (mesCorresponde) where['mesCorresponde'] = mesCorresponde;

    const [total, pagos] = await Promise.all([
      this.db.pago.count({ where }),
      this.db.pago.findMany({
        where,
        skip,
        take: limit,
        include: {
          alumno: {
            select: {
              id: true, run: true, nombres: true, apellidoPaterno: true,
              curso: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    return {
      data: pagos,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── ACTUALIZAR ESTADO (MANUAL) ───────────────────────────────

  async updateEstado(id: string, dto: UpdatePagoEstadoDto, usuarioId: string) {
    const pago = await this.db.pago.findUnique({ where: { id } });
    if (!pago) throw new NotFoundException(`Pago ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const p = await tx.pago.update({
        where: { id },
        data: {
          estado: dto.estado,
          ...(dto.referencia !== undefined ? { referencia: dto.referencia } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: { usuarioId, accion: 'UPDATE', entidad: 'Pago', entidadId: id, datosDespues: dto as object },
      });
      return p;
    });

    return { data: updated };
  }

  // ─── WEBHOOK PASARELA ─────────────────────────────────────────

  async webhook(dto: WebhookPagoDto) {
    const pago = await this.db.pago.findFirst({
      where: { referencia: dto.referencia },
      include: {
        alumno: {
          select: {
            id: true, nombres: true, apellidoPaterno: true,
            apoderados: {
              where: { esTitular: true },
              include: { apoderado: { select: { email: true, telefono: true } } },
            },
          },
        },
      },
    });
    if (!pago) throw new NotFoundException(`Pago con referencia ${dto.referencia} no encontrado`);

    await this.db.pago.update({
      where: { id: pago.id },
      data: { estado: dto.estado },
    });

    if (dto.estado === 'PAGADO') {
      const alumno = (pago as any).alumno;
      const apoderado = alumno?.apoderados?.[0]?.apoderado;
      await this.eventBus.publish({
        type: 'PAGO_REGISTRADO',
        timestamp: new Date(),
        userId: 'webhook',
        tenantId: this.tenantService.getTenantId() ?? 'default',
        correlationId: uuidv4(),
        payload: {
          pagoId: pago.id,
          alumnoId: alumno.id,
          nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
          monto: Number(pago.monto),
          metodo: pago.metodo,
          referencia: dto.referencia,
          cuotaNumero: pago.cuotaNumero,
          mesCorresponde: pago.mesCorresponde,
          apoderadoEmail: apoderado?.email ?? null,
          apoderadoTelefono: apoderado?.telefono ?? null,
        },
      });
    }

    return { data: { message: `Pago actualizado a ${dto.estado}`, pagoId: pago.id } };
  }

  // ─── MOROSOS ──────────────────────────────────────────────────

  async getMorosos(usuarioId: string) {
    const currentMes = new Date().getMonth() + 1;
    const currentAnio = new Date().getFullYear();

    // Find alumnos activos sin pago en los últimos MESES_MORA meses
    const alumnos = await this.db.alumno.findMany({
      where: { deletedAt: null, estadoMatricula: 'ACTIVA' },
      select: {
        id: true, run: true, nombres: true, apellidoPaterno: true,
        curso: { select: { id: true, nombre: true } },
        apoderados: {
          where: { esTitular: true },
          include: { apoderado: { select: { email: true, telefono: true } } },
        },
        pagos: {
          where: { estado: 'PAGADO' },
          select: { mesCorresponde: true, monto: true },
          orderBy: { mesCorresponde: 'desc' },
        },
      },
    });

    const morosos: any[] = [];

    for (const alumno of alumnos) {
      const mesesConPago = new Set((alumno as any).pagos.map((p: any) => p.mesCorresponde).filter(Boolean));
      let mesesSinPago = 0;
      let montoAdeudado = 0;

      // Check last MESES_MORA months
      for (let i = 0; i < MESES_MORA; i++) {
        const mes = ((currentMes - 1 - i + 12) % 12) + 1;
        if (!mesesConPago.has(mes)) mesesSinPago++;
      }

      if (mesesSinPago >= MESES_MORA) {
        morosos.push({
          alumno: {
            id: alumno.id, run: (alumno as any).run, nombres: (alumno as any).nombres,
            apellidoPaterno: (alumno as any).apellidoPaterno, curso: (alumno as any).curso,
          },
          mesesMorosos: mesesSinPago,
          apoderadoEmail: (alumno as any).apoderados?.[0]?.apoderado?.email ?? null,
          apoderadoTelefono: (alumno as any).apoderados?.[0]?.apoderado?.telefono ?? null,
        });

        // Publish PAGO_MOROSO event
        await this.eventBus.publish({
          type: 'PAGO_MOROSO',
          timestamp: new Date(),
          userId: usuarioId,
          tenantId: this.tenantService.getTenantId() ?? 'default',
          correlationId: uuidv4(),
          payload: {
            alumnoId: alumno.id,
            nombreAlumno: `${(alumno as any).nombres} ${(alumno as any).apellidoPaterno}`,
            cursoNombre: (alumno as any).curso?.nombre ?? '',
            mesesMorosos: mesesSinPago,
            montoAdeudado,
            apoderadoEmail: (alumno as any).apoderados?.[0]?.apoderado?.email ?? null,
            apoderadoTelefono: (alumno as any).apoderados?.[0]?.apoderado?.telefono ?? null,
          },
        }).catch(() => undefined);
      }
    }

    return {
      data: {
        total: morosos.length,
        umbraMeses: MESES_MORA,
        morosos,
      },
    };
  }
}
