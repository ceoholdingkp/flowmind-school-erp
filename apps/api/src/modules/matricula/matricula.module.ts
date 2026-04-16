import { Module } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { MatriculaController } from './matricula.controller';

@Module({
  controllers: [MatriculaController],
  providers: [MatriculaService],
})
export class MatriculaModule {}
