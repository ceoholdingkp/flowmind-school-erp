import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { EventBusService } from './event-bus.service';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'events',
    }),
  ],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
