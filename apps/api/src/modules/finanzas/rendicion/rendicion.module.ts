import { Module } from '@nestjs/common';
import { RendicionSupereducController } from './rendicion.controller';
import { RendicionSupereducService } from './rendicion.service';
import { RendicionSupereducValidator } from './rendicion.validator';

@Module({
  controllers: [RendicionSupereducController],
  providers: [RendicionSupereducService, RendicionSupereducValidator],
})
export class RendicionSupereducModule {}
