import { Module } from '@nestjs/common';
import { AtrasosService } from './atrasos.service';
import { AtrasosController } from './atrasos.controller';

@Module({
  controllers: [AtrasosController],
  providers: [AtrasosService],
})
export class AtrasosModule {}
