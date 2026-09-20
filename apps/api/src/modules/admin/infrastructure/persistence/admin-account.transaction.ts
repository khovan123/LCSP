import { HttpStatus } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import {
  ADMIN_ACCOUNT_ERRORS as E,
  AUTH_ERROR_CODES,
  AUTH_USER_ROLES,
  USER_ACCESS_STATUSES,
  type AdminAccountOperation,
} from "@lcsp/contracts/auth";
import type { RbacRequestContext } from "../../../../platform/rbac/interfaces/rbac-request.interface.js";
import type { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";
import { problemException } from "../../../../platform/problems/problem-factory.js";
import { AUTH_RECORD_TYPES } from "../../../auth/infrastructure/persistence/auth-record.persistence.js";
import { isNumber, isRecord } from "../../../../common/utils/index.js";

export type AdminActor = RbacRequestContext & {
  correlationId: string;
  idempotencyKey: string;
};
/** Shared by provisioning and lifecycle commands. ReadCommitted re-reads after lock acquisition. */
export async function lockAccountLifecycle(
  tx: Prisma.TransactionClient,
): Promise<void> {
  await tx.$executeRaw`SET LOCAL lock_timeout = '3000ms'`;
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(299, 1)`;
}
export async function accountTransaction<T>(
  prisma: PrismaService,
  correlationId: string,
  execute: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        await lockAccountLifecycle(tx);
        return execute(tx);
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        timeout: 15000,
      },
    );
  } catch (error) {
    const e = error as { code?: string; meta?: { code?: string } };
    if (
      e.code === "P2034" ||
      e.code === "55P03" ||
      e.code === "40P01" ||
      e.meta?.code === "55P03" ||
      e.meta?.code === "40P01"
    ) {
      throw problemException(E.concurrentChange, correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }
    throw error;
  }
}
export async function assertCurrentAdmin(
  tx: Prisma.TransactionClient,
  actor: AdminActor,
): Promise<void> {
  const user = await tx.user.findUnique({
    where: { id: actor.userId },
    select: {
      role: true,
      accessStatus: true,
      emailVerified: true,
      accessVersion: true,
    },
  });
  if (
    !user ||
    user.role !== AUTH_USER_ROLES.admin ||
    user.accessStatus !== USER_ACCESS_STATUSES.active ||
    !user.emailVerified
  ) {
    throw problemException(AUTH_ERROR_CODES.rbacDenied, actor.correlationId, {
      status: HttpStatus.FORBIDDEN,
    });
  }
  const session = await tx.authRecord.findFirst({
    where: {
      id: actor.sessionId,
      userId: actor.userId,
      type: AUTH_RECORD_TYPES.session,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { metadata: true },
  });
  const metadata = session?.metadata;
  const sessionVersion =
    isRecord(metadata) && isNumber(metadata.accessVersion)
      ? metadata.accessVersion
      : 0;
  if (!session || sessionVersion !== user.accessVersion) {
    throw problemException(
      AUTH_ERROR_CODES.sessionInvalid,
      actor.correlationId,
      { status: HttpStatus.UNAUTHORIZED },
    );
  }
}
export function requestHash(
  operation: AdminAccountOperation,
  input: unknown,
): string {
  const serialized = JSON.stringify(input, Object.keys(input || {}).sort());
  return createHash("sha256")
    .update(`${operation}:${serialized}`)
    .digest("hex");
}
export async function replay(
  tx: Prisma.TransactionClient,
  actor: AdminActor,
  operation: AdminAccountOperation,
  hash: string,
): Promise<{ resourceId: string } | null> {
  const existing = await tx.adminAccountCommandReceipt.findUnique({
    where: {
      actorId_idempotencyKey: {
        actorId: actor.userId,
        idempotencyKey: actor.idempotencyKey,
      },
    },
  });
  if (!existing) return null;
  if (existing.operation !== operation || existing.requestHash !== hash) {
    throw problemException(E.idempotencyConflict, actor.correlationId, {
      status: HttpStatus.CONFLICT,
    });
  }
  return { resourceId: existing.resourceId };
}
export async function receipt(
  tx: Prisma.TransactionClient,
  actor: AdminActor,
  operation: AdminAccountOperation,
  hash: string,
  resourceId: string,
): Promise<void> {
  try {
    await tx.adminAccountCommandReceipt.create({
      data: {
        id: randomUUID(),
        actorId: actor.userId,
        idempotencyKey: actor.idempotencyKey,
        operation,
        requestHash: hash,
        resourceId,
      },
    });
  } catch (error) {
    const e = error as { code?: string };
    if (e.code === "P2002") {
      throw problemException(E.idempotencyConflict, actor.correlationId, {
        status: HttpStatus.CONFLICT,
      });
    }
    throw error;
  }
}
