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
import { AcceptClassificationCommand } from "../../application/commands/accept-classification/accept-classification.command.js";
import { AcceptLegalRuleMatchCommand } from "../../application/commands/accept-legal-rule-match/accept-legal-rule-match.command.js";
import type {
  AcceptClassificationDto,
  ClassificationResultCallbackResponseDto,
} from "../../application/contracts/classification/classification-result-callback.contract.js";
import type {
  AcceptLegalRuleMatchDto,
  LegalRuleMatchCallbackResponseDto,
} from "../../application/contracts/classification/legal-rule-match-callback.contract.js";

@Controller("internal/classification")
export class ClassificationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post("legal-rule-match-callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async acceptLegalRuleMatch(
    @Body() payload: AcceptLegalRuleMatchDto,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<LegalRuleMatchCallbackResponseDto> {
    return this.commandBus.execute(
      new AcceptLegalRuleMatchCommand(
        payload,
        correlationId?.trim() || randomUUID(),
      ),
    );
  }

  @Post("result-callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async acceptClassificationResult(
    @Body() payload: AcceptClassificationDto,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ClassificationResultCallbackResponseDto> {
    return this.commandBus.execute(
      new AcceptClassificationCommand(
        payload,
        correlationId?.trim() || randomUUID(),
      ),
    );
  }
}
