import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Req,
  UseGuards,
} from "@nestjs/common";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import { OutboxDlqService } from "./outbox-dlq.service.js";

import type { AuthenticatedRequest } from "../../common/interfaces/authenticated-request.interface.js";
import { RequireAction } from "../pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../pbac/pbac.guard.js";
import { resultEnvelope } from "../problems/result-envelope.js";

@Controller("internal/outbox/dlq")
@UseGuards(PbacGuard)
@RequireAction(PBAC_ACTIONS.outboxReplay)
export class OutboxDlqController {
  constructor(private readonly dlqService: OutboxDlqService) {}

  @Get()
  async getDlqMessages() {
    return resultEnvelope(await this.dlqService.getDlqMessages());
  }

  @Post(":id/replay")
  async replayMessage(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.dlqService.replayMessage(
      id,
      req.pbacContext.userId,
      req.pbacContext.organizationId,
      req.correlationId ?? "outbox-dlq-replay",
    );
    return resultEnvelope({
      success: true,
      message: `Message ${id} queued for replay`,
    });
  }

  @Delete(":id")
  async deleteMessage(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    await this.dlqService.deleteMessage(
      id,
      req.pbacContext.userId,
      req.pbacContext.organizationId,
      req.correlationId ?? "outbox-dlq-delete",
    );
    return resultEnvelope({
      success: true,
      message: `Message ${id} permanently deleted`,
    });
  }
}
