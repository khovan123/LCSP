import { ConfigService } from "@nestjs/config";
import { CommandHandler } from "@nestjs/cqrs";
import type { ICommandHandler } from "@nestjs/cqrs";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { OutboxRepository } from "../../../../../platform/outbox/outbox.repository.js";
import { acceptSePayWebhook } from "../../cqrs/billing-cqrs.helpers.js";
import { AcceptSePayWebhookCommand } from "./accept-sepay-webhook.command.js";

@CommandHandler(AcceptSePayWebhookCommand)
export class AcceptSePayWebhookHandler implements ICommandHandler<AcceptSePayWebhookCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxRepository,
    private readonly config: ConfigService,
  ) {}

  execute(command: AcceptSePayWebhookCommand) {
    return acceptSePayWebhook(
      command.input,
      this.prisma,
      this.outbox,
      this.config,
    );
  }
}
