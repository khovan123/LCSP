import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import { WorkerApiKeyGuard } from "../../../scan/presentation/http/worker-api-key.guard.js";
import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { AcceptConflictCommand } from "../../application/commands/accept-conflict/accept-conflict.command.js";
import type {
  ConflictDetectionCallbackDto,
  ConflictDetectionCallbackRequest,
} from "../../application/contracts/reconciliation/conflict-detection-callback.contract.js";
import type { ConflictListDto } from "../../application/contracts/reconciliation/conflict-list.contract.js";
import { ListConflictsQuery } from "../../application/queries/list-conflicts/list-conflicts.query.js";

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

@Controller("assessments")
export class ReconciliationController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(":assessmentId/conflicts")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.conflictRead)
  async listConflicts(
    @Param("assessmentId") assessmentId: string,
    @Query("status") status: string | undefined,
    @Query("page") page: string | undefined,
    @Query("page_size") pageSize: string | undefined,
    @Req() request: AuthenticatedRequest,
  ): Promise<ConflictListDto> {
    const pbacContext = request.pbacContext;

    return this.queryBus.execute(
      new ListConflictsQuery(
        assessmentId,
        pbacContext.organizationId,
        pbacContext.userId,
        pbacContext.subjectRole,
        page !== undefined ? Number(page) : undefined,
        pageSize !== undefined ? Number(pageSize) : undefined,
        status,
        request.correlationId as string,
      ),
    );
  }
}
