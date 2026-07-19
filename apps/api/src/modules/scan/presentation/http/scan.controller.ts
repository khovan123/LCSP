import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import { RequireAction } from "../../../../platform/pbac/decorators/require-action.decorator.js";
import type { PbacRequestContext } from "../../../../platform/pbac/interfaces/pbac-request.interface.js";
import { PbacGuard } from "../../../../platform/pbac/pbac.guard.js";
import type { ScanJobStatusDto } from "../../application/contracts/scan/scan-job-status.contract.js";
import { GetScanJobQuery } from "../../application/queries/get-scan-job/get-scan-job.query.js";

interface ScanStatusRequest {
  pbacContext: PbacRequestContext;
  correlationId: string;
}

@Controller("assessments/:assessmentId/scan-jobs")
export class ScanController {
  constructor(private readonly queryBus: QueryBus) {}

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
}
