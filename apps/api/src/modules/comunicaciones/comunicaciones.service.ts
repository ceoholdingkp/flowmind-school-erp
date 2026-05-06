import { Injectable } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { CreateComunicadoDto, UpdateComunicadoDto, CreateMensajeDto, ComunicadoQueryDto } from './dto/comunicaciones.dto';

@Injectable()
export class ComunicacionesService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() {
    return this.tenantService.getClient();
  }

  async getComunicados(query: ComunicadoQueryDto) {
    const where: any = {};
    if (query.tipo) where.tipo = query.tipo;
    if (query.estado) where.estado = query.estado;
    if (query.mes && query.anio) {
      const mes = parseInt(query.mes);
      const anio = parseInt(query.anio);
      where.fechaEnvio = {
        gte: new Date(anio, mes - 1, 1),
        lt: new Date(anio, mes, 1),
      };
    }

    const comunicados = await (this.db.comunicado as any).findMany({
      where,
      include: {
        curso: { select: { nombre: true, nivel: true } },
        _count: { select: { lecturas: true } },
      },
      orderBy: { fechaEnvio: 'desc' },
    });

    return comunicados.map((c: any) => ({
      ...c,
      totalDestinatarios: c._count.lecturas,
      _count: undefined,
    }));
  }

  async getComunicado(id: string) {
    const comunicado = await (this.db.comunicado as any).findUnique({
      where: { id },
      include: {
        curso: { select: { nombre: true, nivel: true } },
        lecturas: {
          include: {
            apoderado: { select: { id: true, nombre: true, apellidos: true, email: true } },
          },
          orderBy: { apoderado: { apellidos: 'asc' } },
        },
      },
    });
    return comunicado;
  }

  async createComunicado(dto: CreateComunicadoDto, enviadoPor: string) {
    const comunicado = await (this.db.comunicado as any).create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        tipo: dto.tipo,
        prioridad: dto.prioridad ?? 'NORMAL',
        destinatarios: dto.destinatarios,
        cursoId: dto.cursoId ?? null,
        enviadoPor,
        fechaExpiracion: dto.fechaExpiracion ? new Date(dto.fechaExpiracion) : null,
        adjuntoUrl: dto.adjuntoUrl ?? null,
      },
    });

    // Crear lecturas en bulk según destinatarios
    await this.crearLecturasBulk(comunicado.id, dto.destinatarios, dto.cursoId);

    return comunicado;
  }

  private async crearLecturasBulk(comunicadoId: string, destinatarios: string, cursoId?: string) {
    let apoderadoIds: string[] = [];

    if (destinatarios === 'TODOS') {
      const apoderados = await (this.db.apoderado as any).findMany({
        select: { id: true },
      });
      apoderadoIds = apoderados.map((a: any) => a.id);
    } else if (destinatarios === 'CURSO' && cursoId) {
      const alumnos = await (this.db.alumno as any).findMany({
        where: { cursoId, estadoMatricula: 'ACTIVA' },
        select: { apoderadoId: true },
      });
      const ids = alumnos
        .map((a: any) => a.apoderadoId)
        .filter((id: string | null) => id !== null) as string[];
      apoderadoIds = [...new Set(ids)];
    } else if (destinatarios === 'NIVEL' && cursoId) {
      const cursoRef = await (this.db.curso as any).findUnique({
        where: { id: cursoId },
        select: { nivel: true },
      });
      if (cursoRef) {
        const cursosNivel = await (this.db.curso as any).findMany({
          where: { nivel: cursoRef.nivel },
          select: { id: true },
        });
        const cursoIds = cursosNivel.map((c: any) => c.id);
        const alumnos = await (this.db.alumno as any).findMany({
          where: { cursoId: { in: cursoIds }, estadoMatricula: 'ACTIVA' },
          select: { apoderadoId: true },
        });
        const ids = alumnos
          .map((a: any) => a.apoderadoId)
          .filter((id: string | null) => id !== null) as string[];
        apoderadoIds = [...new Set(ids)];
      }
    }

    if (apoderadoIds.length > 0) {
      await (this.db.lecturaComunicado as any).createMany({
        data: apoderadoIds.map((apoderadoId) => ({
          comunicadoId,
          apoderadoId,
        })),
        skipDuplicates: true,
      });
    }
  }

  async updateComunicado(id: string, dto: UpdateComunicadoDto) {
    return (this.db.comunicado as any).update({
      where: { id },
      data: {
        ...(dto.titulo && { titulo: dto.titulo }),
        ...(dto.contenido && { contenido: dto.contenido }),
        ...(dto.estado && { estado: dto.estado }),
        ...(dto.fechaExpiracion && { fechaExpiracion: new Date(dto.fechaExpiracion) }),
      },
    });
  }

  async marcarLeido(comunicadoId: string, apoderadoId: string) {
    return (this.db.lecturaComunicado as any).upsert({
      where: { comunicadoId_apoderadoId: { comunicadoId, apoderadoId } },
      update: { leido: true, fechaLectura: new Date() },
      create: { comunicadoId, apoderadoId, leido: true, fechaLectura: new Date() },
    });
  }

  async confirmarLectura(comunicadoId: string, apoderadoId: string) {
    return (this.db.lecturaComunicado as any).upsert({
      where: { comunicadoId_apoderadoId: { comunicadoId, apoderadoId } },
      update: { leido: true, fechaLectura: new Date(), confirmado: true, fechaConfirmacion: new Date() },
      create: {
        comunicadoId,
        apoderadoId,
        leido: true,
        fechaLectura: new Date(),
        confirmado: true,
        fechaConfirmacion: new Date(),
      },
    });
  }

  async getEstadisticasLectura(comunicadoId: string) {
    const lecturas = await (this.db.lecturaComunicado as any).findMany({
      where: { comunicadoId },
    });
    const total = lecturas.length;
    const leidos = lecturas.filter((l: any) => l.leido).length;
    const confirmados = lecturas.filter((l: any) => l.confirmado).length;
    return {
      total,
      leidos,
      noLeidos: total - leidos,
      confirmados,
      porcentajeLeido: total > 0 ? Math.round((leidos / total) * 100) : 0,
      porcentajeConfirmado: total > 0 ? Math.round((confirmados / total) * 100) : 0,
    };
  }

  async getResumenMes(mes: number, anio: number) {
    const inicio = new Date(anio, mes - 1, 1);
    const fin = new Date(anio, mes, 1);

    const comunicados = await (this.db.comunicado as any).findMany({
      where: { fechaEnvio: { gte: inicio, lt: fin } },
      include: { _count: { select: { lecturas: true } } },
    });

    const total = comunicados.length;
    const totalLecturas = comunicados.reduce((acc: number, c: any) => acc + c._count.lecturas, 0);

    let leidosCount = 0;
    let totalDestinatarios = 0;
    if (total > 0) {
      const stats = await (this.db.lecturaComunicado as any).aggregate({
        where: {
          comunicado: { fechaEnvio: { gte: inicio, lt: fin } },
        },
        _count: { id: true },
      });
      const leidosStats = await (this.db.lecturaComunicado as any).count({
        where: {
          leido: true,
          comunicado: { fechaEnvio: { gte: inicio, lt: fin } },
        },
      });
      totalDestinatarios = stats._count.id;
      leidosCount = leidosStats;
    }

    return {
      totalEnviados: total,
      totalDestinatarios,
      totalLeidos: leidosCount,
      porcentajeLeido: totalDestinatarios > 0 ? Math.round((leidosCount / totalDestinatarios) * 100) : 0,
    };
  }

  // Mensajes individuales
  async getMensajes(userId: string) {
    return (this.db.mensajeIndividual as any).findMany({
      where: { destinatarioId: userId },
      include: {
        alumno: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getMensajesEnviados(userId: string) {
    return (this.db.mensajeIndividual as any).findMany({
      where: { remitente: userId },
      include: {
        alumno: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createMensaje(dto: CreateMensajeDto, remitente: string) {
    return (this.db.mensajeIndividual as any).create({
      data: {
        alumnoId: dto.alumnoId,
        remitente,
        destinatarioId: dto.destinatarioId,
        asunto: dto.asunto,
        contenido: dto.contenido,
      },
    });
  }

  async marcarMensajeLeido(id: string) {
    return (this.db.mensajeIndividual as any).update({
      where: { id },
      data: { leido: true, fechaLectura: new Date() },
    });
  }

  // Portal apoderado
  async getComunicadosApoderado(apoderadoId: string) {
    const lecturas = await (this.db.lecturaComunicado as any).findMany({
      where: { apoderadoId },
      include: {
        comunicado: {
          include: {
            curso: { select: { nombre: true, nivel: true } },
          },
        },
      },
      orderBy: { comunicado: { fechaEnvio: 'desc' } },
    });

    return lecturas.map((l: any) => ({
      ...l.comunicado,
      leido: l.leido,
      fechaLectura: l.fechaLectura,
      confirmado: l.confirmado,
      lecturaId: l.id,
    }));
  }

  async getMensajesApoderado(apoderadoId: string) {
    return (this.db.mensajeIndividual as any).findMany({
      where: { destinatarioId: apoderadoId },
      include: {
        alumno: { select: { nombre: true, apellidos: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
