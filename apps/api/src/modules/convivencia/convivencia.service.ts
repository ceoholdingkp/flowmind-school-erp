import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateAnotacionDto,
  UpdateAnotacionDto,
  ActivarProtocoloDto,
  AddEntrevistaDto,
  AddCompromisoDto,
  UpdateCompromisoDto,
  AnotacionQueryDto,
} from './dto/convivencia.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConvivenciaService {
  private readonly logger = new Logger(ConvivenciaService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() {
    return this.tenantService.getClient();
  }

  // ─── CREAR ANOTACIÓN ─────────────────────────────────────────

  async create(dto: CreateAnotacionDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: dto.alumnoId, deletedAt: null },
      include: {
        curso: { select: { id: true, nombre: true } },
      },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${dto.alumnoId} no encontrado`);

    const anotacion = await this.db.$transaction(async (tx: any) => {
      const created = await tx.anotacion.create({
        data: {
          alumnoId: dto.alumnoId,
          tipo: dto.tipo,
          gravedad: dto.gravedad ?? null,
          categoria: dto.categoria,
          descripcion: dto.descripcion,
          fecha: new Date(dto.fecha),
          registradaPor: usuarioId,
          protocoloActivo: dto.protocoloActivo ?? null,
          visiblePortal: dto.visiblePortal ?? true,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Anotacion',
          entidadId: created.id,
          datosDespues: {
            alumnoId: dto.alumnoId,
            tipo: dto.tipo,
            gravedad: dto.gravedad,
            categoria: dto.categoria,
          } as object,
        },
      });
      return created;
    });

    // Publish ANOTACION_CREADA
    await this.eventBus.publish({
      type: 'ANOTACION_CREADA',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        anotacionId: anotacion.id,
        alumnoId: alumno.id,
        nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
        cursoId: alumno.cursoId ?? '',
        cursoNombre: (alumno as any).curso?.nombre ?? '',
        tipo: dto.tipo as 'POSITIVA' | 'NEGATIVA',
        gravedad: (dto.gravedad ?? null) as 'LEVE' | 'GRAVE' | 'GRAVISIMA' | null,
        categoria: dto.categoria,
        visiblePortal: dto.visiblePortal ?? true,
      },
    });

    // Si tiene protocolo activo, publicar PROTOCOLO_ACTIVADO
    if (dto.protocoloActivo) {
      await this.eventBus.publish({
        type: 'PROTOCOLO_ACTIVADO',
        timestamp: new Date(),
        userId: usuarioId,
        tenantId: this.tenantService.getTenantId() ?? 'default',
        correlationId: uuidv4(),
        payload: {
          anotacionId: anotacion.id,
          alumnoId: alumno.id,
          nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
          tipoProtocolo: dto.protocoloActivo,
        },
      });
      this.logger.warn(
        `PROTOCOLO_ACTIVADO: ${dto.protocoloActivo} para alumno ${alumno.run}`,
      );
    }

    return { data: anotacion };
  }

  // ─── LISTAR ANOTACIONES ──────────────────────────────────────

  async findAll(query: AnotacionQueryDto) {
    const { alumnoId, tipo, cursoId, fechaDesde, fechaHasta, gravedad, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (alumnoId) where['alumnoId'] = alumnoId;
    if (tipo) where['tipo'] = tipo;
    if (gravedad) where['gravedad'] = gravedad;
    if (fechaDesde || fechaHasta) {
      where['fecha'] = {
        ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
        ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
      };
    }
    if (cursoId) {
      where['alumno'] = { cursoId, deletedAt: null };
    }

    const [total, anotaciones] = await Promise.all([
      this.db.anotacion.count({ where }),
      this.db.anotacion.findMany({
        where,
        skip,
        take: limit,
        include: {
          alumno: {
            select: {
              id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
              curso: { select: { id: true, nombre: true } },
            },
          },
        },
        orderBy: { fecha: 'desc' },
      }),
    ]);

    return {
      data: anotaciones,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── VER ANOTACIÓN ───────────────────────────────────────────

  async findOne(id: string) {
    const anotacion = await this.db.anotacion.findUnique({
      where: { id },
      include: {
        alumno: {
          select: {
            id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
            curso: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);
    return { data: anotacion };
  }

  // ─── ACTUALIZAR ANOTACIÓN ────────────────────────────────────

  async update(id: string, dto: UpdateAnotacionDto, usuarioId: string) {
    const anotacion = await this.db.anotacion.findUnique({ where: { id } });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const a = await tx.anotacion.update({
        where: { id },
        data: {
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.gravedad !== undefined ? { gravedad: dto.gravedad } : {}),
          ...(dto.categoria !== undefined ? { categoria: dto.categoria } : {}),
          ...(dto.descripcion !== undefined ? { descripcion: dto.descripcion } : {}),
          ...(dto.fecha !== undefined ? { fecha: new Date(dto.fecha) } : {}),
          ...(dto.visiblePortal !== undefined ? { visiblePortal: dto.visiblePortal } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Anotacion',
          entidadId: id,
          datosAntes: { tipo: anotacion.tipo, gravedad: anotacion.gravedad } as object,
          datosDespues: dto as object,
        },
      });
      return a;
    });

    return { data: updated };
  }

  // ─── ACTIVAR PROTOCOLO ───────────────────────────────────────

  async activarProtocolo(id: string, dto: ActivarProtocoloDto, usuarioId: string) {
    const anotacion = await this.db.anotacion.findUnique({
      where: { id },
      include: {
        alumno: { select: { id: true, run: true, nombres: true, apellidoPaterno: true } },
      },
    });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);

    await this.db.$transaction(async (tx: any) => {
      await tx.anotacion.update({
        where: { id },
        data: { protocoloActivo: dto.tipoProtocolo },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Anotacion',
          entidadId: id,
          datosDespues: { accion: 'ACTIVAR_PROTOCOLO', tipoProtocolo: dto.tipoProtocolo } as object,
        },
      });
    });

    const alumno = (anotacion as any).alumno;
    await this.eventBus.publish({
      type: 'PROTOCOLO_ACTIVADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        anotacionId: id,
        alumnoId: alumno.id,
        nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
        tipoProtocolo: dto.tipoProtocolo,
      },
    });
    this.logger.warn(`PROTOCOLO_ACTIVADO: ${dto.tipoProtocolo} para alumno ${alumno.run}`);

    return { data: { message: `Protocolo '${dto.tipoProtocolo}' activado` } };
  }

  // ─── AGREGAR ENTREVISTA ──────────────────────────────────────

  async addEntrevista(id: string, dto: AddEntrevistaDto, usuarioId: string) {
    const anotacion = await this.db.anotacion.findUnique({ where: { id } });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);

    const entrevistas: any[] = Array.isArray(anotacion.entrevistas) ? (anotacion.entrevistas as any[]) : [];
    entrevistas.push({
      fecha: dto.fecha,
      apoderado: dto.apoderado,
      acuerdos: dto.acuerdos,
      firma: dto.firma ?? null,
      registradaPor: usuarioId,
      createdAt: new Date().toISOString(),
    });

    await this.db.anotacion.update({
      where: { id },
      data: { entrevistas },
    });

    return { data: { message: 'Entrevista registrada', entrevistas } };
  }

  // ─── AGREGAR COMPROMISO ──────────────────────────────────────

  async addCompromiso(id: string, dto: AddCompromisoDto, usuarioId: string) {
    const anotacion = await this.db.anotacion.findUnique({ where: { id } });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);

    const compromisos: any[] = Array.isArray(anotacion.compromisos) ? (anotacion.compromisos as any[]) : [];
    compromisos.push({
      descripcion: dto.descripcion,
      fechaLimite: dto.fechaLimite,
      estado: dto.estado ?? 'PENDIENTE',
      seguimiento: dto.seguimiento ?? null,
      createdAt: new Date().toISOString(),
    });

    await this.db.anotacion.update({
      where: { id },
      data: { compromisos },
    });

    return { data: { message: 'Compromiso registrado', compromisos } };
  }

  // ─── ACTUALIZAR ESTADO COMPROMISO ───────────────────────────

  async updateCompromiso(id: string, dto: UpdateCompromisoDto, usuarioId: string) {
    const anotacion = await this.db.anotacion.findUnique({ where: { id } });
    if (!anotacion) throw new NotFoundException(`Anotación ${id} no encontrada`);

    const compromisos: any[] = Array.isArray(anotacion.compromisos) ? (anotacion.compromisos as any[]) : [];
    if (dto.indice < 0 || dto.indice >= compromisos.length) {
      throw new BadRequestException(`Índice de compromiso inválido: ${dto.indice}`);
    }

    compromisos[dto.indice] = {
      ...compromisos[dto.indice],
      estado: dto.estado,
      ...(dto.seguimiento !== undefined ? { seguimiento: dto.seguimiento } : {}),
      updatedAt: new Date().toISOString(),
    };

    await this.db.anotacion.update({
      where: { id },
      data: { compromisos },
    });

    return { data: { message: 'Compromiso actualizado', compromisos } };
  }

  // ─── RESUMEN CONVIVENCIA ALUMNO ──────────────────────────────

  async getResumenAlumno(alumnoId: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: alumnoId, deletedAt: null },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const [positivas, negativas, total] = await Promise.all([
      this.db.anotacion.count({ where: { alumnoId, tipo: 'POSITIVA' } }),
      this.db.anotacion.count({ where: { alumnoId, tipo: 'NEGATIVA' } }),
      this.db.anotacion.count({ where: { alumnoId } }),
    ]);

    const ultimasAnotaciones = await this.db.anotacion.findMany({
      where: { alumnoId },
      orderBy: { fecha: 'desc' },
      take: 5,
    });

    const tieneProtocolo = await this.db.anotacion.findFirst({
      where: { alumnoId, protocoloActivo: { not: null } },
      orderBy: { fecha: 'desc' },
    });

    return {
      data: {
        resumen: { total, positivas, negativas },
        protocoloActivo: tieneProtocolo ? (tieneProtocolo as any).protocoloActivo : null,
        ultimasAnotaciones,
      },
    };
  }
}
