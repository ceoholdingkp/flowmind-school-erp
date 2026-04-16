import { Module } from '@nestjs/common';
import { CumplimientoService } from './cumplimiento.service';
import { CumplimientoController } from './cumplimiento.controller';

@Module({
  controllers: [CumplimientoController],
  providers: [CumplimientoService],
})
export class CumplimientoModule {}
