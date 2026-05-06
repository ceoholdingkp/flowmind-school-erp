import { Injectable } from '@nestjs/common';
import { TenantService } from '../../../prisma/tenant.service';
import { RegistrarMovimientoSupereducDto } from './dto/registrar-movimiento.dto';

export interface ValidationError {
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class RendicionSupereducValidator {
  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ── Validaciones por movimiento ─────────────────────────────────

  async validarMovimiento(dto: RegistrarMovimientoSupereducDto): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // R004: monto debe ser mayor a 0
    if (dto.monto <= 0) {
      errors.push({ code: 'R004', message: 'El monto debe ser mayor a 0' });
    }

    // R005: fecha no puede ser futura
    const fecha = new Date(dto.fecha);
    const hoy = new Date();
    hoy.setHours(23, 59, 59, 999);
    if (fecha > hoy) {
      errors.push({ code: 'R005', message: 'La fecha del movimiento no puede ser futura' });
    }

    // R006: fondo debe existir
    const fondo = await this.db.fondo.findUnique({ where: { id: dto.fondoId } });
    if (!fondo) {
      errors.push({ code: 'R006', message: `Fondo ${dto.fondoId} no encontrado` });
    }

    // R001: cuenta debe existir y ser operativa (no agrupadora)
    const cuenta = await this.db.supereducCuenta.findUnique({
      where: { codigo: dto.supereducCuentaCodigo },
      include: {
        subvenciones: true,
        documentos: true,
      },
    });

    if (!cuenta) {
      errors.push({ code: 'R001', message: `Cuenta SuperEduc ${dto.supereducCuentaCodigo} no encontrada en el plan de cuentas` });
      return { valid: false, errors };
    }

    if (cuenta.esAgrupadora) {
      errors.push({
        code: 'R001',
        message: `Cuenta ${dto.supereducCuentaCodigo} es agrupadora; no se pueden registrar movimientos en cuentas agrupadoras`,
      });
    }

    // R002: subvención debe estar habilitada para la cuenta
    const subvHabilitada = cuenta.subvenciones.some(s => s.subvencion === dto.subvencion);
    if (!subvHabilitada) {
      const habilitadas = cuenta.subvenciones.map(s => s.subvencion).join(', ');
      errors.push({
        code: 'R002',
        message: `Subvención "${dto.subvencion}" no está habilitada para cuenta ${dto.supereducCuentaCodigo}. Habilitadas: [${habilitadas || 'ninguna'}]`,
      });
    }

    // R003: tipo de documento debe estar habilitado para la cuenta
    const docHabilitado = cuenta.documentos.some(d => d.tipoDoc === dto.tipoDocumento);
    if (!docHabilitado) {
      const habilitados = cuenta.documentos.map(d => d.tipoDoc).join(', ');
      errors.push({
        code: 'R003',
        message: `Tipo de documento "${dto.tipoDocumento}" no está habilitado para cuenta ${dto.supereducCuentaCodigo}. Habilitados: [${habilitados || 'ninguno'}]`,
      });
    }

    return { valid: errors.length === 0, errors };
  }

  // ── Validaciones de periodo para generar rendición ──────────────

  async validarPeriodo(fondoId: string, mesInicio: number, mesFin: number, anio: number): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    if (mesInicio > mesFin) {
      errors.push({ code: 'R007', message: 'mesInicio no puede ser mayor a mesFin' });
      return { valid: false, errors };
    }

    // R009: no puede existir una rendición ya enviada que solape este periodo
    const rendicionExistente = await this.db.rendicion.findFirst({
      where: {
        fondoId,
        anio,
        mesInicio: { lte: mesFin },
        mesFin: { gte: mesInicio },
        estado: { in: ['ENVIADA_SUPEREDUC', 'APROBADA_SUPEREDUC'] },
      },
    });

    if (rendicionExistente) {
      errors.push({
        code: 'R009',
        message: `Ya existe una rendición enviada/aprobada en SuperEduc que solapa este periodo (id: ${rendicionExistente.id}, estado: ${rendicionExistente.estado})`,
      });
    }

    return { valid: errors.length === 0, errors };
  }
}
