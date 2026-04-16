import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { TenantService } from '../../prisma/tenant.service';
import { CreateMovimientoDto, MovimientoQueryDto, EERQueryDto } from './dto/movimientos.dto';
import { v4 as uuidv4 } from 'uuid';

// Categorías estándar del EER según Colegio San Andrés
const CATEGORIAS_INGRESOS = [
  'Subvención General',
  'SEP',
  'PIE',
  'Pro-Retención',
  'Mantención',
  'Otros Ingresos',
];

const CATEGORIAS_EGRESOS = [
  'Remuneraciones Personal',
  'Remuneraciones SEP',
  'Remuneraciones PIE',
  'Asesoría y Capacitación',
  'Recursos de Aprendizaje',
  'Infraestructura',
  'Administración',
  'Otros Egresos',
];

@Injectable()
export class MovimientosService {
  private readonly logger = new Logger(MovimientosService.name);

  constructor(private readonly tenantService: TenantService) {}

  private get db() { return this.tenantService.getClient(); }

  // ─── REGISTRAR MOVIMIENTO ─────────────────────────────────────

  async create(dto: CreateMovimientoDto, usuarioId: string) {
    if (dto.fondoId) {
      const fondo = await this.db.fondo.findUnique({ where: { id: dto.fondoId } });
      if (!fondo) throw new NotFoundException(`Fondo ${dto.fondoId} no encontrado`);
    }

    const movimiento = await this.db.$transaction(async (tx: any) => {
      const m = await tx.movimientoFinanciero.create({
        data: {
          tipo: dto.tipo,
          categoria: dto.categoria,
          subcategoria: dto.subcategoria ?? null,
          fondoId: dto.fondoId ?? null,
          monto: dto.monto,
          fecha: new Date(dto.fecha),
          mes: dto.mes,
          anio: dto.anio,
          descripcion: dto.descripcion ?? null,
          documentoTributarioId: dto.documentoTributarioId ?? null,
          numeroFactura: dto.numeroFactura ?? null,
          rutProveedor: dto.rutProveedor ?? null,
          fuenteDato: dto.fuenteDato ?? 'MANUAL',
        },
      });
      await tx.eventoAuditoria.create({
        data: {
          usuarioId,
          accion: 'CREATE',
          entidad: 'MovimientoFinanciero',
          entidadId: m.id,
          datosDespues: { tipo: dto.tipo, categoria: dto.categoria, monto: dto.monto } as object,
        },
      });
      return m;
    });

    return { data: movimiento };
  }

  // ─── LISTAR ───────────────────────────────────────────────────

  async findAll(query: MovimientoQueryDto) {
    const { fondoId, tipo, categoria, mes, anio, conciliado, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (fondoId) where['fondoId'] = fondoId;
    if (tipo) where['tipo'] = tipo;
    if (categoria) where['categoria'] = categoria;
    if (mes) where['mes'] = mes;
    if (anio) where['anio'] = anio;
    if (conciliado !== undefined) where['conciliado'] = conciliado;

    const [total, movimientos] = await Promise.all([
      this.db.movimientoFinanciero.count({ where }),
      this.db.movimientoFinanciero.findMany({
        where,
        skip,
        take: limit,
        include: { fondo: { select: { id: true, nombre: true } } },
        orderBy: [{ anio: 'desc' }, { mes: 'desc' }, { fecha: 'desc' }],
      }),
    ]);

    return {
      data: movimientos,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── EER: ESTADO DE RESULTADOS ────────────────────────────────

  async getEER(query: EERQueryDto) {
    const anio = query.anio ?? new Date().getFullYear();
    const mesDesde = query.mesDesde ?? 1;
    const mesHasta = query.mesHasta ?? 12;

    const movimientos = await this.db.movimientoFinanciero.findMany({
      where: { anio, mes: { gte: mesDesde, lte: mesHasta } },
      select: { tipo: true, categoria: true, monto: true, mes: true },
    });

    // Build monthly structure
    const meses: any[] = [];
    let saldoAcumulado = 0;

    for (let m = mesDesde; m <= mesHasta; m++) {
      const movsDelMes = movimientos.filter((mv: any) => mv.mes === m);

      // Ingresos
      const ingresosSubtotales: Record<string, number> = {};
      for (const cat of CATEGORIAS_INGRESOS) ingresosSubtotales[cat] = 0;

      // Egresos
      const egresosSubtotales: Record<string, number> = {};
      for (const cat of CATEGORIAS_EGRESOS) egresosSubtotales[cat] = 0;

      let totalIngresos = 0;
      let totalEgresos = 0;

      for (const mv of movsDelMes) {
        const monto = Number(mv.monto);
        if (mv.tipo === 'INGRESO') {
          if (ingresosSubtotales[mv.categoria] !== undefined) {
            ingresosSubtotales[mv.categoria] += monto;
          } else {
            ingresosSubtotales['Otros Ingresos'] = (ingresosSubtotales['Otros Ingresos'] ?? 0) + monto;
          }
          totalIngresos += monto;
        } else {
          if (egresosSubtotales[mv.categoria] !== undefined) {
            egresosSubtotales[mv.categoria] += monto;
          } else {
            egresosSubtotales['Otros Egresos'] = (egresosSubtotales['Otros Egresos'] ?? 0) + monto;
          }
          totalEgresos += monto;
        }
      }

      const resultado = totalIngresos - totalEgresos;
      const margen = totalIngresos > 0 ? (resultado / totalIngresos) * 100 : 0;
      saldoAcumulado += resultado;

      meses.push({
        mes: m,
        nombreMes: new Date(anio, m - 1, 1).toLocaleString('es-CL', { month: 'long' }),
        ingresos: {
          subtotales: ingresosSubtotales,
          total: Math.round(totalIngresos * 100) / 100,
        },
        egresos: {
          subtotales: egresosSubtotales,
          total: Math.round(totalEgresos * 100) / 100,
        },
        resultado: Math.round(resultado * 100) / 100,
        margen: Math.round(margen * 10) / 10,
        saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
      });
    }

    const totalIngresos = meses.reduce((s, m) => s + m.ingresos.total, 0);
    const totalEgresos = meses.reduce((s, m) => s + m.egresos.total, 0);
    const resultadoTotal = totalIngresos - totalEgresos;
    const margenTotal = totalIngresos > 0 ? (resultadoTotal / totalIngresos) * 100 : 0;

    return {
      data: {
        anio,
        rango: { mesDesde, mesHasta },
        meses,
        totales: {
          ingresos: Math.round(totalIngresos * 100) / 100,
          egresos: Math.round(totalEgresos * 100) / 100,
          resultadoEjercicio: Math.round(resultadoTotal * 100) / 100,
          margen: Math.round(margenTotal * 10) / 10,
          saldoAcumulado: Math.round(saldoAcumulado * 100) / 100,
        },
      },
    };
  }

  // ─── CATEGORÍAS DISPONIBLES ───────────────────────────────────

  getCategorias() {
    return {
      data: {
        ingresos: CATEGORIAS_INGRESOS,
        egresos: CATEGORIAS_EGRESOS,
      },
    };
  }
}
