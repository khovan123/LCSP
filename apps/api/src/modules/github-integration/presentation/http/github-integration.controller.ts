import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import type { Request } from "express";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
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
  @RequireAction("github:connect")
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
}
