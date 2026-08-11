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
import {
  TARGETED_REANALYSIS_REQUEST_STATES,
  type TargetedReanalysisTerminalState,
} from "@lcsp/contracts/scan";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { ScanCallbackRequest } from "../../application/contracts/scan/scan-callback.contract.js";
import { ProcessScanCallbackCommand } from "../../application/commands/process-scan-callback/process-scan-callback.command.js";
import { GetScanJobQuery } from "../../application/queries/get-scan-job/get-scan-job.query.js";
import { RerunScanCommand } from "../../application/commands/rerun-scan/rerun-scan.command.js";
import type { RerunScanRequestDto } from "../../application/contracts/scan/rerun-scan.contract.js";
import { WorkerApiKeyGuard } from "./worker-api-key.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";

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
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.queryBus.execute(
        new GetScanJobQuery(
          assessmentId,
          scanJobId,
          context.organizationId,
          context.subjectRole,
          context.scope,
          request.correlationId,
        ),
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
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new RerunScanCommand(
          assessmentId,
          payload.snapshot_id,
          payload.idempotency_key,
          request.pbacContext,
          request.correlationId,
          payload.reason,
        ),
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
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new ProcessScanCallbackCommand(
          scanJobId,
          payload,
          correlationId?.trim() || randomUUID(),
        ),
      ),
    );
  }
}

interface TargetedReanalysisTerminalPayload {
  state: TargetedReanalysisTerminalState;
  safe_failure_code?: string;
  output_evidence_report_id?: string;
}

@Controller("internal/targeted-reanalysis")
export class InternalTargetedReanalysisController {
  constructor(private readonly prisma: PrismaService) {}

  @Get(":requestId")
  @UseGuards(WorkerApiKeyGuard)
  async getRequest(@Param("requestId") requestId: string) {
    const request = await this.prisma.targetedReanalysisRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        assessmentId: true,
        inputEvidenceReportId: true,
        snapshotId: true,
        commitSha: true,
        analyzerId: true,
        normalizedScope: true,
        reasonRequirementId: true,
        checkpointRef: true,
        state: true,
        correlationId: true,
      },
    });
    return resultEnvelope(request);
  }

  @Post(":requestId/claim")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async claimRequest(@Param("requestId") requestId: string) {
    const request = await this.prisma.targetedReanalysisRequest.updateMany({
      where: {
        id: requestId,
        state: {
          in: [
            TARGETED_REANALYSIS_REQUEST_STATES.queued,
            TARGETED_REANALYSIS_REQUEST_STATES.dispatched,
          ],
        },
      },
      data: { state: TARGETED_REANALYSIS_REQUEST_STATES.running },
    });
    return resultEnvelope({ claimed: request.count === 1 });
  }

  @Post(":requestId/terminal")
  @HttpCode(200)
  @UseGuards(WorkerApiKeyGuard)
  async setTerminalState(
    @Param("requestId") requestId: string,
    @Body() payload: TargetedReanalysisTerminalPayload,
  ) {
    const request = await this.prisma.targetedReanalysisRequest.update({
      where: { id: requestId },
      data: {
        state: payload.state,
        safeFailureCode: payload.safe_failure_code,
        outputEvidenceReportId: payload.output_evidence_report_id,
      },
      select: { id: true, state: true, checkpointRef: true },
    });
    return resultEnvelope(request);
  }
}
