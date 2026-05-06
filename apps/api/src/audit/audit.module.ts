import { Global, Module } from '@nestjs/common';
import { AuditInterceptor } from './audit.interceptor';
import { AuditController } from './audit.controller';
import { APP_INTERCEPTOR } from '@nestjs/core';

@Global()
@Module({
  controllers: [AuditController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AuditModule {}
