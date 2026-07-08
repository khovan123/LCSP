import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";

import { OutboxPublisherService } from "./outbox-publisher.service.js";
import { OutboxRepository } from "./outbox.repository.js";
import { RabbitMqClient } from "./rabbitmq.client.js";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    OutboxRepository,
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
