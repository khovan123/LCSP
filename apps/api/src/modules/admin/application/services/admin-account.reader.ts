import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ADMIN_ACCOUNT_REFERENCE_TYPES as R,
  ADMIN_ERROR_CODES,
  AUTH_ACCOUNT_STATUSES,
  USER_ACCESS_STATUSES,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { AUTH_RECORD_TYPES } from "../../../auth/infrastructure/persistence/auth-record.persistence.js";

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

export async function getAdminUserDetail(
  client: Prisma.TransactionClient,
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
