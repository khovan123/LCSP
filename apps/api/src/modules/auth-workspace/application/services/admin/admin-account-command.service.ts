import { HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  ADMIN_ACCOUNT_ERRORS as E,
  ADMIN_ACCOUNT_OPERATIONS as O,
  ADMIN_ERROR_CODES,
  AUTH_AUDIT_EVENT_TYPES,
  AUTH_USER_ROLES,
  USER_ACCESS_STATUSES as S,
  type AdminAccountOperation,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AUTH_RECORD_TYPES } from "../../../infrastructure/persistence/auth-record.persistence.js";
import { AuthAuditService } from "../auth-workspace/auth-audit.service.js";
import { AdminAccountReadService } from "./admin-account-read.service.js";
import {
  accountTransaction,
  assertCurrentAdmin,
  receipt,
  replay,
  requestHash,
  type AdminActor,
} from "./admin-account.transaction.js";
import {
  invalid,
  record,
  reason,
  role,
  version,
} from "./admin-account.validation.js";

@Injectable()
export class AdminAccountCommandService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
    private readonly reads: AdminAccountReadService,
  ) {}

  async mutate(
    id: string,
    operation: AdminAccountOperation,
    raw: unknown,
    actor: AdminActor,
  ): Promise<AdminUserDetail> {
    if (![O.role, O.suspend, O.restore].some((value) => value === operation))
      return invalid(actor.correlationId);
    const input = record(
      raw,
      actor.correlationId,
      operation === O.role
        ? ["role", "expectedVersion"]
        : ["expectedVersion", "reason"],
    );
    const expectedVersion = version(input.expectedVersion, actor.correlationId);
    const newRole =
      operation === O.role ? role(input.role, actor.correlationId) : undefined;
    const safeReason =
      operation === O.role
        ? undefined
        : reason(input.reason, actor.correlationId);
    const hash = requestHash(operation, {
      id,
      expectedVersion,
      role: newRole,
      reason: safeReason,
    });
    return accountTransaction(this.prisma, actor.correlationId, async (tx) => {
      await assertCurrentAdmin(tx, actor);
      const previous = await replay(tx, actor, operation, hash);
      if (previous)
        return {
          ...(await this.reads.detail(
            previous.resourceId,
            actor.correlationId,
            tx,
          )),
          replayed: true,
        };
      // Lock the target row to serialize against concurrent session issuance.
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
      if (!target)
        throw problemException(
          ADMIN_ERROR_CODES.userNotFound,
          actor.correlationId,
          { status: HttpStatus.NOT_FOUND },
        );
      if (target.accessVersion !== expectedVersion)
        throw problemException(E.staleVersion, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      if (operation === O.suspend && id === actor.userId)
        throw problemException(E.selfSuspend, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      if (
        (operation === O.suspend && target.accessStatus !== S.active) ||
        (operation === O.restore && target.accessStatus !== S.suspended) ||
        (operation === O.role && target.accessStatus !== S.active)
      ) {
        throw problemException(E.invalidState, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      }
      if (
        target.role === AUTH_USER_ROLES.admin &&
        (operation === O.suspend || newRole === AUTH_USER_ROLES.customer)
      ) {
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
                OR: [
                  { mfaLockedUntil: null },
                  { mfaLockedUntil: { lte: now } },
                ],
              },
            ],
          },
        });
        if (remaining === 0)
          throw problemException(E.lastUsableAdmin, actor.correlationId, {
            status: HttpStatus.CONFLICT,
          });
      }
      const changed = operation !== O.role || newRole !== target.role;
      const newStatus =
        operation === O.suspend
          ? S.suspended
          : operation === O.restore
            ? S.active
            : target.accessStatus;
      if (changed) {
        const result = await tx.user.updateMany({
          where: {
            id,
            accessVersion: expectedVersion,
            accessStatus: target.accessStatus,
            role: target.role,
          },
          data: {
            accessVersion: { increment: 1 },
            accessStatus: newStatus,
            ...(newRole ? { role: newRole } : {}),
          },
        });
        if (result.count !== 1)
          throw problemException(E.staleVersion, actor.correlationId, {
            status: HttpStatus.CONFLICT,
          });
        // Role changes invalidate old privilege-bearing sessions as well.
        if (operation !== O.restore)
          await tx.authRecord.updateMany({
            where: {
              userId: id,
              type: AUTH_RECORD_TYPES.session,
              revokedAt: null,
            },
            data: { revokedAt: new Date() },
          });
      }
      await this.audit.writeInTx(
        {
          eventType:
            operation === O.role
              ? AUTH_AUDIT_EVENT_TYPES.authAdminUserRoleUpdated
              : operation === O.suspend
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
            previousRole: target.role,
            newRole: newRole ?? target.role,
            previousStatus: target.accessStatus,
            newStatus,
            previousVersion: expectedVersion,
            newVersion: expectedVersion + (changed ? 1 : 0),
            reason: safeReason,
            changed,
            timestamp: new Date().toISOString(),
          },
        },
        tx,
      );
      await receipt(tx, actor, operation, hash, id);
      return {
        ...(await this.reads.detail(id, actor.correlationId, tx)),
        replayed: false,
      };
    });
  }
}
