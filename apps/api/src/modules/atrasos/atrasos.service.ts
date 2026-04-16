import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import { CreateAtrasoDto, AtrasoQueryDto, ReporteAtrasoQueryDto } from './dto/atrasos.dto';
import { v4 as uuidv4 } from 'uuid';

// Horario estándar para cada bloque (hora de inicio)
const HORA_INICIO_BLOQUE: Record<number, { horas: number; minutos: number }> = {
  1: { horas: 8,  minutos: 0  },
  2: { horas: 8,  minutos: 45 },
  3: { horas: 9,  minutos: 35 },
  4: { horas: 10, minutos: 20 },
  5: { horas: 11, minutos: 15 },
  6: { horas: 12, minutos: 0  },
  7: { horas: 12, minutos: 45 },
  8: { horas: 13, minutos: 30 },
};

const UMBRAL_ATRASOS_MES = 5;

@Injectable()
export class AtrasosService {
  private readonly logger = new Logger(AtrasosService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── CALCULAR MINUTOS DE ATRASO ──────────────────────────────

  private calcularMinutosAtraso(horaLlegada: Date, bloqueHorario: number): number {
    const bloque = HORA_INICIO_BLOQUE[bloqueHorario] ?? HORA_INICIO_BLOQUE[1];
    const inicio = new Date(horaLlegada);
    inicio.setHours(bloque.horas, bloque.minutos, 0, 0);
    const diffMs = horaLlegada.getTime() - inicio.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  }

  // ─── REGISTRAR ATRASO ─────────────────────────────────────────

  async create(dto: CreateAtrasoDto, usuarioId: string) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: dto.alumnoId, deletedAt: null, estadoMatricula: 'ACTIVA' },
      include: {
        apoderados: {
          where: { esTitular: true },
          include: { apoderado: { select: { email: true, telefono: true } } },
        },
        curso: { select: { id: true, nombre: true } },
      },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${dto.alumnoId} no encontrado o no activo`);

    const horaLlegada = new Date(dto.horaLlegada);
    const minutosAtraso = this.calcularMinutosAtraso(horaLlegada, dto.bloqueHorario);

    const atraso = await this.db.$transaction(async (tx: any) => {
      const created = await tx.atraso.create({
        data: {
          alumnoId: dto.alumnoId,
          fecha: new Date(dto.fecha),
          horaLlegada,
          minutosAtraso,
          bloqueHorario: dto.bloqueHorario,
          tipo: dto.tipo,
          justificado: dto.justificado ?? false,
          justificacion: dto.justificacion ?? null,
          registradoPor: usuarioId,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Atraso',
          entidadId: created.id,
          datosDespues: { alumnoId: dto.alumnoId, fecha: dto.fecha, minutosAtraso } as object,
        },
      });
      return created;
    });

    // Check ATRASO_REITERADO
    await this.checkAtrasoReiterado(alumno, usuarioId);

    return { data: atraso };
  }

  // ─── CHECK REITERADO ──────────────────────────────────────────

  private async checkAtrasoReiterado(
    alumno: {
      id: string; run: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string;
      cursoId: string | null;
      curso: { id: string; nombre: string } | null;
      apoderados: Array<{ apoderado: { email: string | null; telefono: string } }>;
    },
    usuarioId: string,
  ) {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const inicioAnio = new Date(ahora.getFullYear(), 0, 1);

    const [atrasosMes, atrasosAnio] = await Promise.all([
      this.db.atraso.count({ where: { alumnoId: alumno.id, fecha: { gte: inicioMes } } }),
      this.db.atraso.count({ where: { alumnoId: alumno.id, fecha: { gte: inicioAnio } } }),
    ]);

    if (atrasosMes >= UMBRAL_ATRASOS_MES) {
      const apoderado = alumno.apoderados[0]?.apoderado;
      await this.eventBus.publish({
        type: 'ATRASO_REITERADO',
        timestamp: new Date(),
        userId: usuarioId,
        tenantId: this.tenantService.getTenantId() ?? 'default',
        correlationId: uuidv4(),
        payload: {
          alumnoId: alumno.id,
          run: alumno.run,
          nombreCompleto: `${alumno.nombres} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`,
          cursoId: alumno.cursoId ?? '',
          cursoNombre: alumno.curso?.nombre ?? '',
          totalAtrasosMes: atrasosMes,
          totalAtrasosAnio: atrasosAnio,
          apoderadoEmail: apoderado?.email ?? null,
          apoderadoTelefono: apoderado?.telefono ?? null,
        },
      });
      this.logger.warn(
        `ATRASO_REITERADO: ${alumno.run} acumula ${atrasosMes} atrasos este mes`,
      );
    }
  }

  // ─── LISTAR ATRASOS ───────────────────────────────────────────

  async findAll(query: AtrasoQueryDto) {
    const { alumnoId, cursoId, fechaDesde, fechaHasta, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (alumnoId) where['alumnoId'] = alumnoId;
    if (fechaDesde || fechaHasta) {
      where['fecha'] = {
        ...(fechaDesde ? { gte: new Date(fechaDesde) } : {}),
        ...(fechaHasta ? { lte: new Date(fechaHasta) } : {}),
      };
    }

    // Filter by cursoId via alumno relation
    if (cursoId) {
      where['alumno'] = { cursoId };
    }

    const [total, atrasos] = await Promise.all([
      this.db.atraso.count({ where }),
      this.db.atraso.findMany({
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
      data: atrasos,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── REPORTE: RANKING + CONTEO ────────────────────────────────

  async getReporte(query: ReporteAtrasoQueryDto) {
    const anio = query.anio ?? new Date().getFullYear();
    const mes = query.mes ?? new Date().getMonth() + 1;

    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0, 23, 59, 59, 999);
    const inicioAnio = new Date(anio, 0, 1);

    // Base where for alumno filter
    const alumnoFilter = query.cursoId ? { cursoId: query.cursoId, deletedAt: null } : { deletedAt: null };

    const alumnos = await this.db.alumno.findMany({
      where: { ...alumnoFilter, estadoMatricula: 'ACTIVA' },
      select: {
        id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
        curso: { select: { id: true, nombre: true } },
      },
    });

    const ranking = await Promise.all(
      alumnos.map(async (a: any) => {
        const [mes_count, anio_count] = await Promise.all([
          this.db.atraso.count({ where: { alumnoId: a.id, fecha: { gte: inicioMes, lte: finMes } } }),
          this.db.atraso.count({ where: { alumnoId: a.id, fecha: { gte: inicioAnio } } }),
        ]);
        return {
          alumno: a,
          atrasosMes: mes_count,
          atrasosAnio: anio_count,
          reiterado: mes_count >= UMBRAL_ATRASOS_MES,
        };
      }),
    );

    // Only return alumnos with at least 1 atraso
    const conAtrasos = ranking
      .filter((r) => r.atrasosMes > 0 || r.atrasosAnio > 0)
      .sort((a, b) => b.atrasosMes - a.atrasosMes);

    return {
      data: {
        periodo: { mes, anio },
        umbraleReiterado: UMBRAL_ATRASOS_MES,
        ranking: conAtrasos,
        totalConAtrasosMes: conAtrasos.filter((r) => r.atrasosMes > 0).length,
        totalReiterados: conAtrasos.filter((r) => r.reiterado).length,
      },
    };
  }
}
