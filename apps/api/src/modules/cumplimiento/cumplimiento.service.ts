import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantService } from '../../prisma/tenant.service';
import {
  CreateItemCumplimientoDto, UpdateItemCumplimientoDto,
  CreateFiscalizacionDto, UpdateFiscalizacionDto, ItemQueryDto,
} from './cumplimiento.dto';

@Injectable()
export class CumplimientoService {
  private readonly logger = new Logger(CumplimientoService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── Items de Cumplimiento ───────────────────────────────────
  async createItem(data: CreateItemCumplimientoDto) {
    return this.db.itemCumplimiento.create({
      data: {
        area: data.area as any,
        nombre: data.nombre,
        descripcion: data.descripcion,
        normativaReferencia: data.normativaReferencia,
        plazoLegal: data.plazoLegal ? new Date(data.plazoLegal) : undefined,
        responsableId: data.responsableId,
        observaciones: data.observaciones,
      },
    });
  }

  async findItems(query: ItemQueryDto) {
    const where: any = {};
    if (query.area) where.area = query.area;
    if (query.estado) where.estado = query.estado;
    const items = await this.db.itemCumplimiento.findMany({ where, orderBy: { plazoLegal: 'asc' } });
    return { data: items, total: items.length };
  }

  async updateItem(id: string, data: UpdateItemCumplimientoDto) {
    return this.db.itemCumplimiento.update({
      where: { id },
      data: {
        ...data,
        estado: data.estado as any,
      },
    });
  }

  async getResumen() {
    const items = await this.db.itemCumplimiento.findMany();
    const hoy = new Date();
    // Auto-mark vencidos
    const vencidos = items.filter(
      (i: any) => i.estado === 'PENDIENTE' && i.plazoLegal && new Date(i.plazoLegal) < hoy,
    );
    if (vencidos.length) {
      await this.db.itemCumplimiento.updateMany({
        where: { id: { in: vencidos.map((i: any) => i.id) } },
        data: { estado: 'VENCIDO' },
      });
    }
    const areas = ['ACADEMICA', 'FINANCIERA', 'LABORAL', 'CONVIVENCIA', 'INFRAESTRUCTURA'];
    const resumen = areas.map((area) => {
      const areaItems = items.filter((i: any) => i.area === area);
      return {
        area,
        total: areaItems.length,
        cumplidos: areaItems.filter((i: any) => i.estado === 'CUMPLIDO').length,
        pendientes: areaItems.filter((i: any) => i.estado === 'PENDIENTE').length,
        vencidos: areaItems.filter((i: any) => i.estado === 'VENCIDO').length,
        noAplica: areaItems.filter((i: any) => i.estado === 'NO_APLICA').length,
      };
    });
    const totalCumplidos = items.filter((i: any) => i.estado === 'CUMPLIDO').length;
    const totalAplicables = items.filter((i: any) => i.estado !== 'NO_APLICA').length;
    return {
      data: {
        resumenPorArea: resumen,
        porcentajeCumplimiento: totalAplicables > 0
          ? Math.round((totalCumplidos / totalAplicables) * 100)
          : 0,
        totalItems: items.length,
        totalCumplidos,
        totalVencidos: items.filter((i: any) => i.estado === 'VENCIDO').length,
      },
    };
  }

  // ─── Fiscalizaciones ─────────────────────────────────────────
  async createFiscalizacion(data: CreateFiscalizacionDto) {
    return this.db.fiscalizacion.create({
      data: {
        fecha: new Date(data.fecha),
        entidad: data.entidad,
        fiscalizador: data.fiscalizador,
        hallazgos: data.hallazgos,
        compromisos: data.compromisos,
        plazoSubsanacion: data.plazoSubsanacion ? new Date(data.plazoSubsanacion) : undefined,
        estadoSubsanacion: 'PENDIENTE',
      },
    });
  }

  async findFiscalizaciones() {
    const fiscalizaciones = await this.db.fiscalizacion.findMany({ orderBy: { fecha: 'desc' } });
    return { data: fiscalizaciones };
  }

  async updateFiscalizacion(id: string, data: UpdateFiscalizacionDto) {
    const updateData: any = { ...data };
    if (data.plazoSubsanacion) updateData.plazoSubsanacion = new Date(data.plazoSubsanacion);
    return this.db.fiscalizacion.update({ where: { id }, data: updateData });
  }

  // ─── Event Listeners ─────────────────────────────────────────
  @OnEvent('RENDICION_ENVIADA')
  async onRendicionEnviada(payload: any) {
    this.logger.log(`[Cumplimiento] RENDICION_ENVIADA: ${JSON.stringify(payload)}`);
    try {
      await this.db.itemCumplimiento.updateMany({
        where: { area: 'FINANCIERA', nombre: { contains: 'Rendición SEP' } },
        data: { estado: 'CUMPLIDO' },
      });
    } catch (e) {
      this.logger.warn('No se encontró item de rendición SEP para marcar cumplido');
    }
  }

  @OnEvent('PERIODO_CERRADO')
  async onPeriodoCerrado(payload: any) {
    this.logger.log(`[Cumplimiento] PERIODO_CERRADO: ${JSON.stringify(payload)}`);
  }

  @OnEvent('LECCIONARIO_FIRMADO')
  async onLeccionarioFirmado(payload: any) {
    this.logger.log(`[Cumplimiento] LECCIONARIO_FIRMADO: docente=${payload.docenteId}`);
  }
}
