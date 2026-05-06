import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EdeService } from './ede.service';

const createMockDb = () => ({
  alumno: {
    findMany: vi.fn(),
  },
  curso: {
    findMany: vi.fn(),
  },
  funcionario: {
    findMany: vi.fn(),
  },
  asignaturaDocente: {
    findMany: vi.fn(),
  },
  evaluacion: {
    findMany: vi.fn(),
  },
  asistencia: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  asignatura: {
    findMany: vi.fn(),
  },
  establecimiento: {
    findFirst: vi.fn(),
  },
  notaEval: {
    findMany: vi.fn(),
  },
});

describe('EdeService', () => {
  let service: EdeService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    service = new EdeService(mockTenantService as any);
  });

  it('validar detecta alumno sin RUN válido — run sin guion genera error Alumno.run', async () => {
    mockDb.alumno.findMany.mockResolvedValue([
      { id: 'a1', run: '999999', nombres: 'Test', apellidoPaterno: 'User', cursoId: 'c1' },
    ]);
    mockDb.curso.findMany.mockResolvedValue([
      { id: 'c1', nombre: '1° Básico', docenteJefeId: 'f1' },
    ]);
    mockDb.asignaturaDocente.findMany.mockResolvedValue([{ cursoId: 'c1' }]);
    mockDb.funcionario.findMany.mockResolvedValue([]);
    mockDb.evaluacion.findMany.mockResolvedValue([]);
    mockDb.asistencia.count.mockResolvedValue(10);

    const result = await service.validar(2025);

    expect(result.valido).toBe(false);
    const errorAlumnoRun = result.errores.find((e) => e.campo === 'Alumno.run');
    expect(errorAlumnoRun).toBeDefined();
    expect(errorAlumnoRun!.registrosAfectados).toBe(1);
  });

  it('validar detecta curso sin docente jefe', async () => {
    mockDb.alumno.findMany.mockResolvedValue([]);
    mockDb.curso.findMany.mockResolvedValue([
      { id: 'c1', nombre: '1° Básico', docenteJefeId: null },
    ]);
    mockDb.asignaturaDocente.findMany.mockResolvedValue([{ cursoId: 'c1' }]);
    mockDb.funcionario.findMany.mockResolvedValue([]);
    mockDb.evaluacion.findMany.mockResolvedValue([]);
    mockDb.asistencia.count.mockResolvedValue(10);

    const result = await service.validar(2025);

    expect(result.valido).toBe(false);
    const errorDocente = result.errores.find((e) => e.campo === 'Curso.docenteJefeId');
    expect(errorDocente).toBeDefined();
    expect(errorDocente!.registrosAfectados).toBe(1);
  });

  it('alumno con RUN válido no genera error Alumno.run', async () => {
    mockDb.alumno.findMany.mockResolvedValue([
      { id: 'a1', run: '12345678-9', nombres: 'Test', apellidoPaterno: 'User', cursoId: 'c1' },
    ]);
    mockDb.curso.findMany.mockResolvedValue([
      { id: 'c1', nombre: '1° Básico', docenteJefeId: 'f1' },
    ]);
    mockDb.asignaturaDocente.findMany.mockResolvedValue([{ cursoId: 'c1' }]);
    mockDb.funcionario.findMany.mockResolvedValue([]);
    mockDb.evaluacion.findMany.mockResolvedValue([]);
    mockDb.asistencia.count.mockResolvedValue(10);

    const result = await service.validar(2025);

    const errorAlumnoRun = result.errores.find((e) => e.campo === 'Alumno.run');
    expect(errorAlumnoRun).toBeUndefined();
  });

  it('exportar retorna JSON con estructura básica CEDS (Organization, Person, etc.)', async () => {
    mockDb.establecimiento.findFirst.mockResolvedValue({
      id: 'est1',
      nombre: 'Colegio Test',
      rbd: '12345',
    });
    mockDb.alumno.findMany.mockResolvedValue([]);
    mockDb.funcionario.findMany.mockResolvedValue([]);
    mockDb.curso.findMany.mockResolvedValue([]);
    mockDb.asignatura.findMany.mockResolvedValue([]);
    mockDb.asignaturaDocente.findMany.mockResolvedValue([]);
    mockDb.asistencia.findMany.mockResolvedValue([]);
    mockDb.evaluacion.findMany.mockResolvedValue([]);
    mockDb.notaEval.findMany.mockResolvedValue([]);

    const result = await service.exportar(2025, '12345');

    expect(result).toHaveProperty('Organization');
    expect(result).toHaveProperty('Person');
    expect(result).toHaveProperty('ExportMetadata');
    expect(Array.isArray(result.Organization)).toBe(true);
    expect(Array.isArray(result.Person)).toBe(true);
  });
});
