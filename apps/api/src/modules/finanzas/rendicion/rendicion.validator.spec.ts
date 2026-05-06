import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RendicionSupereducValidator } from './rendicion.validator';

const createMockDb = () => ({
  supereducCuenta: {
    findUnique: vi.fn(),
  },
  fondo: {
    findUnique: vi.fn(),
  },
  rendicion: {
    findFirst: vi.fn(),
  },
});

describe('RendicionSupereducValidator', () => {
  let validator: RendicionSupereducValidator;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    validator = new RendicionSupereducValidator(mockTenantService as any);
  });

  const baseDto = {
    supereducCuentaCodigo: 'C001',
    fondoId: 'fondo1',
    subvencion: 'SEP',
    tipoDocumento: 'FACTURA',
    monto: 1000,
    fecha: new Date(Date.now() - 86400000).toISOString(), // yesterday
    mes: 1,
    anio: 2025,
  };

  it('R004 — monto negativo lanza error R004', async () => {
    const dto = { ...baseDto, monto: -100 };

    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(dto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R004')).toBe(true);
  });

  it('R005 — fecha futura lanza error R005', async () => {
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString();
    const dto = { ...baseDto, fecha: tomorrow };

    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(dto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R005')).toBe(true);
  });

  it('R001 — cuenta agrupadora rechazada', async () => {
    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: true,
      subvenciones: [],
      documentos: [],
    });

    const result = await validator.validarMovimiento(baseDto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R001')).toBe(true);
  });

  it('R002 — subvención no habilitada lanza error R002', async () => {
    const dto = { ...baseDto, subvencion: 'PIE' };

    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(dto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R002')).toBe(true);
  });

  it('R003 — documento no habilitado lanza error R003', async () => {
    const dto = { ...baseDto, tipoDocumento: 'BOLETA' };

    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(dto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R003')).toBe(true);
  });

  it('R006 — fondo no encontrado lanza error R006', async () => {
    mockDb.fondo.findUnique.mockResolvedValue(null);
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(baseDto as any);

    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'R006')).toBe(true);
  });

  it('R009 — cuenta operativa válida se acepta correctamente', async () => {
    mockDb.fondo.findUnique.mockResolvedValue({ id: 'fondo1' });
    mockDb.supereducCuenta.findUnique.mockResolvedValue({
      codigo: 'C001',
      esAgrupadora: false,
      subvenciones: [{ subvencion: 'SEP' }],
      documentos: [{ tipoDoc: 'FACTURA' }],
    });

    const result = await validator.validarMovimiento(baseDto as any);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
