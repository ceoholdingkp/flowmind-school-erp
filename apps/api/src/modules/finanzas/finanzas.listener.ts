import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TenantService } from '../../prisma/tenant.service';

@Injectable()
export class FinanzasListener {
  private readonly logger = new Logger(FinanzasListener.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── ALUMNO_MATRICULADO: crear plan de pago base ───────────────

  @OnEvent('ALUMNO_MATRICULADO')
  async onAlumnoMatriculado(event: any) {
    try {
      this.logger.log(
        `[Finanzas] ALUMNO_MATRICULADO recibido: ${event.payload.run} — plan de pago por configurar`,
      );
      // En una implementación completa se generarían las cuotas del año escolar
      // según la configuración de aranceles del establecimiento.
      // Por ahora se registra el evento para trazabilidad.
    } catch (err: any) {
      this.logger.error(`[Finanzas] Error procesando ALUMNO_MATRICULADO: ${err.message}`);
    }
  }

  // ─── LIQUIDACION_GENERADA: asiento contable ────────────────────

  @OnEvent('LIQUIDACION_GENERADA')
  async onLiquidacionGenerada(event: any) {
    try {
      const payload = event.payload;
      this.logger.log(
        `[Finanzas] LIQUIDACION_GENERADA: ${payload.nombreFuncionario} ` +
        `liquidoAPago=${payload.liquidoAPago} mes=${payload.mes}/${payload.anio}`,
      );

      // Registrar movimiento de egreso por remuneración
      for (const imputacion of payload.fondoImputacion ?? []) {
        await this.db.movimientoFinanciero.create({
          data: {
            tipo: 'EGRESO',
            categoria: 'Remuneraciones Personal',
            subcategoria: 'Liquidación',
            fondoId: imputacion.fondoId,
            monto: imputacion.monto,
            fecha: new Date(),
            mes: payload.mes,
            anio: payload.anio,
            descripcion: `Liquidación ${payload.mes}/${payload.anio} — ${payload.nombreFuncionario}`,
            fuenteDato: 'MANUAL',
          },
        }).catch((e: any) => this.logger.error(`Error registrando movimiento remuneración: ${e.message}`));
      }
    } catch (err: any) {
      this.logger.error(`[Finanzas] Error procesando LIQUIDACION_GENERADA: ${err.message}`);
    }
  }
}
