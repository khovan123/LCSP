import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import type { AdminUserDetail } from "@lcsp/contracts/auth";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { getAdminUserDetail } from "../../support/admin-account.reader.js";
import { GetAdminUserDetailQuery } from "./get-admin-user-detail.query.js";

@QueryHandler(GetAdminUserDetailQuery)
export class GetAdminUserDetailHandler implements IQueryHandler<GetAdminUserDetailQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAdminUserDetailQuery): Promise<AdminUserDetail> {
    return getAdminUserDetail(this.prisma, query.id, query.correlationId);
  }
}
