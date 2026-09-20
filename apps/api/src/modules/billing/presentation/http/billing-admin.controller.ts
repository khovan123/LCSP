import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { RequireRoles } from "../../../../platform/rbac/decorators/require-roles.decorator.js";
import { RbacGuard } from "../../../../platform/rbac/rbac.guard.js";
import { resultEnvelope } from "../../../../platform/problems/result-envelope.js";
import {
  BillingAdminRevenueService,
  normalizeBillingAdminGateway,
  normalizeBillingAdminFilter,
  normalizeBillingAdminPeriod,
} from "../../application/services/billing-admin-revenue.service.js";

@Controller("admin/billing")
@UseGuards(RbacGuard)
@RequireRoles(AUTH_USER_ROLES.admin)
export class BillingAdminController {
  constructor(private readonly revenue: BillingAdminRevenueService) {}

  @Get()
  async getDashboard(
    @Query("period") period?: string,
    @Query("status") status?: string,
    @Query("gateway") gateway?: string,
    @Query("page") rawPage?: string,
    @Query("pageSize") rawPageSize?: string,
  ) {
    const normalizedPeriod = normalizeBillingAdminPeriod(period);
    const normalizedStatus = normalizeBillingAdminFilter(status);
    const page = parsePositiveInteger(rawPage, 1);
    const pageSize = Math.min(parsePositiveInteger(rawPageSize, 20), 100);
    return resultEnvelope(
      await this.revenue.getDashboard({
        period: normalizedPeriod,
        status: normalizedStatus,
        gateway: normalizeBillingAdminGateway(gateway),
        page,
        pageSize,
      }),
    );
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
