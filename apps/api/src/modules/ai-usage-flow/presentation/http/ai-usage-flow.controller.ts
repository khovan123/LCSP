import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";

import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import { AcceptAIUsageFlowCommand } from "../../application/commands/accept-ai-usage-flow/accept-ai-usage-flow.command.js";
import type {
  AIUsageFlowCallbackDto,
  AIUsageFlowCallbackRequest,
} from "../../application/contracts/ai-usage-flow/ai-usage-flow-callback.contract.js";

@Controller("internal/ai-usage-flow")
export class InternalAIUsageFlowController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async acceptAIUsageFlow(
    @Body() payload: AIUsageFlowCallbackRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<AIUsageFlowCallbackDto> {
    return this.commandBus.execute(
      new AcceptAIUsageFlowCommand(
        payload,
        correlationId?.trim() || randomUUID(),
      ),
    );
  }
}
