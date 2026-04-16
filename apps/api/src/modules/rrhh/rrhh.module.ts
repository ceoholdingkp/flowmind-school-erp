import { Module } from '@nestjs/common';

// Services
import { FuncionariosService } from './funcionarios.service';
import { AsistenciaRRHHService } from './asistencia-rrhh.service';
import { ContratosService } from './contratos.service';
import { RemuneracionesService } from './remuneraciones.service';

// Controllers
import { FuncionariosController } from './controllers/funcionarios.controller';
import { AsistenciaRRHHController } from './controllers/asistencia-rrhh.controller';
import { ContratosController, FuncionarioContratosController } from './controllers/contratos.controller';
import { RemuneracionesController } from './controllers/remuneraciones.controller';

@Module({
  controllers: [
    FuncionariosController,
    AsistenciaRRHHController,
    ContratosController,
    FuncionarioContratosController,
    RemuneracionesController,
  ],
  providers: [
    FuncionariosService,
    AsistenciaRRHHService,
    ContratosService,
    RemuneracionesService,
  ],
})
export class RRHHModule {}
