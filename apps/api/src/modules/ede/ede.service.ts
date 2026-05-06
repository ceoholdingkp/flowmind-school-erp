import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver');
import { Writable, PassThrough } from 'stream';
import { TenantService } from '../../prisma/tenant.service';
import { mapAlumnoToPerson, mapFuncionarioToPerson } from './mappers/person.mapper';
import { mapEstablecimientoToOrganization, mapAsignaturaToOrganization, mapCursoToOrganization } from './mappers/organization.mapper';
import { mapAsistenciaToAttendanceEvent } from './mappers/attendance.mapper';
import { mapEvaluacionToAssessment, mapNotaToAssessmentResult } from './mappers/assessment.mapper';
import { mapFuncionarioToStaffAssignment, mapDocenteCursoToStaffSection } from './mappers/staff.mapper';

// Run validation: max 47000000, must have dash or k at end
const RUN_REGEX = /^\d{1,8}[-–][0-9kK]$/;

@Injectable()
export class EdeService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() {
    return this.tenantService.getClient();
  }

  async validar(anio: number) {
    const errores: { campo: string; mensaje: string; registrosAfectados: number }[] = [];
    const advertencias: { campo: string; mensaje: string; registrosAfectados: number }[] = [];

    // 1. Alumnos sin RUN válido
    const alumnos = await (this.db.alumno as any).findMany({
      where: { estadoMatricula: 'ACTIVA' },
      select: { id: true, run: true, nombres: true, apellidoPaterno: true, cursoId: true },
    });

    const runInvalido = alumnos.filter((a: any) => !a.run || !RUN_REGEX.test(a.run));
    if (runInvalido.length > 0) {
      errores.push({
        campo: 'Alumno.run',
        mensaje: 'Alumnos matriculados con RUN inválido o sin formato X-X',
        registrosAfectados: runInvalido.length,
      });
    }

    // 2. Alumnos sin curso asignado
    const sinCurso = alumnos.filter((a: any) => !a.cursoId);
    if (sinCurso.length > 0) {
      errores.push({
        campo: 'Alumno.cursoId',
        mensaje: 'Alumnos activos sin curso asignado',
        registrosAfectados: sinCurso.length,
      });
    }

    // 3. Cursos del año sin docente jefe
    const cursos = await (this.db.curso as any).findMany({
      where: { anio },
      select: { id: true, nombre: true, docenteJefeId: true },
    });
    const sinDocenteJefe = cursos.filter((c: any) => !c.docenteJefeId);
    if (sinDocenteJefe.length > 0) {
      errores.push({
        campo: 'Curso.docenteJefeId',
        mensaje: 'Cursos sin docente jefe asignado',
        registrosAfectados: sinDocenteJefe.length,
      });
    }

    // 4. Cursos sin asignaturas
    const asigDocentes = await (this.db.asignaturaDocente as any).findMany({
      where: { anio },
      select: { cursoId: true },
    });
    const cursosConAsig = new Set(asigDocentes.map((a: any) => a.cursoId));
    const sinAsignaturas = cursos.filter((c: any) => !cursosConAsig.has(c.id));
    if (sinAsignaturas.length > 0) {
      errores.push({
        campo: 'AsignaturaDocente',
        mensaje: 'Cursos sin asignaturas asignadas',
        registrosAfectados: sinAsignaturas.length,
      });
    }

    // 5. Funcionarios docentes sin RUN válido
    const funcionarios = await (this.db.funcionario as any).findMany({
      where: { estado: 'ACTIVO', tipo: 'DOCENTE' },
      select: { id: true, run: true, nombres: true },
    });
    const funcRunInvalido = funcionarios.filter((f: any) => !f.run || !RUN_REGEX.test(f.run));
    if (funcRunInvalido.length > 0) {
      errores.push({
        campo: 'Funcionario.run',
        mensaje: 'Docentes activos con RUN inválido',
        registrosAfectados: funcRunInvalido.length,
      });
    }

    // 6. Evaluaciones sin notas ingresadas (advertencia)
    const evaluaciones = await (this.db.evaluacion as any).findMany({
      where: { anio },
      include: { _count: { select: { notasEval: true } } },
    });
    const evalSinNotas = (evaluaciones as any[]).filter((e: any) => e._count.notasEval === 0);
    if (evalSinNotas.length > 0) {
      advertencias.push({
        campo: 'Evaluacion',
        mensaje: 'Evaluaciones sin ninguna nota registrada',
        registrosAfectados: evalSinNotas.length,
      });
    }

    // 7. Asistencia: check if there are any records for the year
    const asistenciaCount = await (this.db.asistencia as any).count({
      where: {
        fecha: { gte: new Date(`${anio}-01-01`), lt: new Date(`${anio + 1}-01-01`) },
      },
    });
    if (asistenciaCount === 0) {
      errores.push({
        campo: 'Asistencia',
        mensaje: 'No hay registros de asistencia para el año indicado',
        registrosAfectados: 0,
      });
    }

    return {
      valido: errores.length === 0,
      totalAlumnos: alumnos.length,
      totalCursos: cursos.length,
      totalFuncionarios: funcionarios.length,
      errores,
      advertencias,
    };
  }

  async exportar(anio: number, rbd: string) {
    const db = this.db;

    // Load all data
    const [establecimiento, alumnos, funcionarios, cursos, asignaturas, asigDocentes, asistencias, evaluaciones, notas] =
      await Promise.all([
        (db.establecimiento as any).findFirst(),
        (db.alumno as any).findMany({
          where: { estadoMatricula: 'ACTIVA' },
        }),
        (db.funcionario as any).findMany({ where: { estado: 'ACTIVO' } }),
        (db.curso as any).findMany({ where: { anio } }),
        (db.asignatura as any).findMany({ where: { activa: true } }),
        (db.asignaturaDocente as any).findMany({ where: { anio } }),
        (db.asistencia as any).findMany({
          where: { fecha: { gte: new Date(`${anio}-01-01`), lt: new Date(`${anio + 1}-01-01`) } },
        }),
        (db.evaluacion as any).findMany({ where: { anio } }),
        (db.notaEval as any).findMany({
          where: { evaluacion: { anio } },
        }),
      ]);

    const orgId = establecimiento ? `ORG-${establecimiento.id}` : `ORG-RBD${rbd}`;

    // Build Organization
    const organizations: any[] = [];
    const organization = establecimiento
      ? mapEstablecimientoToOrganization(establecimiento)
      : { OrganizationId: orgId, Name: 'Establecimiento', RefOrganizationTypeId: 10, Identifier: rbd };
    organizations.push(organization);

    const courseOrgs = asignaturas.map((a: any) => mapAsignaturaToOrganization(a));
    const sectionOrgs = cursos.map((c: any) => mapCursoToOrganization(c, orgId));
    organizations.push(...courseOrgs, ...sectionOrgs);

    // Build Person / PersonIdentifier / OrganizationPersonRole
    const persons: any[] = [];
    const personIdentifiers: any[] = [];
    const orgPersonRoles: any[] = [];

    for (const alumno of alumnos as any[]) {
      const mapped = mapAlumnoToPerson(alumno, orgId);
      persons.push(mapped.person);
      personIdentifiers.push(mapped.personIdentifier);
      orgPersonRoles.push(mapped.orgPersonRole);
    }
    for (const func of funcionarios as any[]) {
      const mapped = mapFuncionarioToPerson(func, orgId);
      persons.push(mapped.person);
      personIdentifiers.push(mapped.personIdentifier);
      orgPersonRoles.push(mapped.orgPersonRole);
    }

    // Build K12StaffAssignment
    const staffAssignments = (funcionarios as any[]).map((f: any) =>
      mapFuncionarioToStaffAssignment(f, orgId),
    );

    // Build StaffSectionAssociation
    const staffSections = (asigDocentes as any[]).map((ad: any) =>
      mapDocenteCursoToStaffSection(ad),
    );

    // Build RoleAttendanceEvent
    // Need alumnoId to cursoId map
    const alumnoCursoMap = new Map<string, string>(
      (alumnos as any[]).map((a: any) => [a.id, a.cursoId]),
    );
    const attendanceEvents = (asistencias as any[]).map((a: any) => {
      const seccionId = a.cursoId ? `SEC-${a.cursoId}` : `SEC-${alumnoCursoMap.get(a.alumnoId) ?? 'unknown'}`;
      return mapAsistenciaToAttendanceEvent(a, a.alumnoId, seccionId);
    });

    // Build Assessment + AssessmentResult
    const assessments = (evaluaciones as any[]).map((e: any) => mapEvaluacionToAssessment(e));
    const assessmentResults = (notas as any[]).map((n: any) => mapNotaToAssessmentResult(n));

    const edeJson = {
      Organization: organizations,
      Person: persons,
      PersonIdentifier: personIdentifiers,
      OrganizationPersonRole: orgPersonRoles,
      K12StaffAssignment: staffAssignments,
      StaffSectionAssociation: staffSections,
      RoleAttendanceEvent: attendanceEvents,
      Assessment: assessments,
      AssessmentResult: assessmentResults,
      ExportMetadata: {
        anio,
        rbd,
        generadoEn: new Date().toISOString(),
        version: 'EDE-7.1',
        totalAlumnos: alumnos.length,
        totalFuncionarios: funcionarios.length,
        totalAsistencias: asistencias.length,
        totalNotas: notas.length,
      },
    };

    return edeJson;
  }

  async exportarZip(anio: number, rbd: string): Promise<Buffer> {
    const edeJson = await this.exportar(anio, rbd);
    const jsonStr = JSON.stringify(edeJson, null, 2);

    return new Promise((resolve, reject) => {
      const buffers: Buffer[] = [];
      const passThrough = new PassThrough();
      passThrough.on('data', (chunk) => buffers.push(Buffer.from(chunk)));
      passThrough.on('end', () => resolve(Buffer.concat(buffers)));
      passThrough.on('error', reject);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', reject);
      archive.pipe(passThrough);
      archive.append(jsonStr, { name: `EDE_${rbd}_${anio}.json` });
      archive.finalize();
    });
  }

  async firmaOtp(rut: string, otp: string, funcionarioId: string, cursoId: string, tipo: string, ipSolicitante?: string) {
    // Build Chilean date with timezone
    const now = new Date();
    const offset = '-03:00'; // Chile summer / -04:00 winter; use -03:00 as default
    const dateWithTz = now.toISOString().replace('Z', offset);

    // DEV bypass: OTP 123456 skips the Mineduc API call entirely
    const isDev = process.env.NODE_ENV !== 'production';

    // Call Mineduc OTP API
    let otpValido = isDev && otp === '123456'; // pre-authorized in dev
    if (!otpValido) try {
      const url = `https://apiede.mineduc.cl/otp/verify-otp?rut=${encodeURIComponent(rut)}&otp=${encodeURIComponent(otp)}&DateWithTimeZone=${encodeURIComponent(dateWithTz)}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const body = await resp.text();
      otpValido = body.trim() === 'true' || body.trim() === '"true"';
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (isDev) {
          otpValido = otp === '123456';
        } else {
          throw new HttpException('Servicio OTP Mineduc no disponible (timeout)', HttpStatus.SERVICE_UNAVAILABLE);
        }
      } else if (isDev) {
        // Network error in dev — allow bypass
        otpValido = otp === '123456';
      } else {
        throw new HttpException('Servicio OTP Mineduc no disponible', HttpStatus.SERVICE_UNAVAILABLE);
      }
    }

    if (!otpValido) {
      throw new HttpException('OTP inválido', HttpStatus.UNPROCESSABLE_ENTITY);
    }

    // Upsert firma
    const fecha = new Date(now.toISOString().split('T')[0]);
    const firma = await (this.db.firmaLibroClases as any).upsert({
      where: {
        funcionarioId_cursoId_fecha_tipo: { funcionarioId, cursoId, fecha, tipo },
      },
      update: { otpValidado: true, ipSolicitante: ipSolicitante ?? null },
      create: { funcionarioId, cursoId, fecha, tipo, otpValidado: true, ipSolicitante: ipSolicitante ?? null },
    });

    return { firmado: true, firmaId: firma.id, fecha: fecha.toISOString().split('T')[0] };
  }

  async getFirmasDia(fecha?: string) {
    const targetDate = fecha ? new Date(fecha) : new Date();
    const dateOnly = new Date(targetDate.toISOString().split('T')[0]);

    const firmas = await (this.db.firmaLibroClases as any).findMany({
      where: { fecha: dateOnly },
      include: {
        funcionario: { select: { id: true, nombres: true, apellidos: true, run: true, cargo: true } },
        curso: { select: { id: true, nombre: true, nivel: true } },
      },
      orderBy: [{ curso: { nombre: 'asc' } }, { tipo: 'asc' }],
    });

    return firmas;
  }

  async getFirmasMes(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    return (this.db.firmaLibroClases as any).findMany({
      where: { fecha: { gte: inicio, lt: fin } },
      include: {
        funcionario: { select: { nombres: true, apellidos: true, run: true } },
        curso: { select: { nombre: true, nivel: true } },
      },
      orderBy: { fecha: 'desc' },
    });
  }

  async getCursosPendientesFirma(fecha?: string) {
    const targetDate = fecha ? new Date(fecha) : new Date();
    const dateOnly = new Date(targetDate.toISOString().split('T')[0]);
    const anio = targetDate.getFullYear();

    const cursos = await (this.db.curso as any).findMany({
      where: { anio },
      include: {
        docenteJefe: { select: { id: true, nombres: true, apellidos: true, run: true } },
      },
      orderBy: { nombre: 'asc' },
    });

    const firmasHoy = await (this.db.firmaLibroClases as any).findMany({
      where: { fecha: dateOnly },
      select: { cursoId: true, tipo: true },
    });

    const firmaSet = new Set(firmasHoy.map((f: any) => `${f.cursoId}:${f.tipo}`));

    return cursos.map((c: any) => ({
      ...c,
      firmas: {
        ASISTENCIA: firmaSet.has(`${c.id}:ASISTENCIA`),
        CLASE: firmaSet.has(`${c.id}:CLASE`),
        EVALUACION: firmaSet.has(`${c.id}:EVALUACION`),
      },
      pendiente: !firmaSet.has(`${c.id}:ASISTENCIA`),
    }));
  }
}
