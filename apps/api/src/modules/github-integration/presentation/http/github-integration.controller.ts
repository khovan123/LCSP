import {
  Controller,
  Get,
  Headers,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import type { Request } from "express";

import { createCorrelationId } from "../../../auth-workspace/infrastructure/security/security.utils.js";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { GitHubAppCallbackCommand } from "../../application/commands/github-app-callback/github-app-callback.command.js";
import { GitHubAppStartCommand } from "../../application/commands/github-app-start/github-app-start.command.js";

interface GitHubIntegrationRequest extends Request {
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

@Controller("github")
export class GitHubIntegrationController {
  constructor(private readonly commandBus: CommandBus) {}

  @Get("app/start")
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.githubConnect)
  async startAppInstallation(
    @Query("redirect_uri") redirectUri: string | undefined,
    @Query("assessment_id") assessmentId: string | undefined,
    @Req() request: GitHubIntegrationRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;

    return this.commandBus.execute(
      new GitHubAppStartCommand(
        pbacContext.organizationId,
        pbacContext.userId,
        redirectUri,
        assessmentId,
        request.correlationId as string,
      ),
    );
  }

  @Get("app/callback")
  async handleAppCallback(
    @Query("installation_id") installationId: string,
    @Query("code") code: string,
    @Query("state") state: string,
    @Headers("x-correlation-id") correlationId: string | undefined,
  ) {
    return this.commandBus.execute(
      new GitHubAppCallbackCommand(
        installationId,
        code,
        state,
        correlationId ?? createCorrelationId(),
      ),
    );
  }
}
