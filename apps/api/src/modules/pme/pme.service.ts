import { Injectable, BadRequestException } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { EventBusService } from '../../events/event-bus.service';
import { CreatePMEDto, UpdatePMEDto, CreateAccionPMEDto, UpdateAccionPMEDto, AprobarPMEDto } from './pme.dto';

@Injectable()
export class PMEService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly eventBus: EventBusService,
  ) {}

  private get db() { return this.tenantService.getClient(); }

  async create(data: CreatePMEDto) {
    return this.db.pME.create({ data: { anio: data.anio } });
  }

  async findAll() {
    const pmes = await this.db.pME.findMany({
      include: { acciones: true },
      orderBy: { anio: 'desc' },
    });
    return { data: pmes };
  }

  async findOne(id: string) {
    return this.db.pME.findUniqueOrThrow({
      where: { id },
      include: { acciones: { orderBy: { createdAt: 'asc' } } },
    });
  }

  async aprobar(id: string, data: AprobarPMEDto) {
    const pme = await this.db.pME.findUniqueOrThrow({ where: { id } });
    if (pme.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se puede aprobar un PME en estado BORRADOR');
    }
    const updated = await this.db.pME.update({
      where: { id },
      data: { estado: 'APROBADO', aprobadoPor: data.aprobadoPor, fechaAprobacion: new Date() },
      include: { acciones: true },
    });
    await this.eventBus.publish({
      type: 'PME_APROBADO',
      payload: { pmeId: id, anio: pme.anio, aprobadoPor: data.aprobadoPor } as any,
    } as any);
    return updated;
  }

  async updateEstado(id: string, data: UpdatePMEDto) {
    return this.db.pME.update({ where: { id }, data: { ...data, estado: data.estado as any } });
  }

  // Acciones
  async createAccion(pmeId: string, data: CreateAccionPMEDto) {
    return this.db.accionPME.create({
      data: {
        pmeId,
        dimension: data.dimension,
        objetivo: data.objetivo,
        meta: data.meta,
        indicador: data.indicador,
        descripcion: data.descripcion,
        responsableId: data.responsableId,
        fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : undefined,
        fechaFin: data.fechaFin ? new Date(data.fechaFin) : undefined,
        presupuesto: data.presupuesto,
        fondoId: data.fondoId,
      },
    });
  }

  async updateAccion(accionId: string, data: UpdateAccionPMEDto) {
    const updateData: any = { ...data };
    if (data.fechaInicio) updateData.fechaInicio = new Date(data.fechaInicio);
    if (data.fechaFin) updateData.fechaFin = new Date(data.fechaFin);
    return this.db.accionPME.update({ where: { id: accionId }, data: updateData });
  }

  async removeAccion(accionId: string) {
    await this.db.accionPME.delete({ where: { id: accionId } });
    return { message: 'Acción eliminada' };
  }

  async getResumenPorDimension(pmeId: string) {
    const acciones = await this.db.accionPME.findMany({ where: { pmeId } });
    const dimensiones = ['Gestion Pedagogica', 'Liderazgo', 'Convivencia', 'Gestion Recursos'];
    const resumen = dimensiones.map((dim) => {
      const acc = acciones.filter((a: any) => a.dimension === dim);
      const avancePromedio = acc.length
        ? acc.reduce((s: number, a: any) => s + Number(a.porcentajeAvance), 0) / acc.length
        : 0;
      return {
        dimension: dim,
        total: acc.length,
        completadas: acc.filter((a: any) => a.estado === 'COMPLETADA').length,
        enCurso: acc.filter((a: any) => a.estado === 'EN_CURSO').length,
        pendientes: acc.filter((a: any) => a.estado === 'PENDIENTE').length,
        avancePromedio: Math.round(avancePromedio * 10) / 10,
      };
    });
    return { data: resumen };
  }
}
