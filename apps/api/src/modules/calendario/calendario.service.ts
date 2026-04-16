import { Injectable } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { CreateEventoDto, UpdateEventoDto, EventoQueryDto } from './calendario.dto';

@Injectable()
export class CalendarioService {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  private async getEstablecimientoId(): Promise<string> {
    const est = await this.db.establecimiento.findFirst({ select: { id: true } });
    if (!est) throw new Error('No existe establecimiento configurado');
    return est.id;
  }

  async create(data: CreateEventoDto, usuarioId: string) {
    const establecimientoId = await this.getEstablecimientoId();
    return this.db.evento.create({
      data: {
        titulo: data.titulo,
        descripcion: data.descripcion,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
        categoria: data.categoria,
        recurrencia: data.recurrencia ?? 'ninguna',
        audiencia: data.audiencia ?? 'todos',
        ubicacion: data.ubicacion,
        color: data.color,
        establecimientoId,
        creadoPor: usuarioId,
      },
    });
  }

  async findAll(query: EventoQueryDto) {
    const establecimientoId = await this.getEstablecimientoId();
    const where: any = { establecimientoId };
    if (query.categoria) where.categoria = query.categoria;
    if (query.audiencia) where.audiencia = query.audiencia;
    if (query.desde || query.hasta) {
      where.fechaInicio = {};
      if (query.desde) where.fechaInicio.gte = new Date(query.desde);
      if (query.hasta) where.fechaInicio.lte = new Date(query.hasta);
    }
    const eventos = await this.db.evento.findMany({
      where,
      orderBy: { fechaInicio: 'asc' },
    });
    return { data: eventos, total: eventos.length };
  }

  async findOne(id: string) {
    return this.db.evento.findUniqueOrThrow({ where: { id } });
  }

  async update(id: string, data: UpdateEventoDto) {
    const updateData: any = { ...data };
    if (data.fechaInicio) updateData.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaFin) updateData.fechaFin = new Date(data.fechaFin);
    return this.db.evento.update({ where: { id }, data: updateData });
  }

  async remove(id: string) {
    await this.db.evento.delete({ where: { id } });
    return { message: 'Evento eliminado' };
  }

  async getProximos(dias = 30) {
    const establecimientoId = await this.getEstablecimientoId();
    const desde = new Date();
    const hasta = new Date();
    hasta.setDate(hasta.getDate() + dias);
    const eventos = await this.db.evento.findMany({
      where: { establecimientoId, fechaInicio: { gte: desde, lte: hasta } },
      orderBy: { fechaInicio: 'asc' },
    });
    return { data: eventos, total: eventos.length };
  }
}
