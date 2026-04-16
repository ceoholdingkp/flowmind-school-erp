import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TenantService } from '../../prisma/tenant.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  private get prisma() {
    return this.tenantService.getClient();
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.usuario.findUnique({
      where: { email: dto.email },
    });

    if (!user || user.estado !== 'ACTIVO') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { sub: user.id, email: user.email, rol: user.rol };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
    });

    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
    });

    const refreshHash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.usuario.update({
      where: { id: user.id },
      data: { refreshToken: refreshHash, ultimoLogin: new Date() },
    });

    return {
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          apellidos: user.apellidos,
          rol: user.rol,
        },
      },
    };
  }

  async refresh(token: string) {
    try {
      const payload = this.jwtService.verify<{ sub: string; email: string; rol: string }>(token);
      const user = await this.prisma.usuario.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new UnauthorizedException('Token inválido');
      }

      const valid = await bcrypt.compare(token, user.refreshToken);
      if (!valid) {
        throw new UnauthorizedException('Token inválido');
      }

      const newPayload = { sub: user.id, email: user.email, rol: user.rol };
      const accessToken = this.jwtService.sign(newPayload, {
        expiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
      });

      return { data: { accessToken } };
    } catch {
      throw new UnauthorizedException('Token expirado o inválido');
    }
  }

  async logout(userId: string) {
    await this.prisma.usuario.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
    return { data: { message: 'Sesión cerrada correctamente' } };
  }

  async me(userId: string) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
        rol: true,
        estado: true,
        ultimoLogin: true,
      },
    });
    return { data: user };
  }
}
