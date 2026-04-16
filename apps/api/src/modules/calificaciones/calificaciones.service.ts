import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import {
  CreateNotaDto,
  UpdateNotaDto,
  BulkCreateNotaDto,
  NotaQueryDto,
  CerrarPeriodoDto,
  DashboardNotasQueryDto,
} from './dto/calificaciones.dto';
import { v4 as uuidv4 } from 'uuid';
import * as xlsx from 'xlsx';

@Injectable()
export class CalificacionesService {
  private readonly logger = new Logger(CalificacionesService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() {
    return this.tenantService.getClient();
  }

  // ─── INGRESAR NOTA ──────────────────────────────────────────

  async create(dto: CreateNotaDto, usuarioId: string) {
    const [alumno, asignatura] = await Promise.all([
      this.db.alumno.findFirst({
        where: { id: dto.alumnoId, deletedAt: null, estadoMatricula: 'ACTIVA' },
        include: {
          curso: { select: { id: true, nombre: true } },
          apoderados: {
            where: { esTitular: true },
            include: { apoderado: { select: { email: true } } },
          },
        },
      }),
      this.db.asignatura.findUnique({ where: { id: dto.asignaturaId } }),
    ]);

    if (!alumno) throw new NotFoundException(`Alumno ${dto.alumnoId} no encontrado o no activo`);
    if (!asignatura) throw new NotFoundException(`Asignatura ${dto.asignaturaId} no encontrada`);

    const nota = await this.db.$transaction(async (tx: any) => {
      const created = await tx.nota.create({
        data: {
          alumnoId: dto.alumnoId,
          asignaturaId: dto.asignaturaId,
          tipo: dto.tipo,
          nombreEvaluacion: dto.nombreEvaluacion,
          ponderacion: dto.ponderacion,
          valor: dto.valor,
          fecha: new Date(dto.fecha),
          semestre: dto.semestre,
          anio: dto.anio,
          ingresadaPor: usuarioId,
          observacion: dto.observacion ?? null,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Nota',
          entidadId: created.id,
          datosDespues: {
            alumnoId: dto.alumnoId,
            asignaturaId: dto.asignaturaId,
            valor: dto.valor,
            tipo: dto.tipo,
          } as object,
        },
      });
      return created;
    });

    // Calc promedios para evento
    this.publishNotaIngresada(nota, alumno, asignatura, usuarioId).catch(() => undefined);
    // Check bajo mínimo async
    this.checkNotaBajoMinimo(alumno, asignatura, dto.semestre, dto.anio, usuarioId).catch(() => undefined);

    return { data: nota };
  }

  // ─── IMPORT MASIVO ──────────────────────────────────────────

  async bulkCreate(dto: BulkCreateNotaDto, usuarioId: string) {
    const results: Array<{ index: number; error?: string; notaId?: string }> = [];

    for (let i = 0; i < dto.notas.length; i++) {
      try {
        const res = await this.create(dto.notas[i], usuarioId);
        results.push({ index: i, notaId: (res.data as any).id });
      } catch (err: any) {
        results.push({ index: i, error: err.message });
      }
    }

    const exitosas = results.filter((r) => !r.error).length;
    return {
      data: {
        total: dto.notas.length,
        exitosas,
        conError: dto.notas.length - exitosas,
        resultados: results,
      },
    };
  }

  // ─── LISTAR NOTAS ───────────────────────────────────────────

  async findAll(query: NotaQueryDto) {
    const { alumnoId, asignaturaId, cursoId, semestre, anio, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (alumnoId) where['alumnoId'] = alumnoId;
    if (asignaturaId) where['asignaturaId'] = asignaturaId;
    if (semestre) where['semestre'] = semestre;
    if (anio) where['anio'] = anio;
    if (cursoId) {
      where['alumno'] = { cursoId, deletedAt: null };
    }

    const [total, notas] = await Promise.all([
      this.db.nota.count({ where }),
      this.db.nota.findMany({
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
          asignatura: { select: { id: true, nombre: true, codigo: true } },
        },
        orderBy: [{ anio: 'desc' }, { semestre: 'desc' }, { fecha: 'desc' }],
      }),
    ]);

    return {
      data: notas,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── VER NOTA ───────────────────────────────────────────────

  async findOne(id: string) {
    const nota = await this.db.nota.findUnique({
      where: { id },
      include: {
        alumno: {
          select: {
            id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
            curso: { select: { id: true, nombre: true } },
          },
        },
        asignatura: { select: { id: true, nombre: true, codigo: true } },
      },
    });
    if (!nota) throw new NotFoundException(`Nota ${id} no encontrada`);
    return { data: nota };
  }

  // ─── ACTUALIZAR NOTA ────────────────────────────────────────

  async update(id: string, dto: UpdateNotaDto, usuarioId: string) {
    const nota = await this.db.nota.findUnique({ where: { id } });
    if (!nota) throw new NotFoundException(`Nota ${id} no encontrada`);
    if (nota.bloqueada) throw new BadRequestException('La nota está bloqueada y no puede modificarse');

    const updated = await this.db.$transaction(async (tx: any) => {
      const n = await tx.nota.update({
        where: { id },
        data: {
          ...(dto.tipo !== undefined ? { tipo: dto.tipo } : {}),
          ...(dto.nombreEvaluacion !== undefined ? { nombreEvaluacion: dto.nombreEvaluacion } : {}),
          ...(dto.ponderacion !== undefined ? { ponderacion: dto.ponderacion } : {}),
          ...(dto.valor !== undefined ? { valor: dto.valor } : {}),
          ...(dto.fecha !== undefined ? { fecha: new Date(dto.fecha) } : {}),
          ...(dto.observacion !== undefined ? { observacion: dto.observacion } : {}),
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Nota',
          entidadId: id,
          datosAntes: { valor: nota.valor } as object,
          datosDespues: dto as object,
        },
      });
      return n;
    });

    return { data: updated };
  }

  // ─── ELIMINAR NOTA ──────────────────────────────────────────

  async remove(id: string, usuarioId: string) {
    const nota = await this.db.nota.findUnique({ where: { id } });
    if (!nota) throw new NotFoundException(`Nota ${id} no encontrada`);
    if (nota.bloqueada) throw new BadRequestException('La nota está bloqueada y no puede eliminarse');

    await this.db.$transaction(async (tx: any) => {
      await tx.nota.delete({ where: { id } });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'DELETE',
          entidad: 'Nota',
          entidadId: id,
          datosAntes: { alumnoId: nota.alumnoId, valor: nota.valor } as object,
        },
      });
    });

    return { data: { message: 'Nota eliminada correctamente' } };
  }

  // ─── PROMEDIOS POR ALUMNO ───────────────────────────────────

  async getPromedios(alumnoId: string, semestre?: number, anio?: number) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: alumnoId, deletedAt: null },
      include: { curso: { select: { id: true, nombre: true } } },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const currentAnio = anio ?? new Date().getFullYear();
    const currentSemestre = semestre ?? (new Date().getMonth() < 6 ? 1 : 2);

    const notas = await this.db.nota.findMany({
      where: {
        alumnoId,
        semestre: currentSemestre,
        anio: currentAnio,
        tipo: 'SUMATIVA',
      },
      include: { asignatura: { select: { id: true, nombre: true } } },
    });

    // Agrupar por asignatura
    const byAsignatura = new Map<string, { nombre: string; notas: number[]; ponderaciones: number[] }>();
    for (const n of notas) {
      const key = n.asignaturaId;
      if (!byAsignatura.has(key)) {
        byAsignatura.set(key, { nombre: (n.asignatura as any).nombre, notas: [], ponderaciones: [] });
      }
      byAsignatura.get(key)!.notas.push(Number(n.valor));
      byAsignatura.get(key)!.ponderaciones.push(Number(n.ponderacion));
    }

    const promediosPorAsignatura = Array.from(byAsignatura.entries()).map(([asignaturaId, data]) => {
      const totalPonderacion = data.ponderaciones.reduce((a, b) => a + b, 0);
      const promedio = totalPonderacion > 0
        ? data.notas.reduce((sum, n, i) => sum + n * (data.ponderaciones[i] / totalPonderacion), 0)
        : 0;
      return {
        asignaturaId,
        asignaturaNombre: data.nombre,
        promedio: Math.round(promedio * 10) / 10,
        cantidadNotas: data.notas.length,
      };
    });

    const promedioGeneral = promediosPorAsignatura.length > 0
      ? promediosPorAsignatura.reduce((sum, a) => sum + a.promedio, 0) / promediosPorAsignatura.length
      : 0;

    return {
      data: {
        alumno: { id: alumno.id, run: alumno.run, nombres: alumno.nombres, apellidoPaterno: alumno.apellidoPaterno, curso: alumno.curso },
        periodo: { semestre: currentSemestre, anio: currentAnio },
        promedioGeneral: Math.round(promedioGeneral * 10) / 10,
        asignaturas: promediosPorAsignatura,
      },
    };
  }

  // ─── DASHBOARD KPIs ─────────────────────────────────────────

  async getDashboard(query: DashboardNotasQueryDto) {
    const anio = query.anio ?? new Date().getFullYear();
    const semestre = query.semestre ?? (new Date().getMonth() < 6 ? 1 : 2);

    const whereBase: Record<string, unknown> = { anio, semestre, tipo: 'SUMATIVA' };
    if (query.cursoId) {
      whereBase['alumno'] = { cursoId: query.cursoId, deletedAt: null };
    }

    const [totalNotas, promData] = await Promise.all([
      this.db.nota.count({ where: whereBase }),
      this.db.nota.findMany({
        where: whereBase,
        select: { valor: true, alumnoId: true, asignaturaId: true },
      }),
    ]);

    const promGeneral = promData.length > 0
      ? promData.reduce((s: number, n: any) => s + Number(n.valor), 0) / promData.length
      : 0;

    // Notas bajo 4.0
    const bajosAprobacion = promData.filter((n: any) => Number(n.valor) < 4.0).length;

    return {
      data: {
        periodo: { semestre, anio },
        totalNotas,
        promedioGeneral: Math.round(promGeneral * 10) / 10,
        porcentajeBajoAprobacion: totalNotas > 0 ? Math.round((bajosAprobacion / totalNotas) * 100 * 10) / 10 : 0,
      },
    };
  }

  // ─── CERRAR PERIODO ─────────────────────────────────────────

  async cerrarPeriodo(dto: CerrarPeriodoDto, usuarioId: string) {
    const where: Record<string, unknown> = {
      semestre: dto.semestre,
      anio: dto.anio,
      bloqueada: false,
    };
    if (dto.cursoId) where['alumno'] = { cursoId: dto.cursoId };
    if (dto.asignaturaId) where['asignaturaId'] = dto.asignaturaId;

    await this.db.$transaction(async (tx: any) => {
      await tx.nota.updateMany({
        where,
        data: { bloqueada: true },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Nota',
          entidadId: `periodo-${dto.anio}-${dto.semestre}`,
          datosDespues: { accion: 'CERRAR_PERIODO', ...dto } as object,
        },
      });
    });

    // Calcular stats del periodo
    const notasPeriodo = await this.db.nota.findMany({
      where: {
        semestre: dto.semestre,
        anio: dto.anio,
        tipo: 'SUMATIVA',
        ...(dto.cursoId ? { alumno: { cursoId: dto.cursoId } } : {}),
      },
      select: { valor: true, alumnoId: true },
    });

    const alumnosSet = new Set(notasPeriodo.map((n: any) => n.alumnoId));
    const totalAlumnos = alumnosSet.size;
    const promGeneral = notasPeriodo.length > 0
      ? notasPeriodo.reduce((s: number, n: any) => s + Number(n.valor), 0) / notasPeriodo.length
      : 0;

    // Contar aprobados/reprobados por alumno (promedio asignaturas >= 4.0)
    const promediosPorAlumno = new Map<string, number[]>();
    for (const n of notasPeriodo) {
      if (!promediosPorAlumno.has(n.alumnoId)) promediosPorAlumno.set(n.alumnoId, []);
      promediosPorAlumno.get(n.alumnoId)!.push(Number(n.valor));
    }
    let aprobados = 0;
    let reprobados = 0;
    for (const [, vals] of promediosPorAlumno) {
      const prom = vals.reduce((a, b) => a + b, 0) / vals.length;
      if (prom >= 4.0) aprobados++;
      else reprobados++;
    }

    await this.eventBus.publish({
      type: 'PERIODO_CERRADO',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        anio: dto.anio,
        semestre: dto.semestre,
        totalAlumnos,
        totalAprobados: aprobados,
        totalReprobados: reprobados,
        promedioGeneral: Math.round(promGeneral * 10) / 10,
      },
    });

    this.logger.log(`Periodo ${dto.semestre}/${dto.anio} cerrado por ${usuarioId}`);

    return {
      data: {
        message: `Periodo ${dto.semestre}/${dto.anio} cerrado correctamente`,
        totalAlumnos,
        totalAprobados: aprobados,
        totalReprobados: reprobados,
        promedioGeneral: Math.round(promGeneral * 10) / 10,
      },
    };
  }

  // ─── EXPORT ACTAS SIGE ───────────────────────────────────────

  async exportActas(semestre: number, anio: number, cursoId?: string) {
    const where: Record<string, unknown> = { semestre, anio, tipo: 'SUMATIVA' };
    if (cursoId) where['alumno'] = { cursoId, deletedAt: null };

    const notas = await this.db.nota.findMany({
      where,
      include: {
        alumno: {
          select: {
            run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
            curso: { select: { nombre: true } },
          },
        },
        asignatura: { select: { nombre: true, codigo: true } },
      },
      orderBy: [{ alumno: { apellidoPaterno: 'asc' } }, { asignatura: { nombre: 'asc' } }],
    });

    const rows = notas.map((n: any) => ({
      RUN: n.alumno.run,
      Apellido_Paterno: n.alumno.apellidoPaterno,
      Apellido_Materno: n.alumno.apellidoMaterno,
      Nombres: n.alumno.nombres,
      Curso: n.alumno.curso?.nombre ?? '',
      Asignatura: n.asignatura.nombre,
      Codigo_Asignatura: n.asignatura.codigo ?? '',
      Tipo: n.tipo,
      Nombre_Evaluacion: n.nombreEvaluacion,
      Ponderacion: Number(n.ponderacion),
      Nota: Number(n.valor),
      Semestre: n.semestre,
      Anio: n.anio,
      Fecha: n.fecha.toISOString().split('T')[0],
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Actas');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return buffer as Buffer;
  }

  // ─── PRIVATE: Publish NOTA_INGRESADA ─────────────────────────

  private async publishNotaIngresada(
    nota: any,
    alumno: any,
    asignatura: any,
    usuarioId: string,
  ) {
    // Promedios actualizados
    const notasAsignatura = await this.db.nota.findMany({
      where: { alumnoId: alumno.id, asignaturaId: asignatura.id, anio: nota.anio, semestre: nota.semestre, tipo: 'SUMATIVA' },
      select: { valor: true, ponderacion: true },
    });
    const totalPond = notasAsignatura.reduce((s: number, n: any) => s + Number(n.ponderacion), 0);
    const promAsig = totalPond > 0
      ? notasAsignatura.reduce((s: number, n: any) => s + Number(n.valor) * (Number(n.ponderacion) / totalPond), 0)
      : Number(nota.valor);

    const todasNotas = await this.db.nota.findMany({
      where: { alumnoId: alumno.id, anio: nota.anio, semestre: nota.semestre, tipo: 'SUMATIVA' },
      select: { valor: true },
    });
    const promGeneral = todasNotas.length > 0
      ? todasNotas.reduce((s: number, n: any) => s + Number(n.valor), 0) / todasNotas.length
      : Number(nota.valor);

    await this.eventBus.publish({
      type: 'NOTA_INGRESADA',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        notaId: nota.id,
        alumnoId: alumno.id,
        nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
        asignaturaId: asignatura.id,
        asignaturaNombre: asignatura.nombre,
        cursoId: alumno.cursoId ?? alumno.curso?.id ?? '',
        valor: Number(nota.valor),
        tipo: nota.tipo,
        promedioAsignaturaActualizado: Math.round(promAsig * 10) / 10,
        promedioGeneralActualizado: Math.round(promGeneral * 10) / 10,
      },
    });
  }

  // ─── PRIVATE: Check NOTA_BAJO_MINIMO ─────────────────────────

  private async checkNotaBajoMinimo(
    alumno: any,
    asignatura: any,
    semestre: number,
    anio: number,
    usuarioId: string,
  ) {
    const establecimiento = await this.db.establecimiento.findFirst();
    const notaAprobacion = Number(establecimiento?.notaAprobacion ?? 4.0);

    const notas = await this.db.nota.findMany({
      where: { alumnoId: alumno.id, asignaturaId: asignatura.id, semestre, anio, tipo: 'SUMATIVA' },
      select: { valor: true, ponderacion: true },
    });

    if (notas.length === 0) return;

    const totalPond = notas.reduce((s: number, n: any) => s + Number(n.ponderacion), 0);
    const promedio = totalPond > 0
      ? notas.reduce((s: number, n: any) => s + Number(n.valor) * (Number(n.ponderacion) / totalPond), 0)
      : notas.reduce((s: number, n: any) => s + Number(n.valor), 0) / notas.length;

    if (promedio < notaAprobacion) {
      const apoderado = alumno.apoderados?.[0]?.apoderado;
      await this.eventBus.publish({
        type: 'NOTA_BAJO_MINIMO',
        timestamp: new Date(),
        userId: usuarioId,
        tenantId: this.tenantService.getTenantId() ?? 'default',
        correlationId: uuidv4(),
        payload: {
          alumnoId: alumno.id,
          nombreAlumno: `${alumno.nombres} ${alumno.apellidoPaterno}`,
          asignaturaId: asignatura.id,
          asignaturaNombre: asignatura.nombre,
          cursoId: alumno.cursoId ?? alumno.curso?.id ?? '',
          cursoNombre: alumno.curso?.nombre ?? '',
          promedioAsignatura: Math.round(promedio * 10) / 10,
          notaMinima: notaAprobacion,
          apoderadoEmail: apoderado?.email ?? null,
        },
      });
      this.logger.warn(
        `NOTA_BAJO_MINIMO: ${alumno.run} promedio ${Math.round(promedio * 10) / 10} en ${asignatura.nombre}`,
      );
    }
  }
}
