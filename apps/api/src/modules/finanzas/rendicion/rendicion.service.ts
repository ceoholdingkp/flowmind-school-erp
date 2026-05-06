import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { TenantService } from '../../../prisma/tenant.service';
import { RegistrarMovimientoSupereducDto } from './dto/registrar-movimiento.dto';
import { GenerarRendicionSupereducDto } from './dto/generar-rendicion.dto';
import { SugerirCuentaDto } from './dto/sugerir-cuenta.dto';
import { RendicionSupereducValidator } from './rendicion.validator';

export interface Sugerencia {
  codigo: string;
  nombre: string;
  confianza: number;
  razon: string;
}

@Injectable()
export class RendicionSupereducService {
  private readonly logger = new Logger(RendicionSupereducService.name);
  private readonly anthropic: Anthropic | null;

  constructor(
    private readonly tenantService: TenantService,
    private readonly validator: RendicionSupereducValidator,
  ) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    this.anthropic = apiKey ? new Anthropic({ apiKey }) : null;
  }

  private get db() { return this.tenantService.getClient(); }

  // ── 1. Plan de cuentas ──────────────────────────────────────────

  async getCuentas(params: { tipo?: string; subvencion?: string; includeAgrupadoras?: boolean }) {
    const where: Record<string, unknown> = {};

    if (!params.includeAgrupadoras) {
      where['esAgrupadora'] = false;
    }
    if (params.tipo) {
      where['tipo'] = params.tipo;
    }

    let cuentas: any[];

    if (params.subvencion) {
      cuentas = await this.db.supereducCuenta.findMany({
        where: {
          ...where,
          subvenciones: { some: { subvencion: params.subvencion } },
        },
        include: {
          subvenciones: { select: { subvencion: true } },
          documentos: { select: { tipoDoc: true } },
        },
        orderBy: { codigo: 'asc' },
      });
    } else {
      cuentas = await this.db.supereducCuenta.findMany({
        where,
        include: {
          subvenciones: { select: { subvencion: true } },
          documentos: { select: { tipoDoc: true } },
        },
        orderBy: { codigo: 'asc' },
      });
    }

    return {
      data: cuentas,
      meta: { total: cuentas.length },
    };
  }

  async getCuenta(codigo: string) {
    const cuenta = await this.db.supereducCuenta.findUnique({
      where: { codigo },
      include: {
        subvenciones: { select: { subvencion: true } },
        documentos: { select: { tipoDoc: true } },
        padre: { select: { codigo: true, nombre: true } },
        hijas: { select: { codigo: true, nombre: true, tipo: true, esAgrupadora: true } },
      },
    });

    if (!cuenta) throw new NotFoundException(`Cuenta SuperEduc ${codigo} no encontrada`);

    return { data: cuenta };
  }

  // ── 2. Movimientos con cuenta SuperEduc ────────────────────────

  async registrarMovimiento(dto: RegistrarMovimientoSupereducDto, usuarioId: string) {
    const result = await this.validator.validarMovimiento(dto);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Validación SuperEduc fallida',
        errors: result.errors,
      });
    }

    const movimiento = await this.db.$transaction(async (tx: any) => {
      const m = await tx.movimientoFinanciero.create({
        data: {
          tipo: 'EGRESO',
          categoria: 'SuperEduc',
          subcategoria: dto.tipoDocumento,
          fondoId: dto.fondoId,
          supereducCuentaCodigo: dto.supereducCuentaCodigo,
          monto: dto.monto,
          fecha: new Date(dto.fecha),
          mes: dto.mes,
          anio: dto.anio,
          descripcion: dto.descripcion ?? null,
          numeroFactura: dto.numeroFactura ?? null,
          rutProveedor: dto.rutProveedor ?? null,
          fuenteDato: 'MANUAL',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'MovimientoSupereduc',
          entidadId: m.id,
          datosDespues: {
            cuentaCodigo: dto.supereducCuentaCodigo,
            subvencion: dto.subvencion,
            tipoDocumento: dto.tipoDocumento,
            monto: dto.monto,
          } as object,
        },
      });
      return m;
    });

    // Auto-track cuenta frecuente (non-blocking)
    if (dto.proveedorId) {
      this.db.proveedorCuentaFrecuente.upsert({
        where: { proveedorId_cuentaCodigo: { proveedorId: dto.proveedorId, cuentaCodigo: dto.supereducCuentaCodigo } },
        update: { frecuencia: { increment: 1 }, ultimoUso: new Date() },
        create: { proveedorId: dto.proveedorId, cuentaCodigo: dto.supereducCuentaCodigo, frecuencia: 1 },
      }).catch(e => this.logger.warn(`trackCuenta failed: ${e?.message}`));
    }

    return { data: movimiento };
  }

  async getMovimientos(params: { cuentaCodigo?: string; fondoId?: string; anio?: number; mes?: number }) {
    const where: Record<string, unknown> = {
      supereducCuentaCodigo: { not: null },
    };
    if (params.cuentaCodigo) where['supereducCuentaCodigo'] = params.cuentaCodigo;
    if (params.fondoId) where['fondoId'] = params.fondoId;
    if (params.anio) where['anio'] = params.anio;
    if (params.mes) where['mes'] = params.mes;

    const movimientos = await this.db.movimientoFinanciero.findMany({
      where,
      include: {
        supereducCuenta: { select: { codigo: true, nombre: true, tipo: true } },
        fondo: { select: { id: true, nombre: true } },
      },
      orderBy: { fecha: 'desc' },
    });

    return {
      data: movimientos,
      meta: { total: movimientos.length },
    };
  }

  // ── 3. Resumen por cuenta ──────────────────────────────────────

  async getResumen(params: { fondoId?: string; anio?: number; mesInicio?: number; mesFin?: number }) {
    const where: Record<string, unknown> = {
      supereducCuentaCodigo: { not: null },
    };
    if (params.fondoId) where['fondoId'] = params.fondoId;
    if (params.anio) where['anio'] = params.anio;
    if (params.mesInicio !== undefined && params.mesFin !== undefined) {
      where['mes'] = { gte: params.mesInicio, lte: params.mesFin };
    }

    const movimientos = await this.db.movimientoFinanciero.findMany({
      where,
      include: {
        supereducCuenta: { select: { codigo: true, nombre: true, tipo: true } },
      },
    });

    const resumenMap = new Map<string, { codigo: string; nombre: string; tipo: string; total: number; cantidad: number }>();
    for (const m of movimientos) {
      const cuenta = (m as any).supereducCuenta;
      if (!cuenta) continue;
      if (!resumenMap.has(cuenta.codigo)) {
        resumenMap.set(cuenta.codigo, { codigo: cuenta.codigo, nombre: cuenta.nombre, tipo: cuenta.tipo, total: 0, cantidad: 0 });
      }
      const entry = resumenMap.get(cuenta.codigo)!;
      entry.total += Number(m.monto);
      entry.cantidad++;
    }

    const resumen = Array.from(resumenMap.values()).sort((a, b) => a.codigo.localeCompare(b.codigo));

    return {
      data: resumen,
      meta: {
        totalCuentas: resumen.length,
        totalMonto: resumen.reduce((s, r) => s + r.total, 0),
      },
    };
  }

  // ── 4. Generar rendición ───────────────────────────────────────

  async generarRendicion(dto: GenerarRendicionSupereducDto, usuarioId: string) {
    const periodoResult = await this.validator.validarPeriodo(
      dto.fondoId,
      dto.mesInicio,
      dto.mesFin,
      dto.anio,
    );

    if (!periodoResult.valid) {
      throw new BadRequestException({
        message: 'Validación de periodo fallida',
        errors: periodoResult.errors,
      });
    }

    const movimientos = await this.db.movimientoFinanciero.findMany({
      where: {
        fondoId: dto.fondoId,
        supereducCuentaCodigo: { not: null },
        anio: dto.anio,
        mes: { gte: dto.mesInicio, lte: dto.mesFin },
      },
      include: {
        supereducCuenta: { select: { codigo: true, nombre: true, tipo: true } },
      },
      orderBy: [{ supereducCuentaCodigo: 'asc' }, { fecha: 'asc' }],
    });

    if (movimientos.length === 0) {
      throw new BadRequestException('No hay movimientos SuperEduc para el periodo indicado');
    }

    const lines: string[] = [
      'codigo_cuenta;nombre_cuenta;tipo_cuenta;fecha;monto;tipo_documento;descripcion;numero_factura;rut_proveedor',
    ];
    for (const m of movimientos) {
      const cuenta = (m as any).supereducCuenta;
      const fecha = new Date(m.fecha).toISOString().split('T')[0];
      lines.push([
        cuenta?.codigo ?? '',
        `"${(cuenta?.nombre ?? '').replace(/"/g, '""')}"`,
        cuenta?.tipo ?? '',
        fecha,
        Number(m.monto).toFixed(0),
        (m as any).subcategoria ?? '',
        `"${((m as any).descripcion ?? '').replace(/"/g, '""')}"`,
        (m as any).numeroFactura ?? '',
        (m as any).rutProveedor ?? '',
      ].join(';'));
    }

    return {
      data: {
        csv: lines.join('\n'),
        periodo: `${dto.anio}-${String(dto.mesInicio).padStart(2, '0')} al ${dto.anio}-${String(dto.mesFin).padStart(2, '0')}`,
        fondoId: dto.fondoId,
        subvencion: dto.subvencion,
        totalMovimientos: movimientos.length,
        totalMonto: movimientos.reduce((s, m) => s + Number(m.monto), 0),
      },
    };
  }

  // ── 5. Validar periodo ─────────────────────────────────────────

  async validarPeriodo(dto: GenerarRendicionSupereducDto) {
    const result = await this.validator.validarPeriodo(
      dto.fondoId,
      dto.mesInicio,
      dto.mesFin,
      dto.anio,
    );
    return { data: result };
  }

  // ── 6. Sugerir cuenta con IA ───────────────────────────────────

  async sugerirCuenta(dto: SugerirCuentaDto): Promise<{ data: { sugerencias: Sugerencia[]; topSugerencia: string | null } }> {
    const empty = { data: { sugerencias: [], topSugerencia: null } };

    if (!this.anthropic) {
      this.logger.warn('ANTHROPIC_API_KEY no configurada — sugerencia IA deshabilitada');
      return empty;
    }

    // Load all operativas
    const cuentas = await this.db.supereducCuenta.findMany({
      where: { esAgrupadora: false },
      select: { codigo: true, nombre: true },
      orderBy: { codigo: 'asc' },
    });

    // Load proveedor + cuentas frecuentes if provided
    let proveedorInfo = '';
    let frecuentesInfo = '';
    if (dto.proveedorId) {
      const proveedor = await this.db.proveedor.findUnique({
        where: { id: dto.proveedorId },
        select: { razonSocial: true, giro: true },
      });
      if (proveedor) {
        proveedorInfo = `${proveedor.razonSocial}${proveedor.giro ? ` (${proveedor.giro})` : ''}`;
      }

      const frecuentes = await this.db.proveedorCuentaFrecuente.findMany({
        where: { proveedorId: dto.proveedorId },
        include: { cuenta: { select: { codigo: true, nombre: true } } },
        orderBy: { frecuencia: 'desc' },
        take: 5,
      });
      if (frecuentes.length > 0) {
        frecuentesInfo = frecuentes
          .map(f => `${f.cuenta.codigo} ${f.cuenta.nombre} (${f.frecuencia} veces)`)
          .join(', ');
      }
    }

    const catalogo = cuentas.map(c => `${c.codigo}: ${c.nombre}`).join('\n');

    const prompt = `Eres un experto en contabilidad escolar chilena y el plan de cuentas SuperEduc 2026.

Dado este gasto:
Descripción: ${dto.glosa}
${proveedorInfo ? `Proveedor: ${proveedorInfo}` : ''}
${frecuentesInfo ? `Cuentas frecuentes de este proveedor: ${frecuentesInfo}` : ''}

Sugiere las 3 cuentas más probables del siguiente catálogo:
${catalogo}

Responde SOLO en JSON válido, sin texto adicional, así:
[
  {"codigo": "410120", "confianza": 95, "razon": "Materiales de oficina corresponde a Otros Gastos Generales"},
  {"codigo": "410115", "confianza": 60, "razon": "Podría ser Material Didáctico si es para uso en aula"}
]`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      });

      const text = message.content[0].type === 'text' ? message.content[0].text : '';

      // Extract JSON array from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return empty;

      const raw: { codigo: string; confianza: number; razon: string }[] = JSON.parse(jsonMatch[0]);

      // Enrich with nombre from loaded cuentas
      const cuentaMap = new Map(cuentas.map(c => [c.codigo, c.nombre]));
      const sugerencias: Sugerencia[] = raw
        .filter(r => r.codigo && cuentaMap.has(r.codigo))
        .map(r => ({
          codigo: r.codigo,
          nombre: cuentaMap.get(r.codigo) ?? '',
          confianza: Math.min(100, Math.max(0, Number(r.confianza) || 0)),
          razon: r.razon ?? '',
        }));

      const topSugerencia = sugerencias.length > 0 ? sugerencias[0].codigo : null;

      return { data: { sugerencias, topSugerencia } };
    } catch (e: any) {
      this.logger.warn(`sugerirCuenta IA error: ${e?.message}`);
      return empty;
    }
  }
}
