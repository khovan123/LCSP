import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { Request } from "express";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { PbacRequestContext } from "../../../../platform/pbac/pbac.guard.js";
import { CreateAssessmentCommand } from "../../application/commands/create-assessment/create-assessment.command.js";
import { GetAssessmentQuery } from "../../application/queries/get-assessment/get-assessment.query.js";
import { CreateAssessmentRequest } from "./dto/create-assessment.request.js";

interface AssessmentRequest extends Request {
  pbacContext?: PbacRequestContext;
  correlationId?: string;
}

@Controller("assessments")
export class AssessmentController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(PbacGuard)
  @RequireAction("assessment:create")
  async createAssessment(
    @Body() body: CreateAssessmentRequest,
    @Req() request: AssessmentRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;

    return this.commandBus.execute(
      new CreateAssessmentCommand(
        pbacContext.organizationId,
        pbacContext.userId,
        body.name,
        body.description,
        request.correlationId as string,
      ),
    );
  }

  @Get(":assessmentId")
  @UseGuards(PbacGuard)
  @RequireAction("assessment:read")
  async getAssessment(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AssessmentRequest,
  ) {
    const pbacContext = request.pbacContext as PbacRequestContext;

    return this.queryBus.execute(
      new GetAssessmentQuery(
        assessmentId,
        pbacContext.organizationId,
        pbacContext.userId,
        pbacContext.subjectRole,
        request.correlationId as string,
      ),
    );
  }
}
