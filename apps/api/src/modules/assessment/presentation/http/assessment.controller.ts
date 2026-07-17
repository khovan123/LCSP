import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { CommandBus, QueryBus } from "@nestjs/cqrs";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { CreateAssessmentCommand } from "../../application/commands/create-assessment/create-assessment.command.js";
import { GetAssessmentQuery } from "../../application/queries/get-assessment/get-assessment.query.js";
import { ListAssessmentsQuery } from "../../application/queries/list-assessments/list-assessments.query.js";
import { CreateAssessmentRequest } from "./dto/create-assessment.request.js";

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
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;

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

  @Get()
  @UseGuards(PbacGuard)
  @RequireAction("assessment:list")
  async listAssessments(
    @Query("page") page: string | undefined,
    @Query("page_size") pageSize: string | undefined,
    @Query("status") status: string | undefined,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;

    return this.queryBus.execute(
      new ListAssessmentsQuery(
        pbacContext.organizationId,
        pbacContext.userId,
        pbacContext.subjectRole,
        pbacContext.scope,
        page !== undefined ? Number(page) : undefined,
        pageSize !== undefined ? Number(pageSize) : undefined,
        status,
        request.correlationId as string,
      ),
    );
  }

  @Get(":assessmentId")
  @UseGuards(PbacGuard)
  @RequireAction("assessment:read")
  async getAssessment(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const pbacContext = request.pbacContext;

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
