import {
  ADMIN_ERROR_CODES,
  AUTH_ACCOUNT_STATUSES,
  ADMIN_ACCOUNT_REFERENCE_TYPES as R,
  USER_ACCESS_STATUSES,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { HttpStatus } from "@nestjs/common";
import { QueryHandler, type IQueryHandler } from "@nestjs/cqrs";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AUTH_RECORD_TYPES } from "../../../../auth/infrastructure/persistence/auth-record.persistence.js";
import { GetAdminUserDetailQuery } from "./get-admin-user-detail.query.js";

const IDENTITY_SELECT = {
  id: true,
  displayName: true,
  email: true,
  role: true,
  accessStatus: true,
  accessVersion: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

const WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export async function fetchAdminUserDetail(
  client: Prisma.TransactionClient | PrismaService,
  id: string,
  correlationId: string,
): Promise<AdminUserDetail> {
  const user = await client.user.findUnique({
    where: { id },
    select: IDENTITY_SELECT,
  });
  if (!user) {
    throw problemException(ADMIN_ERROR_CODES.userNotFound, correlationId, {
      status: HttpStatus.NOT_FOUND,
    });
  }
  const now = new Date();
  const [assessments30d, lastAssessment, activity] = await Promise.all([
    client.assessment.count({
      where: {
        ownerId: id,
        createdAt: { gte: new Date(now.getTime() - WINDOW_MS), lte: now },
      },
    }),
    client.assessment.aggregate({
      where: { ownerId: id },
      _max: { createdAt: true },
    }),
    client.authRecord.aggregate({
      where: { userId: id, type: AUTH_RECORD_TYPES.session },
      _max: { createdAt: true },
    }),
  ]);
  return {
    id: user.id,
    fullName: user.displayName || user.email,
    email: user.email,
    role: user.role,
    status:
      user.accessStatus === USER_ACCESS_STATUSES.suspended
        ? AUTH_ACCOUNT_STATUSES.suspended
        : AUTH_ACCOUNT_STATUSES.active,
    referenceType: R.user,
    version: user.accessVersion,
    createdAt: user.createdAt.toISOString(),
    lastActiveAt: activity._max.createdAt?.toISOString() ?? null,
    usageSummary: {
      assessments30d,
      lastAssessmentAt: lastAssessment._max.createdAt?.toISOString() ?? null,
      creditSpend30d: null,
      openFindingsCount: null,
    },
  };
}

@QueryHandler(GetAdminUserDetailQuery)
export class GetAdminUserDetailHandler implements IQueryHandler<GetAdminUserDetailQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetAdminUserDetailQuery): Promise<AdminUserDetail> {
    return fetchAdminUserDetail(this.prisma, query.id, query.correlationId);
  }
}
