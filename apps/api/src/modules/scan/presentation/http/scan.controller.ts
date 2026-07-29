import { randomUUID } from "node:crypto";

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { ScanJobStatusDto } from "../../application/contracts/scan/scan-job-status.contract.js";
import type {
  ScanCallbackDto,
  ScanCallbackRequest,
} from "../../application/contracts/scan/scan-callback.contract.js";
import { ProcessScanCallbackCommand } from "../../application/commands/process-scan-callback/process-scan-callback.command.js";
import { GetScanJobQuery } from "../../application/queries/get-scan-job/get-scan-job.query.js";
import { RerunScanCommand } from "../../application/commands/rerun-scan/rerun-scan.command.js";
import type { RerunScanRequestDto, RerunScanResponseDto } from "../../application/contracts/scan/rerun-scan.contract.js";
import { WorkerApiKeyGuard } from "./worker-api-key.guard.js";

interface ScanStatusRequest {
  pbacContext: PbacRequestContext;
  correlationId: string;
}

@Controller("assessments/:assessmentId/scan-jobs")
export class ScanController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get(":scanJobId")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.scanRead)
  async getScanJob(
    @Param("assessmentId") assessmentId: string,
    @Param("scanJobId") scanJobId: string,
    @Req() request: ScanStatusRequest,
  ): Promise<ScanJobStatusDto> {
    const context = request.pbacContext;
    return this.queryBus.execute(
      new GetScanJobQuery(
        assessmentId,
        scanJobId,
        context.organizationId,
        context.subjectRole,
        context.scope,
        request.correlationId,
      ),
    );
  }

  @Post("rerun")
  @HttpCode(201)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.scanTrigger)
  async rerunScan(
    @Param("assessmentId") assessmentId: string,
    @Body() payload: RerunScanRequestDto,
    @Req() request: ScanStatusRequest,
  ): Promise<RerunScanResponseDto> {
    return this.commandBus.execute(
      new RerunScanCommand(
        assessmentId,
        payload.snapshot_id,
        payload.idempotency_key,
        request.pbacContext,
        request.correlationId,
        payload.reason,
      ),
    );
  }
}

@Controller("internal/scan-jobs")
export class InternalScanController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(":scanJobId/callback")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async processCallback(
    @Param("scanJobId") scanJobId: string,
    @Body() payload: ScanCallbackRequest,
    @Headers("x-correlation-id") correlationId?: string,
  ): Promise<ScanCallbackDto> {
    return this.commandBus.execute(
      new ProcessScanCallbackCommand(
        scanJobId,
        payload,
        correlationId?.trim() || randomUUID(),
      ),
    );
  }
}
