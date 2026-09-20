import {
  ADMIN_ACCOUNT_FILTERS,
  ADMIN_ACCOUNT_QUERY_LIMITS as L,
  ADMIN_ACCOUNT_REFERENCE_TYPES as R,
  type AdminUserListResponse,
  type AdminUserSummary,
  type AuthAccountStatus,
  type AuthUserRole,
} from "@lcsp/contracts/auth";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { AUTH_RECORD_TYPES } from "../../../../auth/infrastructure/persistence/auth-record.persistence.js";
import { ListAdminUsersQuery } from "./list-admin-users.query.js";

type ListRow = {
  id: string;
  fullName: string;
  email: string;
  role: AuthUserRole;
  status: AuthAccountStatus;
  createdAt: Date;
  version: number;
  referenceType: typeof R.user;
};

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler implements IQueryHandler<ListAdminUsersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListAdminUsersQuery): Promise<AdminUserListResponse> {
    const page = query.params.page ?? 1;
    const pageSize =
      query.params.pageSize ?? query.params.page_size ?? L.defaultPageSize;
    const searchQuery = (query.params.query ?? query.params.q)?.trim() ?? "";
    const filterStatus =
      query.params.status === ADMIN_ACCOUNT_FILTERS.all
        ? undefined
        : (query.params.status as AuthAccountStatus | undefined);
    const filterRole =
      query.params.role === ADMIN_ACCOUNT_FILTERS.all
        ? undefined
        : (query.params.role as AuthUserRole | undefined);

    const accounts = Prisma.sql`
      SELECT "id", COALESCE(NULLIF("displayName", ''), "email") AS "fullName", "email",
             "role"::text AS "role", "accessStatus"::text AS "status", "createdAt", "accessVersion" AS "version", ${R.user}::text AS "referenceType"
      FROM "User"`;
    const escaped = searchQuery.replace(
      /[\\%_]/g,
      (character) => `\\${character}`,
    );
    const predicates = [Prisma.sql`TRUE`];
    if (searchQuery)
      predicates.push(
        Prisma.sql`("email" ILIKE ${`%${escaped}%`} OR "fullName" ILIKE ${`%${escaped}%`})`,
      );
    if (filterStatus) predicates.push(Prisma.sql`"status" = ${filterStatus}`);
    if (filterRole) predicates.push(Prisma.sql`"role" = ${filterRole}`);
    const filter = Prisma.join(predicates, " AND ");
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const counts = await tx.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`WITH accounts AS (${accounts}) SELECT count(*) AS count FROM accounts WHERE ${filter}`,
        );
        const rows = await tx.$queryRaw<ListRow[]>(
          Prisma.sql`WITH accounts AS (${accounts}) SELECT * FROM accounts WHERE ${filter} ORDER BY "createdAt" DESC, "id" ASC LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`,
        );
        const ids = rows.map((row) => row.id);
        const assessmentCounts = ids.length
          ? await tx.assessment.groupBy({
              by: ["ownerId"],
              where: { ownerId: { in: ids } },
              _count: { _all: true },
            })
          : [];
        const activity = ids.length
          ? await tx.authRecord.groupBy({
              by: ["userId"],
              where: { userId: { in: ids }, type: AUTH_RECORD_TYPES.session },
              _max: { createdAt: true },
            })
          : [];
        const users: AdminUserSummary[] = rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          assessmentCount:
            assessmentCounts.find((entry) => entry.ownerId === row.id)?._count
              ._all ?? 0,
          lastActiveAt:
            activity
              .find((entry) => entry.userId === row.id)
              ?._max.createdAt?.toISOString() ?? null,
        }));
        const totalCount = Number(counts[0]?.count ?? 0);
        return {
          users,
          totalCount,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
