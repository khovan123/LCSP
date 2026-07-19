import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireAnyAction } from "../../../../platform/pbac/decorators/require-any-action.decorator.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import { GetEvidenceQuery } from "../../application/queries/get-evidence/get-evidence.query.js";

@Controller("assessments")
export class EvidenceController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(":assessmentId/evidence")
  @UseGuards(PbacGuard)
  @RequireAnyAction(
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.evidenceReadRedacted,
  )
  async getEvidence(
    @Param("assessmentId") assessmentId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const context = request.pbacContext;
    return this.queryBus.execute(
      new GetEvidenceQuery(
        assessmentId,
        context.organizationId,
        context.scope,
        context.selectedAction,
        request.correlationId as string,
      ),
    );
  }
}
