import { Module } from '@nestjs/common';
import { RemuneracionesService } from './remuneraciones.service';
import { RemuneracionesController } from './remuneraciones.controller';

@Module({
  controllers: [RemuneracionesController],
  providers: [RemuneracionesService],
  exports: [RemuneracionesService],
})
export class RemuneracionesModule {}
