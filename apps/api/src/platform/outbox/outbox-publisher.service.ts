import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { OutboxRepository } from "./outbox.repository.js";
import { RabbitMqClient } from "./rabbitmq.client.js";

@Injectable()
export class OutboxPublisherService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxPublisherService.name);
  private timer: NodeJS.Timeout | null = null;
  private polling = false;

  constructor(
    private readonly outboxRepository: OutboxRepository,
    private readonly rabbitMqClient: RabbitMqClient,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    const pollIntervalMs = this.configService.get<number>(
      "outbox.pollIntervalMs",
      1000,
    );

    this.timer = setInterval(() => {
      void this.poll();
    }, pollIntervalMs);
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async poll(): Promise<void> {
    if (this.polling) {
      return;
    }
    this.polling = true;

    try {
      await this.rabbitMqClient.ensureConnected();
    } catch (error) {
      this.logger.error(
        `Outbox poll skipped — RabbitMQ unavailable: ${(error as Error).message}`,
      );
      this.polling = false;
      return;
    }

    const batchSize = this.configService.get<number>("outbox.batchSize", 50);
    const maxAttempts = this.configService.get<number>("outbox.maxAttempts", 5);
    const exchange = this.configService.get<string>(
      "rabbitmq.exchange",
      "lcsp.events",
    );

    try {
      await this.outboxRepository.withPendingBatch(
        batchSize,
        async (messages, tx) => {
          for (const message of messages) {
            const now = new Date();

            try {
              await this.rabbitMqClient.publish(
                exchange,
                message.eventType,
                message.payload,
              );
              await this.outboxRepository.markPublished(tx, message.id, now);
            } catch (error) {
              const nextAttempts = message.attempts + 1;
              const reason = (error as Error).message;

              await this.outboxRepository.markFailure(
                tx,
                message.id,
                nextAttempts,
                maxAttempts,
                reason,
                now,
              );
              this.logger.error(
                `Outbox message ${message.id} publish failed (attempt ${nextAttempts}/${maxAttempts}): ${reason}`,
              );
            }
          }
        },
      );
    } catch (error) {
      this.logger.error(
        `Outbox poll batch failed: ${(error as Error).message}`,
      );
    } finally {
      this.polling = false;
    }
  }
}
