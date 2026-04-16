import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { InitConciliacionDto, ConciliacionQueryDto } from './dto/conciliacion.dto';
import * as xlsx from 'xlsx';

interface MovBanco {
  fecha: Date;
  descripcion: string;
  monto: number;
  tipo: 'INGRESO' | 'EGRESO';
}

@Injectable()
export class ConciliacionService {
  private readonly logger = new Logger(ConciliacionService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── IMPORTAR CARTOLA (Excel/CSV) ─────────────────────────────

  async importarCartola(
    dto: InitConciliacionDto,
    buffer: Buffer,
    originalname: string,
    usuarioId: string,
  ) {
    // Parse Excel/CSV
    const wb = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows: any[] = xlsx.utils.sheet_to_json(ws, { defval: null });

    if (rows.length === 0) throw new BadRequestException('El archivo no contiene datos');

    // Normalize column names (case-insensitive, allow variations)
    const normalize = (row: any): MovBanco | null => {
      const keys = Object.keys(row).map((k) => k.toLowerCase().replace(/\s+/g, '_'));
      const get = (variants: string[]) => {
        for (const v of variants) {
          const idx = keys.findIndex((k) => k.includes(v));
          if (idx >= 0) return Object.values(row)[idx];
        }
        return null;
      };

      const rawFecha = get(['fecha', 'date']);
      const rawMonto = get(['monto', 'importe', 'amount', 'valor']);
      const desc = get(['descripcion', 'glosa', 'detalle', 'concepto', 'description']) ?? '';
      const rawTipo = get(['tipo', 'type', 'mov', 'movimiento']);

      if (!rawFecha || rawMonto === null) return null;

      const monto = Math.abs(Number(rawMonto));
      let tipo: 'INGRESO' | 'EGRESO' = Number(rawMonto) >= 0 ? 'INGRESO' : 'EGRESO';
      if (rawTipo) {
        const t = String(rawTipo).toUpperCase();
        if (t.includes('EGRESO') || t.includes('CARGO') || t.includes('DEBITO') || t.includes('GASTO')) tipo = 'EGRESO';
        else if (t.includes('INGRESO') || t.includes('ABONO') || t.includes('CREDITO')) tipo = 'INGRESO';
      }

      const fecha = rawFecha instanceof Date ? rawFecha : new Date(String(rawFecha));
      if (isNaN(fecha.getTime())) return null;

      return { fecha, descripcion: String(desc), monto, tipo };
    };

    const movsBanco: MovBanco[] = rows.map(normalize).filter(Boolean) as MovBanco[];
    if (movsBanco.length === 0) throw new BadRequestException('No se pudo parsear ninguna fila del archivo');

    // Match with existing movements in ERP
    const inicioMes = new Date(dto.anio, dto.mes - 1, 1);
    const finMes = new Date(dto.anio, dto.mes, 0, 23, 59, 59, 999);

    const movsERP = await this.db.movimientoFinanciero.findMany({
      where: { fecha: { gte: inicioMes, lte: finMes }, conciliado: false },
      select: { id: true, monto: true, fecha: true, tipo: true, descripcion: true },
    });

    const detalles: any[] = [];
    let conciliados = 0;
    let pendientes = 0;
    const idsAConciliar: string[] = [];

    for (const movBanco of movsBanco) {
      // Match: same tipo + monto (±0.01) + fecha (±1 day)
      const match = movsERP.find((erp: any) => {
        if (erp.tipo !== movBanco.tipo) return false;
        if (Math.abs(Number(erp.monto) - movBanco.monto) > 0.01) return false;
        const diff = Math.abs(new Date(erp.fecha).getTime() - movBanco.fecha.getTime());
        return diff <= 86400000; // 1 day in ms
      });

      if (match) {
        conciliados++;
        idsAConciliar.push(match.id);
        detalles.push({
          movBanco: { fecha: movBanco.fecha, monto: movBanco.monto, tipo: movBanco.tipo, descripcion: movBanco.descripcion },
          movERP: { id: match.id, monto: Number(match.monto), fecha: match.fecha },
          estado: 'CONCILIADO',
        });
      } else {
        pendientes++;
        detalles.push({
          movBanco: { fecha: movBanco.fecha, monto: movBanco.monto, tipo: movBanco.tipo, descripcion: movBanco.descripcion },
          movERP: null,
          estado: 'PENDIENTE',
        });
      }
    }

    // Mark matched movements as conciliado in DB
    const conciliacion = await this.db.$transaction(async (tx: any) => {
      const c = await tx.conciliacion.create({
        data: {
          cuentaBancaria: dto.cuentaBancaria,
          mes: dto.mes,
          anio: dto.anio,
          archivoOriginal: originalname,
          totalMovBanco: movsBanco.length,
          totalConciliados: conciliados,
          totalPendientes: pendientes,
          diferencia: pendientes > 0 ? movsBanco.filter((_, i) => detalles[i].estado === 'PENDIENTE').reduce((s, m) => s + m.monto, 0) : 0,
          estado: pendientes === 0 ? 'COMPLETADA' : 'EN_PROCESO',
          realizadaPor: usuarioId,
          fechaConciliacion: new Date(),
          detalles,
        },
      });

      if (idsAConciliar.length > 0) {
        await tx.movimientoFinanciero.updateMany({
          where: { id: { in: idsAConciliar } },
          data: { conciliado: true, conciliacionId: c.id },
        });
      }

      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'Conciliacion',
          entidadId: c.id,
          datosDespues: { mes: dto.mes, anio: dto.anio, totalConciliados: conciliados } as object,
        },
      });

      return c;
    });

    this.logger.log(
      `Conciliación ${dto.mes}/${dto.anio}: ${conciliados}/${movsBanco.length} conciliados`,
    );

    return {
      data: {
        conciliacionId: conciliacion.id,
        cuentaBancaria: dto.cuentaBancaria,
        periodo: { mes: dto.mes, anio: dto.anio },
        totalMovBanco: movsBanco.length,
        conciliados,
        pendientes,
        estado: conciliacion.estado,
        detalles,
      },
    };
  }

  // ─── LISTAR CONCILIACIONES ────────────────────────────────────

  async findAll(query: ConciliacionQueryDto) {
    const where: Record<string, unknown> = {};
    if (query.cuentaBancaria) where['cuentaBancaria'] = query.cuentaBancaria;
    if (query.mes) where['mes'] = query.mes;
    if (query.anio) where['anio'] = query.anio;

    const conciliaciones = await this.db.conciliacion.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
    });

    return { data: conciliaciones };
  }

  // ─── VER UNA ──────────────────────────────────────────────────

  async findOne(id: string) {
    const c = await this.db.conciliacion.findUnique({ where: { id } });
    if (!c) throw new NotFoundException(`Conciliación ${id} no encontrada`);
    return { data: c };
  }
}
