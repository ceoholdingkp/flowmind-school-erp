import { Module } from '@nestjs/common';
import { AlumnosService } from './alumnos.service';
import { AlumnosController } from './alumnos.controller';
import { ApoderadosService } from './apoderados.service';
import { ApoderadosController, ContactosEmergenciaController } from './apoderados.controller';

@Module({
  controllers: [AlumnosController, ApoderadosController, ContactosEmergenciaController],
  providers: [AlumnosService, ApoderadosService],
  exports: [AlumnosService],
})
export class AlumnosModule {}
