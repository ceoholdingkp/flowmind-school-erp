import { Module } from '@nestjs/common';
import { SistemaService } from './sistema.service';
import { SistemaController } from './sistema.controller';

@Module({
  controllers: [SistemaController],
  providers: [SistemaService],
})
export class SistemaModule {}
