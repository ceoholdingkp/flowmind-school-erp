import { Module } from '@nestjs/common';
import { MatriculaService } from './matricula.service';
import { MatriculaController } from './matricula.controller';
import { MatriculasV2Service } from './matriculas-v2.service';
import { MatriculasV2Controller } from './matriculas-v2.controller';

@Module({
  controllers: [MatriculaController, MatriculasV2Controller],
  providers: [MatriculaService, MatriculasV2Service],
})
export class MatriculaModule {}
