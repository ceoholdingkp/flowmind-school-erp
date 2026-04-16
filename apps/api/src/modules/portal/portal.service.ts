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
}
