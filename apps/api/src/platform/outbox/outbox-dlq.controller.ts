import { Controller, Get, Post, Delete, Param, Req } from "@nestjs/common";
import type { Request } from "express";
import { OutboxDlqService } from "./outbox-dlq.service.js";

import type { AuthenticatedRequest } from "../../common/interfaces/authenticated-request.interface.js";

@Controller("internal/outbox/dlq")
export class OutboxDlqController {
  constructor(private readonly dlqService: OutboxDlqService) {}

  @Get()
  async getDlqMessages() {
    return this.dlqService.getDlqMessages();
  }

  @Post(":id/replay")
  async replayMessage(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Assuming req.user is populated by a standard authentication guard
    // Fallback to "system-admin" if not present in the environment yet
    // chưa có guard nên tạm thời gán admin
    const actorId = req.user?.id || "system-admin";
    await this.dlqService.replayMessage(id, actorId);
    return { success: true, message: `Message ${id} queued for replay` };
  }

  @Delete(":id")
  async deleteMessage(
    @Param("id") id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const actorId = req.user?.id || "system-admin";
    await this.dlqService.deleteMessage(id, actorId);
    return { success: true, message: `Message ${id} permanently deleted` };
  }
}
