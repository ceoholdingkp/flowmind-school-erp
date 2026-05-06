import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PortalAuthService } from '../src/modules/portal/portal-auth.service';
import { PortalService } from '../src/modules/portal/portal.service';
import { PortalJwtStrategy } from '../src/modules/portal/strategies/portal-jwt.strategy';

const createApoderadoDb = () => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
});

describe('Portal Auth (integration)', () => {
  let portalAuthService: PortalAuthService;
  let apoderadoDb: ReturnType<typeof createApoderadoDb>;

  beforeEach(() => {
    apoderadoDb = createApoderadoDb();
    const mockDb = { apoderado: apoderadoDb };
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-at-least-32-chars-long',
      signOptions: { expiresIn: '12h' },
    });
    portalAuthService = new PortalAuthService(mockTenantService as any, jwtService);
  });

  it('login válido con run+password retorna accessToken', async () => {
    const passwordHash = await bcrypt.hash('secret123', 10);

    apoderadoDb.findUnique.mockResolvedValue({
      id: 'ap1',
      run: '12345678-9',
      nombres: 'María',
      apellidos: 'González',
      email: 'maria@test.cl',
      passwordHash,
      activo: true,
    });
    apoderadoDb.update.mockResolvedValue({});

    const result = await portalAuthService.login('12345678-9', 'secret123');

    expect(result).toHaveProperty('accessToken');
    expect(result.apoderado.run).toBe('12345678-9');
  });

  it('login con password incorrecto lanza UnauthorizedException', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);

    apoderadoDb.findUnique.mockResolvedValue({
      id: 'ap1',
      run: '12345678-9',
      nombres: 'María',
      apellidos: 'González',
      email: 'maria@test.cl',
      passwordHash,
      activo: true,
    });

    await expect(
      portalAuthService.login('12345678-9', 'wrong-password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login con apoderado no encontrado lanza UnauthorizedException', async () => {
    apoderadoDb.findUnique.mockResolvedValue(null);

    await expect(
      portalAuthService.login('00000000-0', 'password'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('PortalJwtStrategy.validate con payload type=portal retorna apoderadoId y run', () => {
    const strategy = new PortalJwtStrategy();
    const payload = { sub: 'ap1', run: '12345678-9', type: 'portal' };

    const result = strategy.validate(payload);

    expect(result).toEqual({ apoderadoId: 'ap1', run: '12345678-9' });
  });

  it('PortalJwtStrategy.validate con payload type=staff lanza UnauthorizedException', () => {
    const strategy = new PortalJwtStrategy();
    const payload = { sub: 'u1', run: '12345678-9', type: 'staff' };

    expect(() => strategy.validate(payload)).toThrow(UnauthorizedException);
  });
});

describe('PortalService', () => {
  let portalService: PortalService;
  let apoderadoDb: ReturnType<typeof createApoderadoDb>;

  beforeEach(() => {
    apoderadoDb = createApoderadoDb();
    const mockDb = {
      apoderado: apoderadoDb,
      usuario: { findUnique: vi.fn() },
      nota: { findMany: vi.fn() },
      asistencia: { findMany: vi.fn() },
      pago: { findMany: vi.fn() },
    };
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    portalService = new PortalService(mockTenantService as any);
  });

  it('getHijos retorna los alumnos del apoderado correctamente', async () => {
    const alumnoData = {
      id: 'a1',
      nombres: 'Pedro',
      apellidoPaterno: 'González',
      apellidoMaterno: 'Ramos',
      run: '23456789-1',
      estadoMatricula: 'ACTIVA',
      esPIE: false,
      esPrioritario: false,
      foto: null,
      curso: { id: 'c1', nombre: '3° Básico A', nivel: '3B' },
    };

    apoderadoDb.findUnique.mockResolvedValue({
      id: 'ap1',
      nombres: 'María',
      apellidos: 'González',
      email: 'maria@test.cl',
      telefono: '+56912345678',
      alumnos: [
        {
          alumno: alumnoData,
          parentesco: 'MADRE',
          esTitular: true,
        },
      ],
    });

    const result = await portalService.getHijos('ap1');

    expect(result).toHaveLength(1);
    expect(result[0].nombres).toBe('Pedro');
    expect(result[0].parentesco).toBe('MADRE');
    expect(result[0].esTitular).toBe(true);
  });

  it('getHijos retorna array vacío si apoderado no existe', async () => {
    apoderadoDb.findUnique.mockResolvedValue(null);

    const result = await portalService.getHijos('non-existent');

    expect(result).toEqual([]);
  });
});
