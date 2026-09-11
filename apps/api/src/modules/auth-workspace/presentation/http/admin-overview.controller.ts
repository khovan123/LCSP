import { Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import type { AuthenticatedRequest } from "../../../../common/interfaces/authenticated-request.interface.js";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { AdminOverviewService } from "../../application/services/admin/admin-overview.service.js";

@Controller("admin/overview")
export class AdminOverviewController {
  constructor(private readonly overviewService: AdminOverviewService) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async getOverview(
    @Query("period") period: string | undefined,
    @Req() _request: AuthenticatedRequest,
  ) {
    const data = await this.overviewService.getOverview(period);
    return resultEnvelope(data);
  }
}
