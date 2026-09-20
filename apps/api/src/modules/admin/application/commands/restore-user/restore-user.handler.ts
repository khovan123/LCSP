import { AUDIT_DECISIONS, AUDIT_RESOURCE_TYPES } from "@lcsp/contracts/audit";
import {
  ADMIN_ERROR_CODES,
  AUTH_AUDIT_EVENT_TYPES,
  ADMIN_ACCOUNT_ERRORS as E,
  ADMIN_ACCOUNT_OPERATIONS as O,
  USER_ACCESS_STATUSES as S,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";
import { HttpStatus } from "@nestjs/common";
import { CommandHandler, type ICommandHandler } from "@nestjs/cqrs";
import { Prisma } from "@prisma/client";
import { isRecord } from "../../../../../common/utils/index.js";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../../platform/problems/problem-factory.js";
import { AuthAuditService } from "../../../../auth/application/services/auth/auth-audit.service.js";
import {
  accountTransaction,
  assertCurrentAdmin,
  receipt,
  replay,
  requestHash,
} from "../../../infrastructure/persistence/admin-account.transaction.js";
import { fetchAdminUserDetail } from "../../queries/get-admin-user-detail/get-admin-user-detail.handler.js";
import { RestoreUserCommand } from "./restore-user.command.js";

@CommandHandler(RestoreUserCommand)
export class RestoreUserHandler implements ICommandHandler<RestoreUserCommand> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuthAuditService,
  ) {}

  async execute(command: RestoreUserCommand): Promise<AdminUserDetail> {
    const { targetId: id, body, actor } = command;
    const { expectedVersion, reason: safeReason } = body;
    const hash = requestHash(O.restore, {
      id,
      expectedVersion,
      reason: safeReason,
    });

    return accountTransaction(this.prisma, actor.correlationId, async (tx) => {
      await assertCurrentAdmin(tx, actor);
      const previous = await replay(tx, actor, O.restore, hash);
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
      if (target.accessStatus !== S.suspended) {
        throw problemException(E.invalidState, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      }

      const result = await tx.user.updateMany({
        where: {
          id,
          accessVersion: expectedVersion,
          accessStatus: target.accessStatus,
        },
        data: {
          accessVersion: { increment: 1 },
          accessStatus: S.active,
        },
      });
      if (result.count !== 1) {
        throw problemException(E.staleVersion, actor.correlationId, {
          status: HttpStatus.CONFLICT,
        });
      }

      await this.audit.writeInTx(
        {
          eventType: AUTH_AUDIT_EVENT_TYPES.authAdminUserRestored,
          actorId: actor.userId,
          sessionId: actor.sessionId,
          correlationId: actor.correlationId,
          resourceType: AUDIT_RESOURCE_TYPES.authAccount,
          resourceId: id,
          decision: AUDIT_DECISIONS.allow,
          payload: {
            targetUserId: id,
            previousStatus: target.accessStatus,
            newStatus: S.active,
            previousVersion: expectedVersion,
            newVersion: expectedVersion + 1,
            reason: safeReason,
            changed: true,
            timestamp: new Date().toISOString(),
          },
        },
        tx,
      );

      await receipt(tx, actor, O.restore, hash, id);
      return {
        ...(await fetchAdminUserDetail(tx, id, actor.correlationId)),
        replayed: false,
      };
    });
  }
}
