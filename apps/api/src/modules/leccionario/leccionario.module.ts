import { Module } from '@nestjs/common';
import { LeccionarioService } from './leccionario.service';
import { LeccionarioController } from './leccionario.controller';

@Module({
  controllers: [LeccionarioController],
  providers: [LeccionarioService],
})
export class LeccionarioModule {}
