import {
  ADMIN_ACCOUNT_FILTERS,
  ADMIN_ACCOUNT_QUERY_LIMITS as L,
  ADMIN_ACCOUNT_REFERENCE_TYPES as R,
  AUTH_ACCOUNT_STATUSES,
  AUTH_USER_ROLES,
  ADMIN_ACCOUNT_ERRORS as E,
  type AdminUserListResponse,
  type AdminUserSummary,
  type AuthAccountStatus,
  type AuthUserRole,
} from "@lcsp/contracts/auth";
import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
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

function invalidInput(correlationId: string): never {
  throw problemException(E.invalidInput, correlationId, {
    status: HttpStatus.BAD_REQUEST,
  });
}

function parseInteger(
  v: unknown,
  fallback: number,
  max: number,
  correlationId?: string,
): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n =
    typeof v === "number"
      ? v
      : typeof v === "string" && /^\d+$/.test(v.trim())
        ? Number(v.trim())
        : NaN;
  if (!Number.isInteger(n) || n < 1 || n > max) {
    if (correlationId) return invalidInput(correlationId);
    return fallback;
  }
  return n;
}

function parseListQueryParams(
  raw: Record<string, unknown>,
  correlationId: string,
) {
  const scalar = (key: string): string | undefined => {
    const value = raw[key];
    if (value === undefined) return undefined;
    if (typeof value !== "string") return invalidInput(correlationId);
    return value;
  };
  const rawQuery = scalar("query") ?? scalar("q");
  if (rawQuery !== undefined && rawQuery.length > L.maxQueryLength)
    return invalidInput(correlationId);
  const query = rawQuery?.trim() ?? "";
  const rawStatus = scalar("status");
  const status: AuthAccountStatus | undefined =
    rawStatus === undefined || rawStatus === ADMIN_ACCOUNT_FILTERS.all
      ? undefined
      : Object.values(AUTH_ACCOUNT_STATUSES).includes(
            rawStatus as AuthAccountStatus,
          )
        ? (rawStatus as AuthAccountStatus)
        : invalidInput(correlationId);
  const rawRole = scalar("role");
  const filterRole: AuthUserRole | undefined =
    rawRole === undefined || rawRole === ADMIN_ACCOUNT_FILTERS.all
      ? undefined
      : Object.values(AUTH_USER_ROLES).includes(rawRole as AuthUserRole)
        ? (rawRole as AuthUserRole)
        : invalidInput(correlationId);
  const page = parseInteger(scalar("page"), 1, L.maxPage, correlationId);
  const pageSize = parseInteger(
    scalar("pageSize") ?? scalar("page_size"),
    L.defaultPageSize,
    L.maxPageSize,
    correlationId,
  );
  return { query, status, role: filterRole, page, pageSize };
}

@QueryHandler(ListAdminUsersQuery)
export class ListAdminUsersHandler implements IQueryHandler<ListAdminUsersQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListAdminUsersQuery): Promise<AdminUserListResponse> {
    const q = parseListQueryParams(query.raw, query.correlationId);
    const accounts = Prisma.sql`
      SELECT "id", COALESCE(NULLIF("displayName", ''), "email") AS "fullName", "email",
             "role"::text AS "role", "accessStatus"::text AS "status", "createdAt", "accessVersion" AS "version", ${R.user}::text AS "referenceType"
      FROM "User"`;
    const escaped = q.query.replace(/[\\%_]/g, (character) => `\\${character}`);
    const predicates = [Prisma.sql`TRUE`];
    if (q.query)
      predicates.push(
        Prisma.sql`("email" ILIKE ${`%${escaped}%`} OR "fullName" ILIKE ${`%${escaped}%`})`,
      );
    if (q.status) predicates.push(Prisma.sql`"status" = ${q.status}`);
    if (q.role) predicates.push(Prisma.sql`"role" = ${q.role}`);
    const filter = Prisma.join(predicates, " AND ");
    return this.prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const counts = await tx.$queryRaw<Array<{ count: bigint }>>(
          Prisma.sql`WITH accounts AS (${accounts}) SELECT count(*) AS count FROM accounts WHERE ${filter}`,
        );
        const rows = await tx.$queryRaw<ListRow[]>(
          Prisma.sql`WITH accounts AS (${accounts}) SELECT * FROM accounts WHERE ${filter} ORDER BY "createdAt" DESC, "id" ASC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
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
          page: q.page,
          pageSize: q.pageSize,
          totalPages: Math.max(1, Math.ceil(totalCount / q.pageSize)),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}
