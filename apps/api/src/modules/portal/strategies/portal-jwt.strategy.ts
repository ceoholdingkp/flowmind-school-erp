import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class PortalJwtStrategy extends PassportStrategy(Strategy, 'portal-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'fallback-secret',
    });
  }

  validate(payload: { sub: string; run: string; type: string }) {
    if (payload.type !== 'portal') {
      throw new UnauthorizedException('Token no válido para el portal');
    }
    return { apoderadoId: payload.sub, run: payload.run };
  }
}
