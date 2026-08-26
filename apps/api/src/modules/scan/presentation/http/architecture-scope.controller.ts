import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { QueryBus, CommandBus } from "@nestjs/cqrs";
import type { Request } from "express";

import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { GetArchitectureScopeQuery } from "../../application/queries/get-architecture-scope/get-architecture-scope.query.js";
import { SaveArchitectureScopeCommand } from "../../application/commands/save-architecture-scope/save-architecture-scope.command.js";
import { TriggerMultiRepoScanCommand } from "../../application/commands/trigger-multi-repo-scan/trigger-multi-repo-scan.command.js";
import { randomUUID } from "node:crypto";

interface ArchitectureScopeRequest extends Request {
  pbacContext: PbacRequestContext;
  correlationId: string;
}

@Controller("assessments/:assessmentId/architecture-scope")
export class ArchitectureScopeController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.scanRead)
  async getArchitectureScope(
    @Param("assessmentId") assessmentId: string,
    @Req() request: ArchitectureScopeRequest,
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.queryBus.execute(
        new GetArchitectureScopeQuery(context.organizationId, assessmentId),
      ),
    );
  }

  @Post()
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.scanTrigger)
  async saveArchitectureScope(
    @Param("assessmentId") assessmentId: string,
    @Body() body: any,
    @Req() request: ArchitectureScopeRequest,
  ) {
    const context = request.pbacContext;
    return resultEnvelope(
      await this.commandBus.execute(
        new SaveArchitectureScopeCommand(
          context.organizationId,
          assessmentId,
          body.globalDeclaration,
          body.repositories,
        ),
      ),
    );
  }

  @Post("trigger")
  @HttpCode(202)
  @UseGuards(PbacGuard)
  @RequireAction(PBAC_ACTIONS.scanTrigger)
  async triggerMultiRepoScan(
    @Param("assessmentId") assessmentId: string,
    @Req() request: ArchitectureScopeRequest,
  ) {
    const context = request.pbacContext;
    const correlationId = (request as any).correlationId ?? randomUUID();
    return resultEnvelope(
      await this.commandBus.execute(
        new TriggerMultiRepoScanCommand(
          assessmentId,
          randomUUID(), // idempotency key — unique per trigger request
          context,
          correlationId,
        ),
      ),
    );
  }
}
