import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { TenantService } from '../../prisma/tenant.service';

@Injectable()
export class PortalAuthService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly jwtService: JwtService,
  ) {}

  private get db() {
    return this.tenantService.getClient();
  }

  async login(run: string, password: string) {
    if (!run || !password) {
      throw new BadRequestException('RUT y contraseña son requeridos');
    }

    const apoderado = await (this.db.apoderado as any).findUnique({
      where: { run },
    });

    if (!apoderado || !apoderado.activo || !apoderado.passwordHash) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(password, apoderado.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    await (this.db.apoderado as any).update({
      where: { id: apoderado.id },
      data: { ultimoAcceso: new Date() },
    });

    const payload = { sub: apoderado.id, run: apoderado.run, type: 'portal' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '12h' });

    return {
      accessToken,
      apoderado: {
        id: apoderado.id,
        nombres: apoderado.nombres,
        apellidos: apoderado.apellidos,
        run: apoderado.run,
        email: apoderado.email,
      },
    };
  }

  async cambiarPassword(
    apoderadoId: string,
    passwordActual: string,
    passwordNuevo: string,
  ) {
    if (!passwordNuevo || passwordNuevo.length < 6) {
      throw new BadRequestException('La nueva contraseña debe tener al menos 6 caracteres');
    }

    const apoderado = await (this.db.apoderado as any).findUnique({
      where: { id: apoderadoId },
    });

    if (!apoderado?.passwordHash) {
      throw new UnauthorizedException('Cuenta no configurada para acceso directo');
    }

    const valid = await bcrypt.compare(passwordActual, apoderado.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Contraseña actual incorrecta');
    }

    const newHash = await bcrypt.hash(passwordNuevo, 10);
    await (this.db.apoderado as any).update({
      where: { id: apoderadoId },
      data: { passwordHash: newHash },
    });

    return { message: 'Contraseña actualizada correctamente' };
  }

  async recuperar(run: string, email: string) {
    // Find apoderado to verify — but always return same message to prevent enumeration
    await (this.db.apoderado as any).findFirst({ where: { run, email } });

    // TODO: send reset email in production
    return {
      message: 'Si el RUT y email coinciden con una cuenta registrada, recibirás un correo con instrucciones.',
    };
  }

  async activarCuenta(run: string, email: string, passwordNuevo: string) {
    if (!passwordNuevo || passwordNuevo.length < 6) {
      throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    }

    const apoderado = await (this.db.apoderado as any).findFirst({
      where: { run, email },
    });

    if (!apoderado) {
      throw new UnauthorizedException('RUT o email no coinciden con ninguna cuenta registrada');
    }

    if (apoderado.passwordHash) {
      throw new BadRequestException('Esta cuenta ya fue activada. Usa "Olvidé mi contraseña" si necesitas recuperar el acceso.');
    }

    const hash = await bcrypt.hash(passwordNuevo, 10);
    await (this.db.apoderado as any).update({
      where: { id: apoderado.id },
      data: { passwordHash: hash, activo: true },
    });

    const payload = { sub: apoderado.id, run: apoderado.run, type: 'portal' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '12h' });

    return {
      accessToken,
      apoderado: {
        id: apoderado.id,
        nombres: apoderado.nombres,
        apellidos: apoderado.apellidos,
        run: apoderado.run,
        email: apoderado.email,
      },
    };
  }
}
