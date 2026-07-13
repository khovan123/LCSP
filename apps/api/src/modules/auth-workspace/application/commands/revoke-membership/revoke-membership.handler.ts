import * as crypto from "node:crypto";

import { BadRequestException, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.ts";
import { REVOKE_MEMBERSHIP_ERROR_CODES } from "@lcsp/contracts/auth";
import { createCorrelationId } from "../../../infrastructure/security/security.utils.ts";
import type {
  RevokeMembershipErrorCode,
  RevokeMembershipResponse,
} from "../../contracts/auth-workspace/revoke-membership.contract.ts";
import { RevokeMembershipCommand } from "./revoke-membership.command.ts";

export class RevokeMembershipHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: RevokeMembershipCommand,
  ): Promise<RevokeMembershipResponse> {
    const { orgId, actorId, targetUserId } = command.input;
    const correlationId = command.input.correlationId ?? createCorrelationId();

    if (actorId === targetUserId) {
      throw problem(
        BadRequestException,
        REVOKE_MEMBERSHIP_ERROR_CODES.cannotSelfRevoke,
        correlationId,
      );
    }

    const membership = await this.prisma.authMembership.findUnique({
      where: {
        userId_organizationId: {
          userId: targetUserId,
          organizationId: orgId,
        },
      },
    });

    if (
      !membership ||
      membership.status !== "active" ||
      roleFrom(membership.subjectAttributes) !== "Developer"
    ) {
      throw problem(
        NotFoundException,
        REVOKE_MEMBERSHIP_ERROR_CODES.membershipNotFound,
        correlationId,
      );
    }

    const revokedAt = new Date();
    const affectedSessions = await this.prisma.$transaction(async (tx) => {
      const revokedMembership = await tx.authMembership.updateMany({
        where: {
          id: membership.id,
          status: "active",
        },
        data: {
          status: "revoked",
          revokedAt,
        },
      });
      if (revokedMembership.count !== 1) {
        throw problem(
          NotFoundException,
          REVOKE_MEMBERSHIP_ERROR_CODES.membershipNotFound,
          correlationId,
        );
      }

      const revokedSessions = await tx.authSession.updateMany({
        where: {
          userId: targetUserId,
          organizationId: orgId,
          revokedAt: null,
          expiresAt: { gt: revokedAt },
        },
        data: { revokedAt },
      });

      await tx.authAuditEvent.create({
        data: {
          id: crypto.randomUUID(),
          eventType: "AUTH_DEVELOPER_REVOKED",
          actorId,
          organizationId: orgId,
          resourceType: "AuthMembership",
          resourceId: membership.id,
          decision: "allow",
          reasonCode: null,
          correlationId,
          sessionId: null,
          policyId: membership.policyId,
          policyVersion: membership.policyVersion,
          payload: {
            event_type: "AUTH_DEVELOPER_REVOKED",
            actor_id: actorId,
            organization_id: orgId,
            decision: "allow",
            correlation_id: correlationId,
            target_user_id: targetUserId,
            affected_sessions: revokedSessions.count,
            membership_id: membership.id,
            policy_id: membership.policyId,
            policy_version: membership.policyVersion,
          },
        },
      });

      return revokedSessions.count;
    });

    return {
      revoked: true,
      affected_sessions: affectedSessions,
      correlation_id: correlationId,
    };
  }
}

function roleFrom(value: Prisma.JsonValue): string | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }
  const role = value.role;
  return typeof role === "string" ? role : null;
}

function problem(
  ExceptionClass: typeof BadRequestException | typeof NotFoundException,
  errorCode: RevokeMembershipErrorCode,
  correlationId: string,
): BadRequestException | NotFoundException {
  return new ExceptionClass({
    error_code: errorCode,
    code: errorCode,
    correlation_id: correlationId,
  });
}
