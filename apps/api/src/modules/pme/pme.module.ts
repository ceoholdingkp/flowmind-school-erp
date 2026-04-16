import { Module } from '@nestjs/common';
import { PMEService } from './pme.service';
import { PMEController } from './pme.controller';

@Module({
  controllers: [PMEController],
  providers: [PMEService],
})
export class PMEModule {}
