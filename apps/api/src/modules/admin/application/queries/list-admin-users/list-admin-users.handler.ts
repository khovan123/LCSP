import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import type { AdminUserListResponse } from "@lcsp/contracts/auth";
import { AdminAccountReadService } from "../../services/admin-account-read.service.js";
import { ListAdminUsersQuery } from "./list-admin-users.query.js";

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler implements IQueryHandler<ListAdminUsersQuery> {
  constructor(private readonly readService: AdminAccountReadService) {}

  async execute(query: ListAdminUsersQuery): Promise<AdminUserListResponse> {
    return this.readService.list(query.raw, query.correlationId);
  }
}
