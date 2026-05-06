import { Injectable, NotFoundException } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';

@Injectable()
export class PortalService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() {
    return this.tenantService.getClient();
  }

  private async getAlumnoIds(userId: string): Promise<string[]> {
    const user = await this.db.usuario.findUnique({
      where: { id: userId },
      include: {
        apoderado: {
          include: {
            alumnos: { select: { alumnoId: true } },
          },
        },
      },
    });
    if (!user?.apoderado) return [];
    return user.apoderado.alumnos.map((a) => a.alumnoId);
  }

  async getMe(userId: string) {
    const user = await this.db.usuario.findUnique({
      where: { id: userId },
      include: {
        apoderado: {
          include: {
            alumnos: {
              include: {
                alumno: {
                  select: {
                    id: true,
                    nombres: true,
                    apellidoPaterno: true,
                    apellidoMaterno: true,
                    run: true,
                    estadoMatricula: true,
                    esPIE: true,
                    esPrioritario: true,
                    esPreferente: true,
                    foto: true,
                    curso: { select: { id: true, nombre: true, nivel: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user?.apoderado) {
      throw new NotFoundException('Perfil de apoderado no encontrado. Contacte a la secretaría del colegio.');
    }

    return {
      data: {
        apoderado: {
          id: user.apoderado.id,
          nombres: user.apoderado.nombres,
          apellidos: user.apoderado.apellidos,
          email: user.apoderado.email,
          telefono: user.apoderado.telefono,
        },
        pupilos: user.apoderado.alumnos.map((r) => ({
          ...r.alumno,
          parentesco: r.parentesco,
          esTitular: r.esTitular,
        })),
      },
    };
  }

  async getNotas(userId: string, alumnoId?: string) {
    const alumnoIds = await this.getAlumnoIds(userId);
    if (!alumnoIds.length) return { data: [] };

    const ids = alumnoId && alumnoIds.includes(alumnoId) ? [alumnoId] : alumnoIds;

    const notas = await this.db.nota.findMany({
      where: { alumnoId: { in: ids } },
      include: {
        asignatura: { select: { id: true, nombre: true } },
        alumno: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
      },
      orderBy: [{ anio: 'desc' }, { semestre: 'desc' }, { fecha: 'desc' }],
    });

    return { data: notas };
  }

  async getAsistencia(userId: string, alumnoId?: string) {
    const alumnoIds = await this.getAlumnoIds(userId);
    if (!alumnoIds.length) return { data: [] };

    const ids = alumnoId && alumnoIds.includes(alumnoId) ? [alumnoId] : alumnoIds;

    const asistencias = await this.db.asistencia.findMany({
      where: { alumnoId: { in: ids } },
      include: {
        alumno: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
        curso: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
      take: 120,
    });

    // Stats per alumno
    const stats = ids.map((id) => {
      const registros = asistencias.filter((a) => a.alumnoId === id);
      const total = registros.length;
      const presentes = registros.filter((a) => a.estado === 'PRESENTE').length;
      const ausentes = registros.filter((a) => a.estado === 'AUSENTE').length;
      const atrasos = registros.filter((a) => a.estado === 'ATRASO').length;
      const justificados = registros.filter((a) => a.estado === 'JUSTIFICADO').length;
      const pctAsistencia = total > 0 ? Math.round(((presentes + atrasos) / total) * 100) : 0;
      return { alumnoId: id, total, presentes, ausentes, atrasos, justificados, pctAsistencia };
    });

    return { data: asistencias, stats };
  }

  async getPagos(userId: string, alumnoId?: string) {
    const alumnoIds = await this.getAlumnoIds(userId);
    if (!alumnoIds.length) return { data: [] };

    const ids = alumnoId && alumnoIds.includes(alumnoId) ? [alumnoId] : alumnoIds;

    const pagos = await this.db.pago.findMany({
      where: { alumnoId: { in: ids } },
      include: {
        alumno: { select: { id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    return { data: pagos };
  }

  // ── Portal V2: auth directo por Apoderado ────────────────────

  private async validarAccesoHijo(apoderadoId: string, alumnoId: string): Promise<boolean> {
    const rel = await (this.db.apoderadoAlumno as any).findFirst({
      where: { apoderadoId, alumnoId },
    });
    return !!rel;
  }

  async getHijos(apoderadoId: string) {
    const apoderado = await (this.db.apoderado as any).findUnique({
      where: { id: apoderadoId },
      include: {
        alumnos: {
          include: {
            alumno: {
              select: {
                id: true, nombres: true, apellidoPaterno: true, apellidoMaterno: true,
                run: true, estadoMatricula: true, esPIE: true, esPrioritario: true,
                foto: true, curso: { select: { id: true, nombre: true, nivel: true } },
              },
            },
          },
        },
      },
    });

    if (!apoderado) return [];

    return apoderado.alumnos.map((r: any) => ({
      ...r.alumno,
      parentesco: r.parentesco,
      esTitular: r.esTitular,
    }));
  }

  async getNotasHijo(apoderadoId: string, alumnoId: string, semestre?: string) {
    const ok = await this.validarAccesoHijo(apoderadoId, alumnoId);
    if (!ok) throw new NotFoundException('No tiene acceso a este alumno');

    const where: any = { alumnoId };
    if (semestre) where.semestre = parseInt(semestre);

    const notas = await this.db.nota.findMany({
      where,
      include: { asignatura: { select: { id: true, nombre: true } } },
      orderBy: [{ anio: 'desc' }, { semestre: 'asc' }, { fecha: 'desc' }],
    });

    // Agrupar por asignatura
    const byAsig: Record<string, { asignatura: string; notas: any[]; promedio: number }> = {};
    for (const n of notas) {
      const name = n.asignatura.nombre;
      if (!byAsig[name]) byAsig[name] = { asignatura: name, notas: [], promedio: 0 };
      byAsig[name].notas.push(n);
    }
    for (const asig of Object.values(byAsig)) {
      const vals = asig.notas.map((n) => Number(n.valor));
      asig.promedio = vals.length ? Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10 : 0;
    }

    const promedioGeneral = Object.values(byAsig).length
      ? Math.round(
          (Object.values(byAsig).reduce((s, a) => s + a.promedio, 0) /
            Object.values(byAsig).length) * 10,
        ) / 10
      : 0;

    return { asignaturas: Object.values(byAsig), promedioGeneral };
  }

  async getAsistenciaHijo(apoderadoId: string, alumnoId: string, mes?: string, anio?: string) {
    const ok = await this.validarAccesoHijo(apoderadoId, alumnoId);
    if (!ok) throw new NotFoundException('No tiene acceso a este alumno');

    const now = new Date();
    const m = mes ? parseInt(mes) : now.getMonth() + 1;
    const a = anio ? parseInt(anio) : now.getFullYear();

    const desde = new Date(a, m - 1, 1);
    const hasta = new Date(a, m, 0, 23, 59, 59);

    const registros = await this.db.asistencia.findMany({
      where: { alumnoId, fecha: { gte: desde, lte: hasta } },
      include: { curso: { select: { id: true, nombre: true } } },
      orderBy: { fecha: 'asc' },
    });

    const total = registros.length;
    const presentes = registros.filter((r) => r.estado === 'PRESENTE').length;
    const ausentes = registros.filter((r) => r.estado === 'AUSENTE').length;
    const atrasos = registros.filter((r) => r.estado === 'ATRASO').length;
    const justificados = registros.filter((r) => r.estado === 'JUSTIFICADO').length;
    const pctAsistencia = total > 0 ? Math.round(((presentes + atrasos) / total) * 100) : 0;

    return {
      mes: m,
      anio: a,
      registros,
      stats: { total, presentes, ausentes, atrasos, justificados, pctAsistencia },
    };
  }

  async getAnotacionesHijo(apoderadoId: string, alumnoId: string) {
    const ok = await this.validarAccesoHijo(apoderadoId, alumnoId);
    if (!ok) throw new NotFoundException('No tiene acceso a este alumno');

    const anotaciones = await this.db.anotacion.findMany({
      where: { alumnoId, visiblePortal: true },
      orderBy: { fecha: 'desc' },
      take: 50,
    });

    return anotaciones;
  }

  async getInformeHijo(apoderadoId: string, alumnoId: string) {
    const ok = await this.validarAccesoHijo(apoderadoId, alumnoId);
    if (!ok) throw new NotFoundException('No tiene acceso a este alumno');

    const [alumno, notas, asistencias, anotaciones] = await Promise.all([
      this.db.alumno.findUnique({
        where: { id: alumnoId },
        include: { curso: { select: { id: true, nombre: true, nivel: true } } },
      }),
      this.db.nota.findMany({
        where: { alumnoId },
        include: { asignatura: { select: { nombre: true } } },
      }),
      this.db.asistencia.findMany({ where: { alumnoId } }),
      this.db.anotacion.findMany({ where: { alumnoId, visiblePortal: true }, take: 10 }),
    ]);

    // Promedio general
    const valores = notas.map((n) => Number(n.valor));
    const promedioGeneral = valores.length
      ? Math.round((valores.reduce((s, v) => s + v, 0) / valores.length) * 10) / 10
      : null;

    // Asistencia acumulada
    const totalAsist = asistencias.length;
    const presentes = asistencias.filter((a) => a.estado === 'PRESENTE').length;
    const pctAsistencia = totalAsist > 0 ? Math.round((presentes / totalAsist) * 100) : null;

    // Posición en curso (por promedio, si hay notas del curso)
    let posicionCurso: number | null = null;
    if (alumno?.cursoId && promedioGeneral !== null) {
      const compañeros = await this.db.alumno.findMany({
        where: { cursoId: alumno.cursoId, estadoMatricula: 'ACTIVA', id: { not: alumnoId } },
        select: { id: true },
      });
      const promediosCompañeros = await Promise.all(
        compañeros.slice(0, 40).map(async (c) => {
          const ns = await this.db.nota.findMany({ where: { alumnoId: c.id }, select: { valor: true } });
          const vals = ns.map((n) => Number(n.valor));
          return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        }),
      );
      const mejores = promediosCompañeros.filter((p) => p > promedioGeneral).length;
      posicionCurso = mejores + 1;
    }

    return {
      alumno,
      promedioGeneral,
      pctAsistencia,
      posicionCurso,
      totalAlumnos: alumno?.cursoId ? null : null,
      anotacionesRecientes: anotaciones.length,
    };
  }

  async responderMensaje(apoderadoId: string, mensajeId: string, respuesta: string) {
    const mensaje = await (this.db.mensajeIndividual as any).findFirst({
      where: { id: mensajeId, destinatarioId: apoderadoId },
    });

    if (!mensaje) throw new NotFoundException('Mensaje no encontrado');

    return (this.db.mensajeIndividual as any).update({
      where: { id: mensajeId },
      data: { respuesta, fechaRespuesta: new Date(), leido: true, fechaLectura: new Date() },
    });
  }
}
