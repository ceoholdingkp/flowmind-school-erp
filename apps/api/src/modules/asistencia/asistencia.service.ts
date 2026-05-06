import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import { StorageService } from '../../storage/storage.service';
import {
  BulkAsistenciaDto,
  UpdateAsistenciaDto,
  AsistenciaQueryDto,
} from './dto/asistencia.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AsistenciaService {
  private readonly logger = new Logger(AsistenciaService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
    private readonly storageService: StorageService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── REGISTRO MASIVO (BULK) ────────────────────────────────────

  async registrarBulk(dto: BulkAsistenciaDto, usuarioId: string) {
    const fecha = new Date(dto.fecha);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fecha > hoy) {
      throw new BadRequestException('No se puede registrar asistencia para fechas futuras');
    }

    // Verify curso exists
    const curso = await this.db.curso.findUnique({
      where: { id: dto.cursoId },
      select: { id: true, nombre: true, nivel: true },
    });
    if (!curso) throw new NotFoundException(`Curso ${dto.cursoId} no encontrado`);

    // Verify all alumnos are matriculados in this curso
    const alumnoIds = dto.registros.map((r) => r.alumnoId);
    const alumnos = await this.db.alumno.findMany({
      where: { id: { in: alumnoIds }, deletedAt: null, estadoMatricula: 'ACTIVA' },
      select: { id: true, run: true, nombres: true, apellidoPaterno: true },
    });
    if (alumnos.length !== alumnoIds.length) {
      throw new BadRequestException('Algunos alumnos no están matriculados activamente');
    }

    // Find existing records for this batch (use actual userId from JWT as registradoPor)
    const registradoPor = usuarioId;
    const fechaStart = new Date(fecha); fechaStart.setHours(0, 0, 0, 0);
    const fechaEnd = new Date(fecha); fechaEnd.setHours(23, 59, 59, 999);

    const existing = await this.db.asistencia.findMany({
      where: {
        alumnoId: { in: alumnoIds },
        fecha: { gte: fechaStart, lte: fechaEnd },
        tramoHorario: dto.tramoHorario ?? null,
      },
      select: { id: true, alumnoId: true },
    });
    const existingMap = new Map((existing as any[]).map((e) => [e.alumnoId, e.id]));

    // Register all in a single transaction (upsert: update if exists, create if not)
    const registros = await this.db.$transaction(async (tx: any) => {
      const created = await Promise.all(
        dto.registros.map((r) => {
          const existingId = existingMap.get(r.alumnoId);
          if (existingId) {
            return tx.asistencia.update({
              where: { id: existingId },
              data: {
                estado: r.estado,
                justificacion: r.justificacion ?? null,
                horaLlegada: r.horaLlegada ? new Date(r.horaLlegada) : null,
                registradoPor,
              },
            });
          }
          return tx.asistencia.create({
            data: {
              alumnoId: r.alumnoId,
              cursoId: dto.cursoId,
              fecha: fechaStart,
              tramoHorario: dto.tramoHorario ?? null,
              estado: r.estado,
              justificacion: r.justificacion ?? null,
              horaLlegada: r.horaLlegada ? new Date(r.horaLlegada) : null,
              registradoPor,
            },
          });
        }),
      );

      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Asistencia',
          entidadId: dto.cursoId,
          datosDespues: {
            cursoId: dto.cursoId,
            fecha: dto.fecha,
            tramo: dto.tramoHorario,
            totalRegistros: created.length,
          } as object,
        },
      });

      return created;
    });

    // Calculate stats
    const total = registros.length;
    const presentes = registros.filter((r: any) => r.estado === 'PRESENTE').length;
    const ausentes = registros.filter((r: any) => r.estado === 'AUSENTE').length;
    const atrasos = registros.filter((r: any) => r.estado === 'ATRASO').length;
    const justificados = registros.filter((r: any) => r.estado === 'JUSTIFICADO').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

    // Publish ASISTENCIA_REGISTRADA event
    await this.eventBus.publish({
      type: 'ASISTENCIA_REGISTRADA',
      timestamp: new Date(),
      userId: usuarioId,
      tenantId: this.tenantService.getTenantId() ?? 'default',
      correlationId: uuidv4(),
      payload: {
        cursoId: dto.cursoId,
        cursoNombre: curso.nombre,
        fecha: dto.fecha,
        tramoHorario: dto.tramoHorario ?? null,
        totalAlumnos: total,
        totalPresentes: presentes,
        totalAusentes: ausentes,
        totalAtrasos: atrasos,
        totalJustificados: justificados,
        porcentajeAsistencia: porcentaje,
      },
    });

    this.logger.log(
      `ASISTENCIA_REGISTRADA: Curso ${curso.nombre} | ${presentes}/${total} presentes (${porcentaje}%)`,
    );

    // Check umbral for each ausente/atraso (async, no await to not block response)
    this.checkUmbrales(alumnoIds, usuarioId).catch((err) =>
      this.logger.warn(`Error checking umbrales: ${err}`),
    );

    return {
      data: {
        registrados: total,
        presentes,
        ausentes,
        atrasos,
        justificados,
        porcentajeAsistencia: porcentaje,
        cursoNombre: curso.nombre,
      },
    };
  }

  // ─── CHECK UMBRAL ASISTENCIA ──────────────────────────────────

  private async checkUmbrales(alumnoIds: string[], usuarioId: string) {
    // Get establecimiento config for umbral
    const estab = await this.db.establecimiento.findFirst({
      select: { asistenciaMinima: true },
    });
    const umbralMinimo = Number(estab?.asistenciaMinima ?? 85);
    const anioActual = new Date().getFullYear();

    for (const alumnoId of alumnoIds) {
      const alumno = await this.db.alumno.findFirst({
        where: { id: alumnoId, deletedAt: null },
        include: {
          apoderados: {
            where: { esTitular: true },
            include: { apoderado: { select: { email: true, telefono: true } } },
          },
          curso: { select: { id: true, nombre: true } },
        },
      });
      if (!alumno) continue;

      // Count total class days and presences this year
      const [totalDias, diasPresente] = await Promise.all([
        this.db.asistencia.count({
          where: {
            alumnoId,
            fecha: { gte: new Date(`${anioActual}-01-01`) },
            tramoHorario: null, // only day-level records
          },
        }),
        this.db.asistencia.count({
          where: {
            alumnoId,
            fecha: { gte: new Date(`${anioActual}-01-01`) },
            tramoHorario: null,
            estado: { in: ['PRESENTE', 'ATRASO'] },
          },
        }),
      ]);

      if (totalDias < 5) continue; // Need at least 5 days to evaluate

      const porcentaje = Math.round((diasPresente / totalDias) * 100);
      if (porcentaje < umbralMinimo) {
        const apoderado = alumno.apoderados[0]?.apoderado;
        await this.eventBus.publish({
          type: 'ASISTENCIA_BAJO_UMBRAL',
          timestamp: new Date(),
          userId: usuarioId,
          tenantId: this.tenantService.getTenantId() ?? 'default',
          correlationId: uuidv4(),
          payload: {
            alumnoId,
            run: alumno.run,
            nombreCompleto: `${alumno.nombres} ${alumno.apellidoPaterno} ${alumno.apellidoMaterno}`,
            cursoId: alumno.cursoId ?? '',
            cursoNombre: alumno.curso?.nombre ?? '',
            porcentajeAcumulado: porcentaje,
            umbralMinimo,
            apoderadoEmail: apoderado?.email ?? null,
            apoderadoTelefono: apoderado?.telefono ?? null,
          },
        });
        this.logger.warn(
          `ASISTENCIA_BAJO_UMBRAL: ${alumno.run} tiene ${porcentaje}% (mínimo ${umbralMinimo}%)`,
        );
      }
    }
  }

  // ─── ASISTENCIA POR CURSO (HOY) ────────────────────────────────

  async getAsistenciaCurso(cursoId: string, fecha?: string) {
    const curso = await this.db.curso.findUnique({ where: { id: cursoId } });
    if (!curso) throw new NotFoundException(`Curso ${cursoId} no encontrado`);

    const fechaConsulta = fecha ? new Date(fecha) : new Date();
    fechaConsulta.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaConsulta);
    fechaFin.setHours(23, 59, 59, 999);

    const registros = await this.db.asistencia.findMany({
      where: {
        cursoId,
        fecha: { gte: fechaConsulta, lte: fechaFin },
      },
      include: {
        alumno: {
          select: { id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
        },
      },
      orderBy: [{ tramoHorario: 'asc' }, { alumno: { apellidoPaterno: 'asc' } }],
    });

    const total = registros.length;
    const presentes = registros.filter((r: any) => r.estado === 'PRESENTE').length;
    const porcentaje = total > 0 ? Math.round((presentes / total) * 100) : 0;

    return {
      data: {
        cursoNombre: curso.nombre,
        fecha: fechaConsulta.toISOString().split('T')[0],
        porcentajeAsistencia: porcentaje,
        totalAlumnos: total,
        presentes,
        ausentes: registros.filter((r: any) => r.estado === 'AUSENTE').length,
        atrasos: registros.filter((r: any) => r.estado === 'ATRASO').length,
        justificados: registros.filter((r: any) => r.estado === 'JUSTIFICADO').length,
        registros,
      },
    };
  }

  // ─── HISTORIAL ALUMNO CON % ────────────────────────────────────

  async getHistorialAlumno(alumnoId: string, query: AsistenciaQueryDto) {
    const alumno = await this.db.alumno.findFirst({
      where: { id: alumnoId, deletedAt: null },
      select: { id: true, run: true, nombres: true, apellidoPaterno: true },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const anio = query.anio ?? new Date().getFullYear();
    const where: Record<string, unknown> = {
      alumnoId,
      fecha: {
        gte: new Date(`${anio}-01-01`),
        lte: new Date(`${anio}-12-31`),
      },
      tramoHorario: null,
    };
    if (query.mes) {
      const mesStr = String(query.mes).padStart(2, '0');
      where['fecha'] = {
        gte: new Date(`${anio}-${mesStr}-01`),
        lte: new Date(`${anio}-${mesStr}-31`),
      };
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const skip = (page - 1) * limit;

    const [total, registros] = await Promise.all([
      this.db.asistencia.count({ where }),
      this.db.asistencia.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
      }),
    ]);

    // Calculate cumulative % for the year
    const [totalDias, diasAsistidos] = await Promise.all([
      this.db.asistencia.count({
        where: { alumnoId, fecha: { gte: new Date(`${anio}-01-01`) }, tramoHorario: null },
      }),
      this.db.asistencia.count({
        where: {
          alumnoId,
          fecha: { gte: new Date(`${anio}-01-01`) },
          tramoHorario: null,
          estado: { in: ['PRESENTE', 'ATRASO'] },
        },
      }),
    ]);

    const porcentajeAcumulado = totalDias > 0 ? Math.round((diasAsistidos / totalDias) * 100) : 0;

    return {
      data: {
        alumno,
        porcentajeAcumulado,
        totalDias,
        diasAsistidos,
        registros,
      },
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── DASHBOARD KPIs ────────────────────────────────────────────

  async getDashboard() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    // Overall today
    const [totalHoy, presentesHoy] = await Promise.all([
      this.db.asistencia.count({
        where: { fecha: { gte: hoy, lt: manana }, tramoHorario: null },
      }),
      this.db.asistencia.count({
        where: { fecha: { gte: hoy, lt: manana }, tramoHorario: null, estado: { in: ['PRESENTE', 'ATRASO'] } },
      }),
    ]);

    const porcentajeGeneralHoy = totalHoy > 0 ? Math.round((presentesHoy / totalHoy) * 100) : null;

    // By curso
    const cursos = await this.db.curso.findMany({
      where: { anio: new Date().getFullYear() },
      select: { id: true, nombre: true, nivel: true },
    });

    const statsPorCurso = await Promise.all(
      cursos.map(async (c: any) => {
        const [total, presentes] = await Promise.all([
          this.db.asistencia.count({
            where: { cursoId: c.id, fecha: { gte: hoy, lt: manana }, tramoHorario: null },
          }),
          this.db.asistencia.count({
            where: { cursoId: c.id, fecha: { gte: hoy, lt: manana }, tramoHorario: null, estado: { in: ['PRESENTE', 'ATRASO'] } },
          }),
        ]);
        return {
          cursoId: c.id,
          cursoNombre: c.nombre,
          nivel: c.nivel,
          totalAlumnos: total,
          presentes,
          porcentaje: total > 0 ? Math.round((presentes / total) * 100) : null,
          sinRegistro: total === 0,
        };
      }),
    );

    // By nivel (group)
    const nivelesMap = new Map<string, { total: number; presentes: number }>();
    for (const s of statsPorCurso) {
      if (!nivelesMap.has(s.nivel)) nivelesMap.set(s.nivel, { total: 0, presentes: 0 });
      const n = nivelesMap.get(s.nivel)!;
      n.total += s.totalAlumnos;
      n.presentes += s.presentes;
    }
    const statsPorNivel = Array.from(nivelesMap.entries()).map(([nivel, s]) => ({
      nivel,
      totalAlumnos: s.total,
      presentes: s.presentes,
      porcentaje: s.total > 0 ? Math.round((s.presentes / s.total) * 100) : null,
    }));

    // Cursos sin registrar hoy
    const sinRegistrar = statsPorCurso.filter((s) => s.sinRegistro).length;

    return {
      data: {
        fecha: hoy.toISOString().split('T')[0],
        porcentajeGeneralHoy,
        totalAlumnosHoy: totalHoy,
        presentesHoy,
        cursosSinRegistrar: sinRegistrar,
        porCurso: statsPorCurso,
        porNivel: statsPorNivel,
      },
    };
  }

  // ─── CORREGIR REGISTRO ─────────────────────────────────────────

  async update(id: string, dto: UpdateAsistenciaDto, usuarioId: string) {
    const registro = await this.db.asistencia.findUnique({ where: { id } });
    if (!registro) throw new NotFoundException(`Registro de asistencia ${id} no encontrado`);

    const updated = await this.db.$transaction(async (tx: any) => {
      const result = await tx.asistencia.update({
        where: { id },
        data: dto,
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Asistencia',
          entidadId: id,
          datosAntes: { estado: registro.estado } as object,
          datosDespues: dto as object,
        },
      });
      return result;
    });
    return { data: updated };
  }

  // ─── JUSTIFICAR CON DOCUMENTO S3 ──────────────────────────────

  async justificarConDocumento(id: string, file: Express.Multer.File, usuarioId: string) {
    const registro = await this.db.asistencia.findUnique({ where: { id } });
    if (!registro) throw new NotFoundException(`Registro ${id} no encontrado`);

    const { url } = await this.storageService.upload(file, 'justificaciones');

    const updated = await this.db.$transaction(async (tx: any) => {
      const result = await tx.asistencia.update({
        where: { id },
        data: { estado: 'JUSTIFICADO', documentoAdj: url },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Asistencia',
          entidadId: id,
          datosAntes: { estado: registro.estado } as object,
          datosDespues: { estado: 'JUSTIFICADO', documentoAdj: url } as object,
        },
      });
      return result;
    });
    return { data: updated };
  }

  // ─── EXPORT SIGE MENSUAL ──────────────────────────────────────

  async exportSIGE(mes: number, anio: number) {
    const xlsx = await import('xlsx');

    const mesStr = String(mes).padStart(2, '0');
    const fechaInicio = new Date(`${anio}-${mesStr}-01`);
    const fechaFin = new Date(anio, mes, 0); // last day of month

    const registros = await this.db.asistencia.findMany({
      where: {
        fecha: { gte: fechaInicio, lte: fechaFin },
        tramoHorario: null,
      },
      include: {
        alumno: {
          select: { run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true, numeroMatricula: true },
        },
        curso: { select: { nombre: true, nivel: true } },
      },
      orderBy: [{ fecha: 'asc' }, { alumno: { apellidoPaterno: 'asc' } }],
    });

    const rows = registros.map((r: any) => ({
      'N° Matrícula': r.alumno.numeroMatricula,
      'RUN': r.alumno.run,
      'Nombres': r.alumno.nombres,
      'Apellido Paterno': r.alumno.apellidoPaterno,
      'Apellido Materno': r.alumno.apellidoMaterno,
      'Curso': r.curso?.nombre ?? '',
      'Fecha': r.fecha.toISOString().split('T')[0],
      'Estado': r.estado,
      'Justificación': r.justificacion ?? '',
    }));

    const ws = xlsx.utils.json_to_sheet(rows);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, `Asistencia ${mesStr}-${anio}`);
    return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  // ─── RESUMEN DIARIO ────────────────────────────────────────────

  async getResumenDiario(fecha?: string) {
    const fechaConsulta = fecha ? new Date(fecha) : new Date();
    const diaStart = new Date(fechaConsulta); diaStart.setHours(0, 0, 0, 0);
    const diaEnd = new Date(fechaConsulta); diaEnd.setHours(23, 59, 59, 999);
    const anioActual = diaStart.getFullYear();

    const cursos = await this.db.curso.findMany({
      where: { anio: anioActual },
      select: { id: true, nombre: true, nivel: true },
      orderBy: { nombre: 'asc' },
    });

    const porCurso = await Promise.all(
      cursos.map(async (c: any) => {
        const registros = await this.db.asistencia.findMany({
          where: { cursoId: c.id, fecha: { gte: diaStart, lte: diaEnd }, tramoHorario: null },
          select: { estado: true },
        });
        const total = registros.length;
        const presentes = registros.filter((r: any) => ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(r.estado)).length;
        return {
          cursoId: c.id, cursoNombre: c.nombre, nivel: c.nivel,
          total, presentes,
          ausentes: registros.filter((r: any) => r.estado === 'AUSENTE').length,
          atrasados: registros.filter((r: any) => r.estado === 'ATRASO').length,
          justificados: registros.filter((r: any) => r.estado === 'JUSTIFICADO').length,
          porcentaje: total > 0 ? Math.round((presentes / total) * 100) : null,
          registrado: total > 0,
        };
      }),
    );

    const totalRegistros = porCurso.reduce((s, c) => s + c.total, 0);
    const totalPresentes = porCurso.reduce((s, c) => s + c.presentes, 0);

    return {
      data: {
        fecha: diaStart.toISOString().split('T')[0],
        porcentajeGeneral: totalRegistros > 0 ? Math.round((totalPresentes / totalRegistros) * 100 * 10) / 10 : null,
        totalAlumnos: totalRegistros,
        totalPresentes,
        cursosSinRegistrar: porCurso.filter((c) => !c.registrado).length,
        porCurso,
      },
    };
  }

  // ─── RESUMEN MENSUAL ───────────────────────────────────────────

  async getResumenMensual(mes: number, anio: number) {
    const mesStr = String(mes).padStart(2, '0');
    const fechaInicio = new Date(`${anio}-${mesStr}-01T00:00:00`);
    const fechaFin = new Date(anio, mes, 0, 23, 59, 59, 999); // last day

    const cursos = await this.db.curso.findMany({
      where: { anio },
      select: { id: true, nombre: true, nivel: true },
      orderBy: { nombre: 'asc' },
    });

    const porCurso = await Promise.all(
      cursos.map(async (c: any) => {
        const registros = await this.db.asistencia.findMany({
          where: { cursoId: c.id, fecha: { gte: fechaInicio, lte: fechaFin }, tramoHorario: null },
          select: { estado: true, alumnoId: true, fecha: true },
        });
        const alumnosUnicos = new Set(registros.map((r: any) => r.alumnoId)).size;
        const diasUnicos = new Set(
          registros.map((r: any) => r.fecha.toISOString().split('T')[0]),
        ).size;
        const totalPresencias = registros.filter((r: any) =>
          ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(r.estado),
        ).length;
        const totalAusencias = registros.filter((r: any) => r.estado === 'AUSENTE').length;
        const porcentaje = registros.length > 0
          ? Math.round((totalPresencias / registros.length) * 100 * 10) / 10
          : null;
        return {
          cursoId: c.id, cursoNombre: c.nombre, nivel: c.nivel,
          totalAlumnos: alumnosUnicos, registrosDias: diasUnicos,
          totalPresencias, totalAusencias, porcentaje,
        };
      }),
    );

    const totalAll = porCurso.reduce((s, c) => s + c.totalPresencias + c.totalAusencias, 0);
    const presAll = porCurso.reduce((s, c) => s + c.totalPresencias, 0);
    const porcentajeGeneral = totalAll > 0 ? Math.round((presAll / totalAll) * 100 * 10) / 10 : null;

    const conDatos = porCurso.filter((c) => c.registrosDias > 0);
    const mejorCurso = conDatos.length > 0
      ? conDatos.reduce((a, b) => ((a.porcentaje ?? 0) > (b.porcentaje ?? 0) ? a : b)).cursoNombre
      : null;
    const peorCurso = conDatos.length > 0
      ? conDatos.reduce((a, b) => ((a.porcentaje ?? 100) < (b.porcentaje ?? 100) ? a : b)).cursoNombre
      : null;

    const totalDias = conDatos.length > 0
      ? Math.max(...conDatos.map((c) => c.registrosDias))
      : 0;

    const alertas = porCurso
      .filter((c) => c.porcentaje !== null && c.porcentaje < 85)
      .map((c) => ({
        tipo: 'CURSO_BAJO_UMBRAL',
        mensaje: `Curso ${c.cursoNombre} tiene ${c.porcentaje}% de asistencia`,
        cursoId: c.cursoId,
      }));

    return {
      data: {
        mes, anio, totalDias, porcentajeGeneral,
        mejorCurso, peorCurso,
        porCurso,
        alertas,
      },
    };
  }

  // ─── ALERTAS DE ASISTENCIA ─────────────────────────────────────

  async getAlertasAsistencia() {
    const hoy = new Date();
    const lunesEstaSemana = new Date(hoy);
    lunesEstaSemana.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7)); // Monday
    lunesEstaSemana.setHours(0, 0, 0, 0);

    const cursos = await this.db.curso.findMany({
      where: { anio: hoy.getFullYear() },
      select: { id: true, nombre: true, nivel: true },
    });

    const alertas: any[] = [];

    // Check courses below 85% this week
    for (const c of cursos) {
      const registros = await this.db.asistencia.findMany({
        where: { cursoId: c.id, fecha: { gte: lunesEstaSemana }, tramoHorario: null },
        select: { estado: true },
      });
      if (registros.length === 0) continue;
      const presentes = registros.filter((r: any) =>
        ['PRESENTE', 'ATRASO', 'JUSTIFICADO'].includes(r.estado),
      ).length;
      const pct = Math.round((presentes / registros.length) * 100);
      if (pct < 85) {
        alertas.push({
          tipo: 'CURSO_BAJO_UMBRAL_SEMANAL',
          mensaje: `Curso ${c.nombre} tiene ${pct}% de asistencia esta semana`,
          cursoId: c.id,
          porcentaje: pct,
          severidad: pct < 75 ? 'error' : 'warning',
        });
      }
    }

    // Find students with 3+ consecutive absences (last 5 days)
    const hace5Dias = new Date(hoy); hace5Dias.setDate(hoy.getDate() - 6);
    hace5Dias.setHours(0, 0, 0, 0);

    const ausenciasRecientes = await this.db.asistencia.groupBy({
      by: ['alumnoId'],
      where: {
        fecha: { gte: hace5Dias },
        tramoHorario: null,
        estado: 'AUSENTE',
      },
      _count: { id: true },
      having: { id: { _count: { gte: 3 } } },
    });

    for (const a of ausenciasRecientes) {
      const alumno = await this.db.alumno.findFirst({
        where: { id: (a as any).alumnoId, deletedAt: null },
        select: { nombres: true, apellidoPaterno: true, curso: { select: { nombre: true } } },
      });
      if (!alumno) continue;
      alertas.push({
        tipo: 'ALUMNO_INASISTENCIA_REITERADA',
        mensaje: `${alumno.nombres} ${alumno.apellidoPaterno} tiene ${(a as any)._count.id}+ inasistencias esta semana`,
        alumnoId: (a as any).alumnoId,
        cursoNombre: (alumno as any).curso?.nombre ?? '',
        severidad: 'warning',
      });
    }

    return { data: alertas };
  }
}
