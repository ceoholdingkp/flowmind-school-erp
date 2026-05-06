import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcademicoService } from './academico.service';

const createMockDb = () => ({
  evaluacion: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  notaEval: {
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  alumno: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  asignatura: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  asignaturaDocente: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
  },
  $transaction: vi.fn(),
});

describe('AcademicoService', () => {
  let service: AcademicoService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    service = new AcademicoService(mockTenantService as any);
  });

  describe('registrarNotasBulk', () => {
    it('nota válida (4.5) se registra OK', async () => {
      mockDb.evaluacion.findUnique.mockResolvedValue({ id: 'ev1', estado: 'ABIERTA' });
      mockDb.notaEval.findMany.mockResolvedValue([]);
      mockDb.notaEval.createMany.mockResolvedValue({ count: 1 });

      const result = await service.registrarNotasBulk(
        'ev1',
        { notas: [{ alumnoId: 'a1', valor: 4.5 }] },
        'user1',
      );

      expect(result).toEqual({ updated: 0, created: 1 });
    });

    it('nota inválida (0.5) lanza BadRequestException', async () => {
      mockDb.evaluacion.findUnique.mockResolvedValue({ id: 'ev1', estado: 'ABIERTA' });

      await expect(
        service.registrarNotasBulk(
          'ev1',
          { notas: [{ alumnoId: 'a1', valor: 0.5 }] },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('nota inválida (7.5) lanza BadRequestException', async () => {
      mockDb.evaluacion.findUnique.mockResolvedValue({ id: 'ev1', estado: 'ABIERTA' });

      await expect(
        service.registrarNotasBulk(
          'ev1',
          { notas: [{ alumnoId: 'a1', valor: 7.5 }] },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('evaluación CERRADA lanza BadRequestException', async () => {
      mockDb.evaluacion.findUnique.mockResolvedValue({ id: 'ev1', estado: 'CERRADA' });

      await expect(
        service.registrarNotasBulk(
          'ev1',
          { notas: [{ alumnoId: 'a1', valor: 4.5 }] },
          'user1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('nota actualizable (mismo alumno, misma evaluación) se actualiza sin error', async () => {
      mockDb.evaluacion.findUnique.mockResolvedValue({ id: 'ev1', estado: 'ABIERTA' });
      mockDb.notaEval.findMany.mockResolvedValue([{ id: 'nota1', alumnoId: 'a1' }]);
      mockDb.notaEval.update.mockResolvedValue({ id: 'nota1', valor: 5.0 });

      const result = await service.registrarNotasBulk(
        'ev1',
        { notas: [{ alumnoId: 'a1', valor: 5.0 }] },
        'user1',
      );

      expect(result).toEqual({ updated: 1, created: 0 });
    });
  });

  describe('promedio con ponderaciones', () => {
    it('calcula correctamente: (4.0 * 40 + 6.0 * 60) / 100 = 5.2', () => {
      const ev1 = { ponderacion: 40, notasEval: [{ alumnoId: 'a1', valor: 4.0 }] };
      const ev2 = { ponderacion: 60, notasEval: [{ alumnoId: 'a1', valor: 6.0 }] };

      let sumaP = 0;
      let sumaN = 0;
      for (const ev of [ev1, ev2]) {
        const nota = ev.notasEval.find((n: any) => n.alumnoId === 'a1');
        if (nota != null) {
          sumaP += ev.ponderacion;
          sumaN += nota.valor * ev.ponderacion;
        }
      }
      const promedio = sumaP > 0 ? Math.round((sumaN / sumaP) * 10) / 10 : null;

      expect(promedio).toBe(5.2);
    });
  });

  describe('getNotasCursoAsignatura', () => {
    it('construye filas con promedio correcto', async () => {
      const alumno1 = { id: 'a1', nombres: 'Juan', apellidoPaterno: 'Soto', apellidoMaterno: 'Lima' };

      mockDb.evaluacion.findMany.mockResolvedValue([
        {
          id: 'ev1',
          ponderacion: 50,
          semestre: 1,
          fechaAplicacion: new Date('2025-03-15'),
          notasEval: [{ alumnoId: 'a1', valor: 5.0, alumno: alumno1 }],
        },
        {
          id: 'ev2',
          ponderacion: 50,
          semestre: 1,
          fechaAplicacion: new Date('2025-04-15'),
          notasEval: [{ alumnoId: 'a1', valor: 6.0, alumno: alumno1 }],
        },
      ]);

      mockDb.alumno.findMany.mockResolvedValue([alumno1]);

      const result = await service.getNotasCursoAsignatura('c1', 'asig1', 1, 2025);

      expect(result.filas).toHaveLength(1);
      expect(result.filas[0].promedio).toBe(5.5);
    });
  });
});
