import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';

const createMockTransactionDb = () => ({
  asistencia: {
    update: vi.fn().mockResolvedValue({ id: 'reg1', estado: 'PRESENTE' }),
    create: vi.fn().mockResolvedValue({ id: 'reg1', estado: 'PRESENTE' }),
  },
  eventoAuditoria: {
    create: vi.fn().mockResolvedValue({}),
  },
});

const createMockDb = () => ({
  curso: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
  },
  alumno: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  asistencia: {
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
  },
  eventoAuditoria: {
    create: vi.fn(),
  },
  establecimiento: {
    findFirst: vi.fn(),
  },
  $transaction: vi.fn((fn: any) => fn(createMockTransactionDb())),
});

describe('AsistenciaService', () => {
  let service: AsistenciaService;
  let mockDb: ReturnType<typeof createMockDb>;
  let mockEventBus: any;
  let mockStorage: any;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = {
      getClient: vi.fn().mockReturnValue(mockDb),
      getTenantId: vi.fn().mockReturnValue('test-tenant'),
    };
    mockEventBus = { publish: vi.fn().mockResolvedValue(undefined) };
    mockStorage = { upload: vi.fn().mockResolvedValue({ url: 'https://storage.example.com/file.pdf' }) };

    service = new AsistenciaService(
      mockTenantService as any,
      mockEventBus as any,
      mockStorage as any,
    );
  });

  it('registro masivo — fecha futura lanza BadRequestException', async () => {
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0];

    await expect(
      service.registrarBulk(
        {
          cursoId: 'c1',
          fecha: tomorrow,
          registros: [{ alumnoId: 'a1', estado: 'PRESENTE' }],
        },
        'user1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('registro masivo — curso no encontrado lanza NotFoundException', async () => {
    mockDb.curso.findUnique.mockResolvedValue(null);

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    await expect(
      service.registrarBulk(
        {
          cursoId: 'non-existent',
          fecha: yesterday,
          registros: [{ alumnoId: 'a1', estado: 'PRESENTE' }],
        },
        'user1',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('alumno no matriculado — lanza BadRequestException cuando alumnos.length != alumnoIds.length', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    mockDb.curso.findUnique.mockResolvedValue({ id: 'c1', nombre: '1° Básico A', nivel: '1B' });
    // Returns 0 alumnos for 2 requested
    mockDb.alumno.findMany.mockResolvedValue([]);

    await expect(
      service.registrarBulk(
        {
          cursoId: 'c1',
          fecha: yesterday,
          registros: [
            { alumnoId: 'a1', estado: 'PRESENTE' },
            { alumnoId: 'a2', estado: 'AUSENTE' },
          ],
        },
        'user1',
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('alumno ya registrado — upsert actualiza el registro existente', async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    mockDb.curso.findUnique.mockResolvedValue({ id: 'c1', nombre: '1° Básico A', nivel: '1B' });
    mockDb.alumno.findMany.mockResolvedValue([
      { id: 'a1', run: '12345678-9', nombres: 'Juan', apellidoPaterno: 'Soto' },
    ]);

    // Simulate existing record for this alumno
    mockDb.asistencia.findMany.mockResolvedValue([{ id: 'reg-existing', alumnoId: 'a1' }]);

    // Override $transaction to track whether update was called
    const updateFn = vi.fn().mockResolvedValue({ id: 'reg-existing', estado: 'AUSENTE' });
    const createFn = vi.fn().mockResolvedValue({ id: 'new', estado: 'PRESENTE' });
    const txDb = {
      asistencia: { update: updateFn, create: createFn },
      eventoAuditoria: { create: vi.fn().mockResolvedValue({}) },
    };
    mockDb.$transaction.mockImplementation((fn: any) => fn(txDb));

    mockEventBus.publish.mockResolvedValue(undefined);

    // Spy on checkUmbrales to prevent it from running (it calls DB)
    vi.spyOn(service as any, 'checkUmbrales').mockResolvedValue(undefined);

    const result = await service.registrarBulk(
      {
        cursoId: 'c1',
        fecha: yesterday,
        registros: [{ alumnoId: 'a1', estado: 'AUSENTE' }],
      },
      'user1',
    );

    expect(updateFn).toHaveBeenCalledTimes(1);
    expect(createFn).not.toHaveBeenCalled();
    expect(result.data.registrados).toBe(1);
  });
});
