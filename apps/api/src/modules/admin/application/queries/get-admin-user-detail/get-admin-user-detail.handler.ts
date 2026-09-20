import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import type { AdminUserDetail } from "@lcsp/contracts/auth";
import { AdminAccountReadService } from "../../services/admin-account-read.service.js";
import { GetAdminUserDetailQuery } from "./get-admin-user-detail.query.js";

@QueryHandler(GetAdminUserDetailQuery)
export class GetAdminUserDetailHandler implements IQueryHandler<GetAdminUserDetailQuery> {
  constructor(private readonly readService: AdminAccountReadService) {}

  async execute(query: GetAdminUserDetailQuery): Promise<AdminUserDetail> {
    return this.readService.detail(query.id, query.correlationId);
  }
}
