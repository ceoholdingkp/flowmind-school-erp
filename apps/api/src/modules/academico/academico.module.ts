import { Module } from '@nestjs/common';
import { AcademicoService } from './academico.service';
import { AcademicoController } from './academico.controller';

@Module({
  controllers: [AcademicoController],
  providers: [AcademicoService],
})
export class AcademicoModule {}
