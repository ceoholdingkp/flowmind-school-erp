import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventBusModule } from './events/event-bus.module';
import { AuditModule } from './audit/audit.module';
import { StorageModule } from './storage/storage.module';
import { TenantMiddleware } from './prisma/tenant.middleware';
import { SistemaModule } from './modules/sistema/sistema.module';
import { AlumnosModule } from './modules/alumnos/alumnos.module';
import { AsistenciaModule } from './modules/asistencia/asistencia.module';
import { AtrasosModule } from './modules/atrasos/atrasos.module';
import { CalificacionesModule } from './modules/calificaciones/calificaciones.module';
import { ConvivenciaModule } from './modules/convivencia/convivencia.module';
import { LeccionarioModule } from './modules/leccionario/leccionario.module';
import { FinanzasModule } from './modules/finanzas/finanzas.module';
import { RRHHModule } from './modules/rrhh/rrhh.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CalendarioModule } from './modules/calendario/calendario.module';
import { PMEModule } from './modules/pme/pme.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { CumplimientoModule } from './modules/cumplimiento/cumplimiento.module';
import { MatriculaModule } from './modules/matricula/matricula.module';
import { PortalModule } from './modules/portal/portal.module';
import { AcademicoModule } from './modules/academico/academico.module';
import { RemuneracionesModule } from './modules/remuneraciones/remuneraciones.module';
import { ComunicacionesModule } from './modules/comunicaciones/comunicaciones.module';
import { EdeModule } from './modules/ede/ede.module';
import { HealthModule } from './modules/health/health.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      { name: 'global', ttl: 60000, limit: 100 },   // 100 req/min per IP (global)
      { name: 'auth', ttl: 60000, limit: 10 },       // 10 req/min — login brute-force
      { name: 'otp', ttl: 60000, limit: 5 },         // 5 req/min — OTP brute-force
    ]),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 20,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
    PrismaModule,
    AuthModule,
    EventBusModule,
    AuditModule,
    StorageModule,
    SistemaModule,
    AlumnosModule,
    AsistenciaModule,
    AtrasosModule,
    CalificacionesModule,
    ConvivenciaModule,
    LeccionarioModule,
    FinanzasModule,
    RRHHModule,
    DashboardModule,
    CalendarioModule,
    PMEModule,
    InventarioModule,
    CumplimientoModule,
    MatriculaModule,
    PortalModule,
    AcademicoModule,
    RemuneracionesModule,
    ComunicacionesModule,
    EdeModule,
    HealthModule,
    OnboardingModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
