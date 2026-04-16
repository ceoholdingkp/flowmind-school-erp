import { Module } from '@nestjs/common';
import { ConvivenciaService } from './convivencia.service';
import { ConvivenciaController } from './convivencia.controller';

@Module({
  controllers: [ConvivenciaController],
  providers: [ConvivenciaService],
})
export class ConvivenciaModule {}
