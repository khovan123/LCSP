import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import {
  BILLING_ERROR_CODES,
  billingAdminDashboardQuerySchema,
  type BillingAdminDashboardQuery,
} from "@lcsp/contracts/billing";
import { ZodValidationPipe } from "../../../../common/pipes/zod-validation.pipe.ts";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import { BillingAdminRevenueService } from "../../application/services/billing-admin-revenue.service.js";

@Controller("admin/billing")
@UseGuards(RbacGuard)
@RequireRoles(AUTH_USER_ROLES.admin)
export class BillingAdminController {
  constructor(private readonly revenue: BillingAdminRevenueService) {}

  @Get()
  async getDashboard(
    @Query(
      new ZodValidationPipe(
        billingAdminDashboardQuerySchema,
        BILLING_ERROR_CODES.validationFailed,
      ),
    )
    query: BillingAdminDashboardQuery,
  ) {
    return resultEnvelope(await this.revenue.getDashboard(query));
  }
}
