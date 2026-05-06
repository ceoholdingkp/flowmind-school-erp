import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RemuneracionesService, calcularLiquidacion, TOPE_IMPONIBLE, TASA_SALUD_FONASA } from './remuneraciones.service';

const createMockDb = () => ({
  liquidacionSueldo: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  funcionario: {
    findMany: vi.fn(),
  },
  configuracionPrevisional: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

describe('calcularLiquidacion (función pura)', () => {
  it('calcula monto AFP correctamente con tasa 11.44%', () => {
    const result = calcularLiquidacion(1_000_000, 0, 0, 0, 0, 0, 11.44, 'FONASA', 7);
    expect(result.montoAfp).toBe(Math.round(1_000_000 * 0.1144));
  });

  it('aplica tope imponible AFP cuando sueldo supera tope', () => {
    const sueldoAlto = TOPE_IMPONIBLE + 500_000;
    const result = calcularLiquidacion(sueldoAlto, 0, 0, 0, 0, 0, 11.44, 'FONASA', 7);
    expect(result.montoAfp).toBe(Math.round(TOPE_IMPONIBLE * 0.1144));
  });

  it('descuento salud FONASA es 7% del total haberes', () => {
    const result = calcularLiquidacion(1_000_000, 0, 0, 0, 0, 0, 11.44, 'FONASA', TASA_SALUD_FONASA);
    expect(result.montoSalud).toBe(Math.round(1_000_000 * 0.07));
  });

  it('sueldo líquido = totalHaberes - totalDescuentos', () => {
    const result = calcularLiquidacion(1_000_000, 0, 0, 0, 0, 0, 11.44, 'FONASA', 7);
    expect(result.sueldoLiquido).toBe(result.totalHaberes - result.totalDescuentos);
  });
});

describe('RemuneracionesService', () => {
  let service: RemuneracionesService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    service = new RemuneracionesService(mockTenantService as any);
  });

  it('no genera duplicado si ya existe liquidación para el mismo funcionario y mes', async () => {
    mockDb.funcionario.findMany.mockResolvedValue([
      {
        id: 'func1',
        nombres: 'Juan',
        apellidos: 'Pérez',
        cargo: 'Docente',
        tipo: 'DOCENTE',
        sueldoBase: 1_000_000,
        afp: 'CAPITAL',
        isapre: 'FONASA',
        estado: 'ACTIVO',
        deletedAt: null,
      },
    ]);

    // Simulate that a liquidation already exists
    mockDb.liquidacionSueldo.findUnique.mockResolvedValue({ id: 'liq1', funcionarioId: 'func1', mes: 1, anio: 2025 });
    mockDb.configuracionPrevisional.findFirst.mockResolvedValue(null);

    const result = await service.generarMes({ mes: 1, anio: 2025 });

    expect(result.generadas).toBe(0);
    expect(result.errores).toHaveLength(1);
    expect(result.errores[0].error).toContain('Ya existe liquidación');
  });
});
