import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import {
  CreateAsignaturaDto, UpdateAsignaturaDto, AsignaturaDocenteDto,
  CreateEvaluacionDto, UpdateEvaluacionDto, EvaluacionQueryDto,
  RegistrarNotasBulkDto,
} from './dto/academico.dto';

@Injectable()
export class AcademicoService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── ASIGNATURAS ─────────────────────────────────────────────

  async getAsignaturas(soloActivas = true) {
    return this.db.asignatura.findMany({
      where: soloActivas ? { activa: true } : (undefined as any),
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { notas: true } },
      },
    });
  }

  async createAsignatura(dto: CreateAsignaturaDto) {
    if (dto.codigo) {
      const exists = await this.db.asignatura.findUnique({ where: { codigo: dto.codigo } });
      if (exists) throw new ConflictException('Código de asignatura ya registrado');
    }
    return this.db.asignatura.create({ data: dto });
  }

  async updateAsignatura(id: string, dto: UpdateAsignaturaDto) {
    await this._requireAsignatura(id);
    return this.db.asignatura.update({ where: { id }, data: dto });
  }

  // ─── DOCENTES-CURSO ──────────────────────────────────────────

  async getDocentesCurso(anio: number) {
    return this.db.asignaturaDocente.findMany({
      where: { anio },
      include: {
        asignatura: { select: { id: true, nombre: true, codigo: true } },
        funcionario: { select: { id: true, nombres: true, apellidos: true } },
      },
      orderBy: [{ cursoId: 'asc' }, { asignaturaId: 'asc' }],
    });
  }

  async createDocenteCurso(dto: AsignaturaDocenteDto) {
    const exists = await this.db.asignaturaDocente.findFirst({
      where: {
        asignaturaId: dto.asignaturaId,
        funcionarioId: dto.funcionarioId,
        cursoId: dto.cursoId,
        anio: dto.anio,
      },
    });
    if (exists) throw new ConflictException('Asignación ya existe');
    return this.db.asignaturaDocente.create({ data: dto });
  }

  // ─── EVALUACIONES ────────────────────────────────────────────

  async getEvaluaciones(query: EvaluacionQueryDto) {
    const anio = query.anio ?? new Date().getFullYear();
    return this.db.evaluacion.findMany({
      where: {
        ...(query.cursoId && { cursoId: query.cursoId }),
        ...(query.asignaturaId && { asignaturaId: query.asignaturaId }),
        ...(query.semestre && { semestre: query.semestre }),
        anio,
      },
      include: {
        asignatura: { select: { id: true, nombre: true } },
        curso: { select: { id: true, nombre: true } },
        _count: { select: { notasEval: true } },
      },
      orderBy: [{ fechaAplicacion: 'asc' }, { nombre: 'asc' }],
    });
  }

  async createEvaluacion(dto: CreateEvaluacionDto) {
    const existentes = await this.db.evaluacion.findMany({
      where: {
        cursoId: dto.cursoId,
        asignaturaId: dto.asignaturaId,
        semestre: dto.semestre,
        anio: dto.anio,
        estado: 'ABIERTA',
      },
      select: { ponderacion: true },
    });
    const totalActual = existentes.reduce((sum: number, e: { ponderacion: number }) => sum + e.ponderacion, 0);
    if (totalActual + dto.ponderacion > 100.01) {
      throw new BadRequestException(
        `La ponderación total superaría 100%. Disponible: ${(100 - totalActual).toFixed(1)}%`,
      );
    }

    return this.db.evaluacion.create({
      data: {
        ...dto,
        fechaAplicacion: dto.fechaAplicacion ? new Date(dto.fechaAplicacion) : null,
      },
      include: {
        asignatura: { select: { id: true, nombre: true } },
        curso: { select: { id: true, nombre: true } },
      },
    });
  }

  async updateEvaluacion(id: string, dto: UpdateEvaluacionDto) {
    const evaluacion = await this.db.evaluacion.findUnique({ where: { id } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    if ((evaluacion as any).estado === 'CERRADA' && dto.estado !== 'ABIERTA') {
      throw new BadRequestException('La evaluación está cerrada. Solo puede reabrirse.');
    }
    return this.db.evaluacion.update({
      where: { id },
      data: {
        ...dto,
        fechaAplicacion: dto.fechaAplicacion ? new Date(dto.fechaAplicacion) : undefined,
      },
    });
  }

  // ─── NOTAS ───────────────────────────────────────────────────

  async getNotasCursoAsignatura(cursoId: string, asignaturaId: string, semestre?: number, anio?: number) {
    const anioFinal = anio ?? new Date().getFullYear();
    const evaluaciones = await this.db.evaluacion.findMany({
      where: {
        cursoId,
        asignaturaId,
        ...(semestre && { semestre }),
        anio: anioFinal,
      },
      include: {
        notasEval: {
          include: { alumno: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } } },
          orderBy: { alumno: { apellidoPaterno: 'asc' } },
        },
      },
      orderBy: [{ semestre: 'asc' }, { fechaAplicacion: 'asc' }],
    });

    const alumnosSet = new Map<string, { id: string; nombres: string; apellidoPaterno: string; apellidoMaterno: string }>();
    for (const ev of evaluaciones as any[]) {
      for (const nota of ev.notasEval) {
        if (!alumnosSet.has(nota.alumnoId)) alumnosSet.set(nota.alumnoId, nota.alumno);
      }
    }

    const alumnos = await this.db.alumno.findMany({
      where: { cursoId, estadoMatricula: 'ACTIVA' },
      select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
      orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }],
    });
    for (const a of alumnos as any[]) alumnosSet.set(a.id, a);

    const alumnosList = [...alumnosSet.values()].sort((a, b) =>
      a.apellidoPaterno.localeCompare(b.apellidoPaterno),
    );

    const evList = evaluaciones as any[];
    const filas = alumnosList.map((alumno) => {
      const notasPorEv: Record<string, number | null> = {};
      let sumaP = 0;
      let sumaN = 0;

      for (const ev of evList) {
        const nota = ev.notasEval.find((n: any) => n.alumnoId === alumno.id);
        notasPorEv[ev.id] = nota ? nota.valor : null;
        if (nota != null) {
          sumaP += ev.ponderacion;
          sumaN += nota.valor * ev.ponderacion;
        }
      }
      const promedio = sumaP > 0 ? Math.round((sumaN / sumaP) * 10) / 10 : null;
      return { alumno, notas: notasPorEv, promedio };
    });

    return { evaluaciones, filas };
  }

  async registrarNotasBulk(evaluacionId: string, dto: RegistrarNotasBulkDto, registradoPor: string) {
    const evaluacion = await this.db.evaluacion.findUnique({ where: { id: evaluacionId } });
    if (!evaluacion) throw new NotFoundException('Evaluación no encontrada');
    if ((evaluacion as any).estado === 'CERRADA') {
      throw new BadRequestException('Evaluación cerrada — no se pueden modificar notas');
    }

    for (const nota of dto.notas) {
      if (nota.valor < 1.0 || nota.valor > 7.0) {
        throw new BadRequestException(`Nota ${nota.valor} fuera del rango permitido (1.0 - 7.0)`);
      }
    }

    const alumnoIds = dto.notas.map((n) => n.alumnoId);
    const existing = await this.db.notaEval.findMany({
      where: { evaluacionId, alumnoId: { in: alumnoIds } },
      select: { id: true, alumnoId: true },
    });
    const existingMap = new Map((existing as any[]).map((e) => [e.alumnoId, e.id]));

    const updates: Promise<any>[] = [];
    const creates: { evaluacionId: string; alumnoId: string; valor: number; observacion?: string; registradoPor: string }[] = [];

    for (const nota of dto.notas) {
      const existingId = existingMap.get(nota.alumnoId);
      if (existingId) {
        updates.push(
          this.db.notaEval.update({
            where: { id: existingId },
            data: { valor: nota.valor, observacion: nota.observacion, registradoPor },
          }),
        );
      } else {
        creates.push({
          evaluacionId,
          alumnoId: nota.alumnoId,
          valor: nota.valor,
          observacion: nota.observacion,
          registradoPor,
        });
      }
    }

    await Promise.all([
      ...updates,
      creates.length > 0 ? this.db.notaEval.createMany({ data: creates }) : Promise.resolve(),
    ]);

    return { updated: updates.length, created: creates.length };
  }

  async getNotasAlumno(alumnoId: string, semestre?: number, anio?: number) {
    const anioFinal = anio ?? new Date().getFullYear();
    const notas = await this.db.notaEval.findMany({
      where: {
        alumnoId,
        evaluacion: {
          anio: anioFinal,
          ...(semestre && { semestre }),
        },
      },
      include: {
        evaluacion: {
          include: {
            asignatura: { select: { id: true, nombre: true } },
            curso: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { evaluacion: { fechaAplicacion: 'asc' } },
    });

    const porAsignatura = new Map<string, { asignatura: any; evaluaciones: any[]; promedio: number | null }>();
    for (const nota of notas as any[]) {
      const key = nota.evaluacion.asignaturaId;
      if (!porAsignatura.has(key)) {
        porAsignatura.set(key, { asignatura: nota.evaluacion.asignatura, evaluaciones: [], promedio: null });
      }
      porAsignatura.get(key)!.evaluaciones.push({
        evaluacion: {
          id: nota.evaluacion.id,
          nombre: nota.evaluacion.nombre,
          tipo: nota.evaluacion.tipo,
          ponderacion: nota.evaluacion.ponderacion,
          fechaAplicacion: nota.evaluacion.fechaAplicacion,
        },
        valor: nota.valor,
        observacion: nota.observacion,
      });
    }

    for (const [, data] of porAsignatura) {
      const sumas = data.evaluaciones.reduce(
        (acc: { p: number; n: number }, e: { evaluacion: { ponderacion: number }; valor: number }) => ({
          p: acc.p + e.evaluacion.ponderacion,
          n: acc.n + e.valor * e.evaluacion.ponderacion,
        }),
        { p: 0, n: 0 },
      );
      data.promedio = sumas.p > 0 ? Math.round((sumas.n / sumas.p) * 10) / 10 : null;
    }

    return [...porAsignatura.values()];
  }

  async getInformeCurso(cursoId: string, semestre?: number, anio?: number) {
    const anioFinal = anio ?? new Date().getFullYear();

    const [curso, alumnos, evaluaciones] = await Promise.all([
      this.db.curso.findUnique({
        where: { id: cursoId },
        include: { docenteJefe: { select: { nombres: true, apellidos: true } } },
      }),
      this.db.alumno.findMany({
        where: { cursoId, estadoMatricula: 'ACTIVA' },
        select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true },
        orderBy: [{ apellidoPaterno: 'asc' }, { apellidoMaterno: 'asc' }],
      }),
      this.db.evaluacion.findMany({
        where: { cursoId, anio: anioFinal, ...(semestre && { semestre }) },
        include: {
          asignatura: { select: { id: true, nombre: true } },
          notasEval: { select: { alumnoId: true, valor: true } },
        },
        orderBy: [{ asignaturaId: 'asc' }, { semestre: 'asc' }],
      }),
    ]);

    if (!curso) throw new NotFoundException('Curso no encontrado');

    const asignaturasMap = new Map<string, { asignatura: any; evaluaciones: any[] }>();
    for (const ev of evaluaciones as any[]) {
      const key = ev.asignaturaId;
      if (!asignaturasMap.has(key)) asignaturasMap.set(key, { asignatura: ev.asignatura, evaluaciones: [] });
      asignaturasMap.get(key)!.evaluaciones.push(ev);
    }

    const filas = (alumnos as any[]).map((alumno) => {
      const promediosPorAsignatura: Record<string, number | null> = {};
      let totalNotas = 0;
      let sumNotas = 0;

      for (const [asigId, data] of asignaturasMap) {
        let sumaP = 0;
        let sumaN = 0;
        for (const ev of data.evaluaciones) {
          const nota = (ev.notasEval as any[]).find((n) => n.alumnoId === alumno.id);
          if (nota) { sumaP += ev.ponderacion; sumaN += nota.valor * ev.ponderacion; }
        }
        const prom = sumaP > 0 ? Math.round((sumaN / sumaP) * 10) / 10 : null;
        promediosPorAsignatura[asigId] = prom;
        if (prom !== null) { totalNotas++; sumNotas += prom; }
      }

      const promedioGeneral = totalNotas > 0 ? Math.round((sumNotas / totalNotas) * 10) / 10 : null;
      return { alumno, promediosPorAsignatura, promedioGeneral };
    });

    const asignaturas = [...asignaturasMap.values()].map((a) => a.asignatura);

    const promediosGeneral = filas.map((f) => f.promedioGeneral).filter((p): p is number => p !== null);
    const promedioCurso = promediosGeneral.length > 0
      ? Math.round((promediosGeneral.reduce((a: number, b: number) => a + b, 0) / promediosGeneral.length) * 10) / 10
      : null;
    const aprobados = filas.filter((f) => f.promedioGeneral !== null && (f.promedioGeneral as number) >= 4.0).length;
    const reprobados = filas.filter((f) => f.promedioGeneral !== null && (f.promedioGeneral as number) < 4.0).length;

    return { curso, asignaturas, filas, stats: { promedioCurso, aprobados, reprobados, totalAlumnos: alumnos.length } };
  }

  // ─── HELPERS ─────────────────────────────────────────────────

  private async _requireAsignatura(id: string) {
    const a = await this.db.asignatura.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Asignatura no encontrada');
    return a;
  }
}
