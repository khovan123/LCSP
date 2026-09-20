import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  ADMIN_ERROR_CODES,
  AUTH_AUDIT_EVENT_TYPES,
  AUTH_USER_ROLES,
  ADMIN_ACCOUNT_ERRORS as E,
  ADMIN_ACCOUNT_OPERATIONS as O,
  USER_ACCESS_STATUSES as S,
  type AdminAccountOperation,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { AuthAuditService } from "../../../auth/application/services/auth/auth-audit.service.js";
import { AUTH_RECORD_TYPES } from "../../../auth/infrastructure/persistence/auth-record.persistence.js";
import {
  accountTransaction,
  assertCurrentAdmin,
  receipt,
  replay,
  requestHash,
  type AdminActor,
} from "../../infrastructure/persistence/admin-account.transaction.js";
import { fetchAdminUserDetail } from "../queries/get-admin-user-detail/get-admin-user-detail.handler.js";
import { isRecord, cleanString } from "../../../../common/utils/index.js";

function invalidInput(correlationId: string): never {
  throw problemException(E.invalidInput, correlationId, {
    status: HttpStatus.BAD_REQUEST,
  });
}

export function parseMutationInput(
  raw: unknown,
  correlationId: string,
): { expectedVersion: number; reason?: string } {
  if (!isRecord(raw)) return invalidInput(correlationId);
  const keys = Object.keys(raw);
  if (keys.some((key) => key !== "expectedVersion" && key !== "reason")) {
    return invalidInput(correlationId);
  }
  const v = raw.expectedVersion;
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0) {
    return invalidInput(correlationId);
  }
  let safeReason: string | undefined;
  if (raw.reason !== undefined) {
    if (
      typeof raw.reason !== "string" ||
      !raw.reason.trim() ||
      raw.reason.length > 500
    ) {
      return invalidInput(correlationId);
    }
    safeReason = raw.reason.trim();
  }
  return { expectedVersion: v, reason: safeReason };
}

export async function executeAdminAccountMutation(
  prisma: PrismaService,
  audit: AuthAuditService,
  id: string,
  operation: AdminAccountOperation,
  rawBody: unknown,
  actor: AdminActor,
): Promise<AdminUserDetail> {
  const { expectedVersion, reason: safeReason } = parseMutationInput(
    rawBody,
    actor.correlationId,
  );
  const hash = requestHash(operation, {
    id,
    expectedVersion,
    reason: safeReason,
  });

  return accountTransaction(prisma, actor.correlationId, async (tx) => {
    await assertCurrentAdmin(tx, actor);
    const previous = await replay(tx, actor, operation, hash);
    if (previous) {
      return {
        ...(await fetchAdminUserDetail(
          tx,
          previous.resourceId,
          actor.correlationId,
        )),
        replayed: true,
      };
    }

    // Lock target row to serialize against concurrent session issuance
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "User" WHERE "id" = ${id} FOR UPDATE`,
    );
    const target = await tx.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        accessStatus: true,
        accessVersion: true,
      },
    });

    if (!target) {
      throw problemException(
        ADMIN_ERROR_CODES.userNotFound,
        actor.correlationId,
        { status: HttpStatus.NOT_FOUND },
      );
    }
    if (target.accessVersion !== expectedVersion) {
      throw problemException(E.staleVersion, actor.correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }
    if (operation === O.suspend && id === actor.userId) {
      throw problemException(E.selfSuspend, actor.correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }
    if (
      (operation === O.suspend && target.accessStatus !== S.active) ||
      (operation === O.restore && target.accessStatus !== S.suspended)
    ) {
      throw problemException(E.invalidState, actor.correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }
    if (target.role === AUTH_USER_ROLES.admin && operation === O.suspend) {
      const now = new Date();
      const remaining = await tx.user.count({
        where: {
          id: { not: id },
          role: AUTH_USER_ROLES.admin,
          accessStatus: S.active,
          emailVerified: true,
          AND: [
            { OR: [{ lockUntil: null }, { lockUntil: { lte: now } }] },
            {
              OR: [{ mfaLockedUntil: null }, { mfaLockedUntil: { lte: now } }],
            },
          ],
        },
      });
      if (remaining === 0) {
        throw problemException(E.lastUsableAdmin, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      }
    }

    const newStatus = operation === O.suspend ? S.suspended : S.active;
    const result = await tx.user.updateMany({
      where: {
        id,
        accessVersion: expectedVersion,
        accessStatus: target.accessStatus,
      },
      data: {
        accessVersion: { increment: 1 },
        accessStatus: newStatus,
      },
    });
    if (result.count !== 1) {
      throw problemException(E.staleVersion, actor.correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }

    // Suspension revokes sessions. Restore never revives an old session.
    if (operation === O.suspend) {
      await tx.authRecord.updateMany({
        where: {
          userId: id,
          type: AUTH_RECORD_TYPES.session,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
    }

    await audit.writeInTx(
      {
        eventType:
          operation === O.suspend
            ? AUTH_AUDIT_EVENT_TYPES.authAdminUserSuspended
            : AUTH_AUDIT_EVENT_TYPES.authAdminUserRestored,
        actorId: actor.userId,
        sessionId: actor.sessionId,
        correlationId: actor.correlationId,
        resourceType: AUDIT_RESOURCE_TYPES.authAccount,
        resourceId: id,
        decision: AUDIT_DECISIONS.allow,
        payload: {
          targetUserId: id,
          previousStatus: target.accessStatus,
          newStatus,
          previousVersion: expectedVersion,
          newVersion: expectedVersion + 1,
          reason: safeReason,
          changed: true,
          timestamp: new Date().toISOString(),
        },
      },
      tx,
    );

    await receipt(tx, actor, operation, hash, id);
    return {
      ...(await fetchAdminUserDetail(tx, id, actor.correlationId)),
      replayed: false,
    };
  });
}
