import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import type { AdminOverviewStats } from "@lcsp/contracts/auth";
import { AdminOverviewService } from "../../services/admin-overview.service.js";
import { GetAdminOverviewQuery } from "./get-admin-overview.query.js";

@QueryHandler(GetAdminOverviewQuery)
export class GetAdminOverviewHandler implements IQueryHandler<GetAdminOverviewQuery> {
  constructor(private readonly overviewService: AdminOverviewService) {}

  async execute(query: GetAdminOverviewQuery): Promise<AdminOverviewStats> {
    return this.overviewService.getOverview(query.period);
  }
}
