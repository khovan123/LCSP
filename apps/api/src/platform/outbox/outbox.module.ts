import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { OutboxPublisherService } from "./outbox-publisher.service.js";
import { OutboxRepository } from "./outbox.repository.js";
import { RabbitMqClient } from "./rabbitmq.client.js";
import { OutboxDlqController } from "./outbox-dlq.controller.js";
import { OutboxDlqService } from "./outbox-dlq.service.js";

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [OutboxDlqController],
  providers: [
    OutboxRepository,
    OutboxDlqService,
    {
      provide: RabbitMqClient,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        new RabbitMqClient(configService.get<string>("rabbitmq.url", "")),
    },
    OutboxPublisherService,
  ],
  exports: [OutboxRepository, RabbitMqClient],
})
export class OutboxModule {}
