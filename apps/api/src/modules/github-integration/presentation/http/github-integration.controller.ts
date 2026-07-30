import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import type { Response } from "express";

import { createCorrelationId } from "../../../auth-workspace/infrastructure/security/security.utils.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { GitHubAppCallbackCommand } from "../../application/commands/github-app-callback/github-app-callback.command.js";
import { GitHubAppStartCommand } from "../../application/commands/github-app-start/github-app-start.command.js";
import { PinSnapshotCommand } from "../../application/commands/pin-snapshot/pin-snapshot.command.js";
import { TriggerScanCommand } from "../../application/commands/trigger-scan/trigger-scan.command.js";
import type { PinSnapshotDto } from "../../application/contracts/github-integration/pin-snapshot.contract.js";
import type { TriggerScanDto } from "../../application/contracts/github-integration/trigger-scan.contract.js";
import { PinSnapshotRequest } from "./dto/pin-snapshot.request.js";
import { TriggerScanRequest } from "./dto/trigger-scan.request.js";
import {
  ScanTriggerGuard,
  type ScanTriggerRequestContext,
} from "./scan-trigger.guard.js";

interface GitHubIntegrationRequest extends ScanTriggerRequestContext {
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

@Controller()
export class GitHubIntegrationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Get("github/app/start")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.githubConnect)
  async startAppInstallation(
    @Query("redirect_uri") redirectUri: string | undefined,
    @Query("assessment_id") assessmentId: string | undefined,
    @Req() request: GitHubIntegrationRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;

    return resultEnvelope(
      await this.commandBus.execute(
        new GitHubAppStartCommand(
          pbacContext.organizationId,
          pbacContext.userId,
          redirectUri,
          assessmentId,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Get("github/app/callback")
  async handleAppCallback(
    @Query("installation_id") installationId: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Headers("x-correlation-id") correlationId: string | undefined,
  ) {
    return resultEnvelope(
      await this.commandBus.execute(
        new GitHubAppCallbackCommand(
          installationId,
          code,
          state,
          correlationId ?? createCorrelationId(),
        ),
      ),
    );
  }

  @Post("assessments/:assessmentId/snapshots")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.snapshotCreate)
  async pinSnapshot(
    @Param("assessmentId") assessmentId: string,
    @Body() body: PinSnapshotRequest,
    @Req() request: GitHubIntegrationRequest,
  ) {
    const context = request.pbacContext as PbacRequestContext;
    return resultEnvelope(
      await this.commandBus.execute<PinSnapshotCommand, PinSnapshotDto>(
        new PinSnapshotCommand(
          assessmentId,
          context.organizationId,
          context.userId,
          context.subjectRole,
          context.scope ?? undefined,
          body.connection_id,
          body.branch,
          body.ref,
          body.commit_sha,
          request.correlationId as string,
        ),
      ),
    );
  }

  @Post("assessments/:assessmentId/scan-jobs")
  @UseGuards(ScanTriggerGuard)
  @RequireAction(PBAC_ACTIONS.scanTrigger)
  async triggerScan(
    @Param("assessmentId") assessmentId: string,
    @Body() body: TriggerScanRequest,
    @Req() request: GitHubIntegrationRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const context = request.pbacContext;
    const result = await this.commandBus.execute<
      TriggerScanCommand,
      TriggerScanDto
    >(
      new TriggerScanCommand(
        assessmentId,
        body.snapshot_id,
        request.scanTriggerSource as TriggerScanCommand["triggerSource"],
        body.idempotency_key,
        context?.userId ?? null,
        context?.organizationId ?? null,
        context?.subjectRole ?? null,
        context?.scope ?? undefined,
        request.correlationId ?? createCorrelationId(),
      ),
    );
    response.status(result.is_new ? 201 : 200);
    return resultEnvelope(result);
  }
}
