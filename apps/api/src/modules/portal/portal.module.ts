import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PortalController, PortalV2Controller } from './portal.controller';
import { PortalService } from './portal.service';
import { PortalAuthController } from './portal-auth.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalJwtStrategy } from './strategies/portal-jwt.strategy';
import { PrismaModule } from '../../prisma/prisma.module';
import { ComunicacionesModule } from '../comunicaciones/comunicaciones.module';

@Module({
  imports: [
    PrismaModule,
    ComunicacionesModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '12h' },
    }),
  ],
  controllers: [PortalController, PortalV2Controller, PortalAuthController],
  providers: [PortalService, PortalAuthService, PortalJwtStrategy],
})
export class PortalModule {}
