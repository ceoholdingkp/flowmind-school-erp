import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { DomainEvent } from '@flowmind/shared';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EventBusService {
  private readonly logger = new Logger(EventBusService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    @InjectQueue('events') private readonly eventQueue: Queue,
  ) {}

  async publish(event: Omit<DomainEvent, 'correlationId'> & { correlationId?: string }): Promise<void> {
    const enriched = {
      ...event,
      correlationId: event.correlationId ?? uuidv4(),
      timestamp: event.timestamp ?? new Date(),
    };

    // Sync local emission (within process)
    this.eventEmitter.emit(enriched.type, enriched);
    this.logger.log(`Event published: ${enriched.type} [${enriched.correlationId}]`);

    // Async queue for cross-service / persistent processing
    try {
      await this.eventQueue.add(enriched.type, enriched, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    } catch (err) {
      this.logger.warn(`Failed to enqueue event ${enriched.type}: ${err}`);
    }
  }
}
