import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { QueryBus } from "@nestjs/cqrs";
import {
  adminOverviewQuerySchema,
  AUTH_USER_ROLES,
  type AdminOverviewQueryInput,
} from "@lcsp/contracts/auth";

import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe.js";
import { GetAdminOverviewQuery } from "../../application/queries/index.js";

@Controller("admin/overview")
export class AdminOverviewController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @UseGuards(RbacGuard)
  @RequireRoles(AUTH_USER_ROLES.admin)
  async getOverview(
    @Query(new ZodValidationPipe(adminOverviewQuerySchema))
    query: AdminOverviewQueryInput,
  ) {
    return resultEnvelope(
      await this.queryBus.execute(new GetAdminOverviewQuery(query.period)),
    );
  }
}
