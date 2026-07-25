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
import { ProcessDocumentCallbackCommand } from "../../application/commands/process-document-callback/process-document-callback.command.js";
import type {
  DocumentCallbackRequest,
  DocumentCallbackDto,
} from "../../application/contracts/document/document-callback.contract.js";

@Controller("internal/document-requests")
export class InternalDocumentController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(":documentRequestId/callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async processCallback(
    @Body() payload: DocumentCallbackRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<DocumentCallbackDto> {
    return this.commandBus.execute(
      new ProcessDocumentCallbackCommand(
        payload,
        correlationId?.trim() || randomUUID(),
      ),
    );
  }
}
