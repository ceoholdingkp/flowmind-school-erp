import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { CrearMatriculaDto, ActualizarMatriculaDto, MatriculaQueryDto } from './dto/matriculas.dto';

@Injectable()
export class MatriculasV2Service {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ── Listado paginado ────────────────────────────────────────

  async findAll(query: MatriculaQueryDto) {
    const { anio = new Date().getFullYear(), estado, curso, nivel, q, page = 1, limit = 30 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { anio };
    if (estado) where['estado'] = estado;
    if (curso)  where['curso']  = { contains: curso, mode: 'insensitive' };
    if (nivel)  where['nivel']  = { contains: nivel, mode: 'insensitive' };
    if (q) {
      where['alumno'] = {
        OR: [
          { run: { contains: q, mode: 'insensitive' } },
          { nombres: { contains: q, mode: 'insensitive' } },
          { apellidoPaterno: { contains: q, mode: 'insensitive' } },
          { apellidoMaterno: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const [total, items] = await Promise.all([
      this.db.matricula.count({ where }),
      this.db.matricula.findMany({
        where,
        skip,
        take: limit,
        include: {
          alumno: {
            select: {
              id: true, run: true, nombres: true, apellidoPaterno: true,
              apellidoMaterno: true, genero: true, foto: true,
            },
          },
          cursoRel: { select: { id: true, nombre: true, nivel: true } },
        },
        orderBy: [{ nivel: 'asc' }, { curso: 'asc' }],
      }),
    ]);

    return {
      data: items,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Resumen por curso ───────────────────────────────────────

  async getResumen(anio?: number) {
    const year = anio ?? new Date().getFullYear();
    const matriculas = await this.db.matricula.findMany({
      where: { anio: year },
      select: {
        curso: true,
        nivel: true,
        estado: true,
        prioritario: true,
        preferente: true,
        pie: true,
        alumno: { select: { genero: true } },
      },
    });

    // Totales globales
    const vigentes  = matriculas.filter((m: any) => m.estado === 'VIGENTE').length;
    const retirados = matriculas.filter((m: any) => m.estado === 'RETIRADO').length;
    const trasladados = matriculas.filter((m: any) => m.estado === 'TRASLADADO').length;
    const egresados = matriculas.filter((m: any) => m.estado === 'EGRESADO').length;

    // Por curso
    const cursoMap = new Map<string, any>();
    for (const m of matriculas) {
      if (!cursoMap.has(m.curso)) {
        cursoMap.set(m.curso, {
          curso: m.curso, nivel: m.nivel,
          total: 0, hombres: 0, mujeres: 0,
          prioritarios: 0, preferentes: 0, pie: 0, retirados: 0,
        });
      }
      const entry = cursoMap.get(m.curso);
      entry.total++;
      if ((m as any).alumno?.genero === 'MASCULINO') entry.hombres++;
      else if ((m as any).alumno?.genero === 'FEMENINO') entry.mujeres++;
      if ((m as any).prioritario) entry.prioritarios++;
      if ((m as any).preferente) entry.preferentes++;
      if ((m as any).pie) entry.pie++;
      if (m.estado === 'RETIRADO' || m.estado === 'TRASLADADO') entry.retirados++;
    }

    const porCurso = Array.from(cursoMap.values()).sort((a, b) =>
      a.nivel.localeCompare(b.nivel) || a.curso.localeCompare(b.curso),
    );

    return {
      data: {
        anio: year,
        totales: {
          total: matriculas.length,
          vigentes,
          retirados,
          trasladados,
          egresados,
          pie: matriculas.filter((m: any) => m.pie).length,
          prioritarios: matriculas.filter((m: any) => m.prioritario).length,
          preferentes: matriculas.filter((m: any) => m.preferente).length,
        },
        porCurso,
      },
    };
  }

  // ── Crear matrícula ─────────────────────────────────────────

  async create(dto: CrearMatriculaDto, usuarioId: string) {
    // Verificar que el alumno existe
    const alumno = await this.db.alumno.findFirst({
      where: { id: dto.alumnoId, deletedAt: null },
    });
    if (!alumno) throw new NotFoundException(`Alumno ${dto.alumnoId} no encontrado`);

    // Verificar duplicado por año
    const existing = await this.db.matricula.findUnique({
      where: { alumnoId_anio: { alumnoId: dto.alumnoId, anio: dto.anio } },
    });
    if (existing) {
      throw new ConflictException(
        `El alumno ya tiene matrícula en el año ${dto.anio}`,
      );
    }

    // Calcular número correlativo si no viene
    let numMat = dto.numeroMatricula;
    if (!numMat) {
      const last = await this.db.matricula.findFirst({
        where: { anio: dto.anio },
        orderBy: { numeroMatricula: 'desc' },
      });
      numMat = (last?.numeroMatricula ?? 0) + 1;
    }

    const matricula = await this.db.$transaction(async (tx: any) => {
      const m = await tx.matricula.create({
        data: {
          alumnoId: dto.alumnoId,
          anio: dto.anio,
          curso: dto.curso,
          nivel: dto.nivel,
          cursoId: dto.cursoId ?? null,
          estado: 'VIGENTE',
          numeroMatricula: numMat,
          fechaMatricula: dto.fechaMatricula ? new Date(dto.fechaMatricula) : new Date(),
          procedencia: dto.procedencia ?? null,
          becaPorcentaje: dto.becaPorcentaje ?? 0,
          prioritario: dto.prioritario ?? false,
          preferente: dto.preferente ?? false,
          pie: dto.pie ?? false,
          pieDiagnostico: dto.pieDiagnostico ?? null,
          repitente: dto.repitente ?? false,
        },
        include: {
          alumno: { select: { id: true, run: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Matricula',
          entidadId: m.id,
          datosDespues: { alumnoId: dto.alumnoId, anio: dto.anio, curso: dto.curso } as object,
        },
      });
      return m;
    });

    return { data: matricula };
  }

  // ── Actualizar matrícula ────────────────────────────────────

  async update(id: string, dto: ActualizarMatriculaDto, usuarioId: string) {
    const matricula = await this.db.matricula.findUnique({ where: { id } });
    if (!matricula) throw new NotFoundException(`Matrícula ${id} no encontrada`);

    // Validar retiro
    if (dto.estado === 'RETIRADO' || dto.estado === 'TRASLADADO') {
      if (!dto.motivoRetiro) {
        throw new BadRequestException('Al retirar un alumno debe indicar el motivo');
      }
      if (!dto.fechaRetiro) {
        throw new BadRequestException('Al retirar un alumno debe indicar la fecha de retiro');
      }
    }

    const updated = await this.db.$transaction(async (tx: any) => {
      const m = await tx.matricula.update({
        where: { id },
        data: {
          ...dto,
          fechaRetiro: dto.fechaRetiro ? new Date(dto.fechaRetiro) : undefined,
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'UPDATE',
          entidad: 'Matricula',
          entidadId: id,
          datosAntes: { estado: matricula.estado } as object,
          datosDespues: dto as object,
        },
      });
      return m;
    });

    return { data: updated };
  }

  // ── Reporte SIGE ────────────────────────────────────────────

  async reporteSige(anio?: number) {
    const year = anio ?? new Date().getFullYear();
    const matriculas = await this.db.matricula.findMany({
      where: { anio: year, estado: 'VIGENTE' },
      include: {
        alumno: {
          include: {
            apoderados: {
              where: { esTitular: true },
              include: { apoderado: { select: { run: true, nombres: true, apellidos: true, telefono: true, email: true } } },
            },
          },
        },
        cursoRel: { select: { nombre: true, nivel: true } },
      },
      orderBy: [{ nivel: 'asc' }, { alumno: { apellidoPaterno: 'asc' } }],
    });

    const rows = matriculas.map((m: any) => {
      const a = m.alumno;
      const ap = a.apoderados?.[0]?.apoderado;
      return {
        'RUN':               a.run,
        'Nombres':           a.nombres,
        'Apellido Paterno':  a.apellidoPaterno,
        'Apellido Materno':  a.apellidoMaterno,
        'Fecha Nacimiento':  a.fechaNacimiento ? new Date(a.fechaNacimiento).toISOString().split('T')[0] : '',
        'Género':            a.genero,
        'Nacionalidad':      a.nacionalidad,
        'Pueblo Originario': a.puebloOriginario ?? '',
        'Curso':             m.curso,
        'Nivel':             m.nivel,
        'N° Matrícula':      m.numeroMatricula ?? '',
        'Estado':            m.estado,
        'Prioritario':       m.prioritario ? 'SI' : 'NO',
        'Preferente':        m.preferente ? 'SI' : 'NO',
        'PIE':               m.pie ? 'SI' : 'NO',
        'Diagnóstico PIE':   m.pieDiagnostico ?? '',
        'Procedencia':       m.procedencia ?? '',
        'Apoderado RUN':     ap?.run ?? '',
        'Apoderado Nombre':  ap ? `${ap.nombres} ${ap.apellidos}` : '',
        'Apoderado Teléfono': ap?.telefono ?? '',
        'Apoderado Email':   ap?.email ?? '',
      };
    });

    return {
      data: {
        anio: year,
        totalAlumnos: rows.length,
        filas: rows,
      },
    };
  }

  // ── Historial de un alumno ──────────────────────────────────

  async getHistorialAlumno(alumnoId: string) {
    const alumno = await this.db.alumno.findFirst({ where: { id: alumnoId, deletedAt: null } });
    if (!alumno) throw new NotFoundException(`Alumno ${alumnoId} no encontrado`);

    const matriculas = await this.db.matricula.findMany({
      where: { alumnoId },
      include: { cursoRel: { select: { id: true, nombre: true, nivel: true } } },
      orderBy: { anio: 'desc' },
    });

    return { data: matriculas };
  }
}
