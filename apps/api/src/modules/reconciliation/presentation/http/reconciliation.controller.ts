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
import { AcceptConflictCommand } from "../../application/commands/accept-conflict/accept-conflict.command.js";
import type {
  ConflictDetectionCallbackDto,
  ConflictDetectionCallbackRequest,
} from "../../application/contracts/reconciliation/conflict-detection-callback.contract.js";

@Controller("internal/reconciliation")
export class InternalReconciliationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("conflict-callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async acceptConflictDetection(
    @Body() payload: ConflictDetectionCallbackRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ConflictDetectionCallbackDto> {
    return this.commandBus.execute(
      new AcceptConflictCommand(payload, correlationId?.trim() || randomUUID()),
    );
  }
}
