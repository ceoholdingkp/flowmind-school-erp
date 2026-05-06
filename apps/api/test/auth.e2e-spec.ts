import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from '../src/modules/auth/auth.service';
import { JwtStrategy } from '../src/modules/auth/strategies/jwt.strategy';

const createMockDb = () => ({
  usuario: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
});

describe('Auth (integration)', () => {
  let authService: AuthService;
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    mockDb = createMockDb();
    const mockTenantService = { getClient: vi.fn().mockReturnValue(mockDb) };
    const jwtService = new JwtService({
      secret: process.env.JWT_SECRET || 'test-secret-at-least-32-chars-long',
      signOptions: { expiresIn: '15m' },
    });
    authService = new AuthService(mockTenantService as any, jwtService);
  });

  it('login con credenciales válidas retorna accessToken y refreshToken', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mockDb.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@test.cl',
      passwordHash,
      nombre: 'Admin',
      apellidos: 'Test',
      rol: 'ADMIN',
      estado: 'ACTIVO',
      refreshToken: null,
    });
    mockDb.usuario.update.mockResolvedValue({});

    const result = await authService.login({ email: 'admin@test.cl', password: 'password123' });

    expect(result.data).toHaveProperty('accessToken');
    expect(result.data).toHaveProperty('refreshToken');
    expect(result.data.user.email).toBe('admin@test.cl');
  });

  it('login con email inválido lanza UnauthorizedException', async () => {
    mockDb.usuario.findUnique.mockResolvedValue(null);

    await expect(
      authService.login({ email: 'noexiste@test.cl', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login con contraseña inválida lanza UnauthorizedException', async () => {
    const passwordHash = await bcrypt.hash('correct-password', 10);
    mockDb.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'admin@test.cl',
      passwordHash,
      nombre: 'Admin',
      apellidos: 'Test',
      rol: 'ADMIN',
      estado: 'ACTIVO',
    });

    await expect(
      authService.login({ email: 'admin@test.cl', password: 'wrong-password' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('usuario con estado INACTIVO lanza UnauthorizedException', async () => {
    const passwordHash = await bcrypt.hash('password123', 10);
    mockDb.usuario.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'inactive@test.cl',
      passwordHash,
      nombre: 'Inactive',
      apellidos: 'User',
      rol: 'DOCENTE',
      estado: 'INACTIVO',
    });

    await expect(
      authService.login({ email: 'inactive@test.cl', password: 'password123' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('JwtStrategy.validate con payload válido retorna user object', () => {
    const strategy = new JwtStrategy();
    const payload = { sub: 'u1', email: 'admin@test.cl', rol: 'ADMIN' };

    const result = strategy.validate(payload);

    expect(result).toEqual({ sub: 'u1', email: 'admin@test.cl', rol: 'ADMIN' });
  });
});
