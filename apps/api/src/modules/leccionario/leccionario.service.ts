import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateLeccionarioDto,
  UpdateLeccionarioDto,
  RevisarLeccionarioDto,
  LeccionarioQueryDto,
  ResumenDocenteQueryDto,
} from './dto/leccionario.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LeccionarioService {
  private readonly logger = new Logger(LeccionarioService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() {
    return this.tenantService.getClient();
  }

  // ─── CREAR ENTRADA ───────────────────────────────────────────

  async create(dto: CreateLeccionarioDto, usuarioId: string) {
    // Validar que docente existe
    const docente = await this.db.funcionario.findFirst({
      where: { id: dto.docenteId, estado: 'ACTIVO', deletedAt: null },
    });
    if (!docente) throw new NotFoundException(`Docente ${dto.docenteId} no encontrado o inactivo`);

    const curso = await this.db.curso.findUnique({ where: { id: dto.cursoId } });
    if (!curso) throw new NotFoundException(`Curso ${dto.cursoId} no encontrado`);

    const asignatura = await this.db.asignatura.findUnique({ where: { id: dto.asignaturaId } });
    if (!asignatura) throw new NotFoundException(`Asignatura ${dto.asignaturaId} no encontrada`);

    const leccionario = await this.db.$transaction(async (tx: any) => {
      const created = await tx.leccionario.create({
        data: {
          cursoId: dto.cursoId,
          asignaturaId: dto.asignaturaId,
          docenteId: dto.docenteId,
          fecha: new Date(dto.fecha),
          bloqueHorario: dto.bloqueHorario,
          horaInicio: dto.horaInicio ?? null,
          horaFin: dto.horaFin ?? null,
          objetivo: dto.objetivo ?? null,
          contenido: dto.contenido,
          actividades: dto.actividades ?? null,
          recursos: dto.recursos ?? null,
          observaciones: dto.observaciones ?? null,
          planificacionId: dto.planificacionId ?? null,
          estado: 'PENDIENTE',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Leccionario',
          entidadId: created.id,
          datosDespues: {
            cursoId: dto.cursoId,
            asignaturaId: dto.asignaturaId,
            docenteId: dto.docenteId,
            fecha: dto.fecha,
          } as object,
        },
      });
      return created;
    });

    return { data: leccionario };
  }

  // ─── LISTAR ──────────────────────────────────────────────────

  async findAll(query: LeccionarioQueryDto) {
    const { cursoId, docenteId, asignaturaId, fechaDesde, fechaHasta, estado, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (cursoId) where['cursoId'] = cursoId;
    if (docenteId) where['docenteId'] = docenteId;
    if (asignaturaId) where['asignaturaId'] = asignaturaId;
    if (estado) where['estado'] = estado;
    if (fechaDesde || fechaHasta) {
      where['fecha'] = {
        ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
        ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
      };
    }

    const [total, leccionarios] = await Promise.all([
      this.db.leccionario.count({ where }),
      this.db.leccionario.findMany({
        where,
        skip,
        take: limit,
        include: {
          docente: { select: { id: true, nombres: true, apellidos: true } },
        },
        orderBy: [{ fecha: 'desc' }, { bloqueHorario: 'asc' }],
      }),
    ]);

    return {
      data: leccionarios,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── VER UNO ─────────────────────────────────────────────────

  async findOne(id: string) {
    const lec = await this.db.leccionario.findUnique({
      where: { id },
      include: {
        docente: { select: { id: true, nombres: true, apellidos: true } },
      },
    });
    if (!lec) throw new NotFoundException(`Leccionario ${id} no encontrado`);
    return { data: lec };
  }

  // ─── ACTUALIZAR ──────────────────────────────────────────────

  async update(id: string, dto: UpdateLeccionarioDto, usuarioId: string) {
    const lec = await this.db.leccionario.findUnique({ where: { id } });
    if (!lec) throw new NotFoundException(`Leccionario ${id} no encontrado`);
    if (lec.estado === 'FIRMADO') {
      throw new BadRequestException('No se puede modificar un leccionario ya firmado');
    }

    const updated = await this.db.$transaction(async (tx: any) => {
      const l = await tx.leccionario.update({
        where: { id },
        data: {
          ...(dto.objetivo !== undefined ? { objetivo: dto.objetivo } : {}),
          ...(dto.contenido !== undefined ? { contenido: dto.contenido } : {}),
          ...(dto.actividades !== undefined ? { actividades: dto.actividades } : {}),
          ...(dto.recursos !== undefined ? { recursos: dto.recursos } : {}),
          ...(dto.observaciones !== undefined ? { observaciones: dto.observaciones } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Leccionario',
          entidadId: id,
          datosDespues: dto as object,
        },
      });
      return l;
    });

    return { data: updated };
  }

  // ─── FIRMAR ──────────────────────────────────────────────────

  async firmar(id: string, usuarioId: string) {
    const lec = await this.db.leccionario.findUnique({
      where: { id },
      include: { docente: { select: { id: true, nombres: true, apellidos: true } } },
    });
    if (!lec) throw new NotFoundException(`Leccionario ${id} no encontrado`);
    if (lec.estado === 'FIRMADO') {
      throw new BadRequestException('El leccionario ya está firmado');
    }

    const now = new Date();
    const updated = await this.db.$transaction(async (tx: any) => {
      const l = await tx.leccionario.update({
        where: { id },
        data: { estado: 'FIRMADO', firmaDigital: now },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Leccionario',
          entidadId: id,
          datosDespues: { accion: 'FIRMAR', firmaDigital: now } as object,
        },
      });
      return l;
    });

    // Obtener datos para el evento
    const curso = await this.db.curso.findUnique({ where: { id: lec.cursoId } });
    const asignatura = await this.db.asignatura.findUnique({ where: { id: lec.asignaturaId } });
    const docente = (lec as any).docente;

    await this.eventBus.publish({
      type: 'LECCIONARIO_FIRMADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        leccionarioId: id,
        docenteId: lec.docenteId,
        nombreDocente: `${docente.nombres} ${docente.apellidos}`,
        cursoId: lec.cursoId,
        cursoNombre: (curso as any)?.nombre ?? '',
        asignaturaId: lec.asignaturaId,
        asignaturaNombre: (asignatura as any)?.nombre ?? '',
        fecha: lec.fecha.toISOString().split('T')[0],
      },
    });

    this.logger.log(`LECCIONARIO_FIRMADO: ${id} por docente ${lec.docenteId}`);

    return { data: updated };
  }

  // ─── REVISAR (UTP) ───────────────────────────────────────────

  async revisar(id: string, dto: RevisarLeccionarioDto, usuarioId: string) {
    const lec = await this.db.leccionario.findUnique({ where: { id } });
    if (!lec) throw new NotFoundException(`Leccionario ${id} no encontrado`);
    if (lec.estado !== 'FIRMADO') {
      throw new BadRequestException('Solo se pueden revisar leccionarios en estado FIRMADO');
    }

    const updated = await this.db.$transaction(async (tx: any) => {
      const l = await tx.leccionario.update({
        where: { id },
        data: {
          estado: 'REVISADO_UTP',
          ...(dto.observaciones !== undefined ? { observaciones: dto.observaciones } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Leccionario',
          entidadId: id,
          datosDespues: { accion: 'REVISAR_UTP', observaciones: dto.observaciones } as object,
        },
      });
      return l;
    });

    return { data: updated };
  }

  // ─── RESUMEN DOCENTE ─────────────────────────────────────────

  async getResumenDocente(docenteId: string, query: ResumenDocenteQueryDto) {
    const docente = await this.db.funcionario.findFirst({
      where: { id: docenteId, deletedAt: null },
      select: { id: true, nombres: true, apellidos: true },
    });
    if (!docente) throw new NotFoundException(`Docente ${docenteId} no encontrado`);

    const mes = query.mes ?? new Date().getMonth() + 1;
    const anio = query.anio ?? new Date().getFullYear();

    const fechaInicio = new Date(anio, mes - 1, 1);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999);

    const [total, firmados, pendientes, revisados] = await Promise.all([
      this.db.leccionario.count({ where: { docenteId, fecha: { gte: fechaInicio, lte: fechaFin } } }),
      this.db.leccionario.count({ where: { docenteId, fecha: { gte: fechaInicio, lte: fechaFin }, estado: 'FIRMADO' } }),
      this.db.leccionario.count({ where: { docenteId, fecha: { gte: fechaInicio, lte: fechaFin }, estado: 'PENDIENTE' } }),
      this.db.leccionario.count({ where: { docenteId, fecha: { gte: fechaInicio, lte: fechaFin }, estado: 'REVISADO_UTP' } }),
    ]);

    const ultimos = await this.db.leccionario.findMany({
      where: { docenteId, fecha: { gte: fechaInicio, lte: fechaFin } },
      orderBy: [{ fecha: 'desc' }, { bloqueHorario: 'asc' }],
      take: 10,
    });

    return {
      data: {
        docente,
        periodo: { mes, anio },
        resumen: { total, firmados, pendientes, revisados },
        porcentajeFirmados: total > 0 ? Math.round((firmados / total) * 100) : 0,
        ultimas: ultimos,
      },
    };
  }
}
