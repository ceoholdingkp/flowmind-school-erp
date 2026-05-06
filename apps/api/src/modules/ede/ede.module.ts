import { Module } from '@nestjs/common';
import { EdeController } from './ede.controller';
import { EdeService } from './ede.service';

@Module({
  controllers: [EdeController],
  providers: [EdeService],
})
export class EdeModule {}
