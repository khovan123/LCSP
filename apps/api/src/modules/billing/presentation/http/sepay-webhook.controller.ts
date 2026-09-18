import { Controller, Headers, Post, Req, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import type { Request } from "express";
import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { AcceptSePayWebhookCommand } from "../../application/commands/accept-sepay-webhook/accept-sepay-webhook.command.js";
import {
  mapSePayWebhookError,
  rawWebhookBody,
} from "./errors/sepay-webhook.error-mapper.js";

@Controller("billing/sepay")
export class SePayWebhookController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("webhook")
  @UseGuards(WorkerApiKeyGuard)
  async receive(
    @Req() request: Request,
    @Headers("x-sepay-signature") signature?: string,
    @Headers("x-sepay-timestamp") timestamp?: string,
  ) {
    try {
      return resultEnvelope(
        await this.commandBus.execute(
          new AcceptSePayWebhookCommand({
            rawBody: rawWebhookBody(request),
            signature,
            timestamp,
          }),
        ),
      );
    } catch (error) {
      throw mapSePayWebhookError(error);
    }
  }
}
