import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { GetAdminOverviewQuery } from "../../application/queries/index.js";

@Controller("admin/overview")
export class AdminOverviewController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async getOverview(@Query("period") period: string | undefined) {
    return resultEnvelope(
      await this.queryBus.execute(new GetAdminOverviewQuery(period)),
    );
  }
}
