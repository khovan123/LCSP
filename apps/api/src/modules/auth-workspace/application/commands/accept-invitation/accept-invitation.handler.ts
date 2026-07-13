import * as crypto from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.ts";
import { ACCEPT_INVITATION_ERROR_CODES } from "@lcsp/contracts/auth";
import {
  createCorrelationId,
  fingerprintToken,
  hashSecret,
  issueOpaqueToken,
} from "../../../infrastructure/security/security.utils.ts";
import type {
  AcceptInvitationErrorCode,
  AcceptInvitationResponse,
} from "../../contracts/auth-workspace/accept-invitation.contract.ts";
import { AcceptInvitationCommand } from "./accept-invitation.command.ts";

const SESSION_TTL_MS = 8 * 60 * 60_000;
const MIN_PASSWORD_LENGTH = 12;
const MAX_DISPLAY_NAME_LENGTH = 100;

export class AcceptInvitationHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    command: AcceptInvitationCommand,
  ): Promise<AcceptInvitationResponse> {
    const { invitationToken, displayName, password } = command.input;
    const correlationId = command.input.correlationId ?? createCorrelationId();

    if (
      !isNonEmptyString(invitationToken) ||
      !isValidDisplayName(displayName)
    ) {
      throw problem(
        BadRequestException,
        ACCEPT_INVITATION_ERROR_CODES.invalidRequest,
        correlationId,
      );
    }

    if (!isNonEmptyString(password) || password.length < MIN_PASSWORD_LENGTH) {
      throw problem(
        UnprocessableEntityException,
        ACCEPT_INVITATION_ERROR_CODES.passwordTooShort,
        correlationId,
      );
    }

    const now = new Date();
    const invitation = await this.prisma.authInvitation.findUnique({
      where: { id: invitationToken },
    });

    if (!invitation || invitation.expiresAt <= now) {
      throw problem(
        BadRequestException,
        ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
        correlationId,
      );
    }

    if (invitation.state !== "approved") {
      throw problem(
        BadRequestException,
        ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
        correlationId,
      );
    }

    const existingUser = await this.prisma.authUser.findUnique({
      where: { email: invitation.email },
    });
    if (existingUser) {
      throw problem(
        ConflictException,
        ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists,
        correlationId,
      );
    }

    const policy = await this.prisma.authPolicy.findUnique({
      where: {
        id_version: {
          id: invitation.policyId,
          version: invitation.policyVersion,
        },
      },
    });
    if (!policy) {
      throw problem(
        BadRequestException,
        ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
        correlationId,
      );
    }

    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const sessionToken = issueOpaqueToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const subjectAttributes = jsonObject(invitation.subjectAttributes);
    const allowedActions = allowedActionsFrom(
      subjectAttributes,
      policy.actions,
    );

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.authInvitation.updateMany({
        where: {
          id: invitation.id,
          state: "approved",
          expiresAt: { gt: now },
        },
        data: { state: "consumed" },
      });
      if (consumed.count !== 1) {
        throw problem(
          BadRequestException,
          ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
          correlationId,
        );
      }

      await tx.authUser.create({
        data: {
          id: userId,
          email: invitation.email,
          passwordHash: hashSecret(password),
          emailVerified: true,
          failedLoginCount: 0,
          lockUntil: null,
          displayName: displayName.trim(),
        },
      });

      await tx.authMembership.create({
        data: {
          id: membershipId,
          userId,
          organizationId: invitation.organizationId,
          status: "active",
          subjectAttributes,
          policyId: invitation.policyId,
          policyVersion: invitation.policyVersion,
        },
      });

      await tx.authSession.create({
        data: {
          id: sessionId,
          userId,
          organizationId: invitation.organizationId,
          tokenHash: hashSecret(sessionToken),
          tokenFingerprint: fingerprintToken(sessionToken),
          expiresAt: sessionExpiresAt,
          revokedAt: null,
        },
      });

      await tx.authAuditEvent.create({
        data: {
          id: crypto.randomUUID(),
          eventType: "AUTH_DEVELOPER_INVITATION_ACCEPTED",
          actorId: userId,
          organizationId: invitation.organizationId,
          resourceType: "AuthInvitation",
          resourceId: null,
          decision: "allow",
          reasonCode: null,
          correlationId,
          sessionId,
          policyId: invitation.policyId,
          policyVersion: invitation.policyVersion,
          payload: {
            event_type: "AUTH_DEVELOPER_INVITATION_ACCEPTED",
            actor_id: userId,
            organization_id: invitation.organizationId,
            decision: "allow",
            correlation_id: correlationId,
            session_id: sessionId,
            policy_id: invitation.policyId,
            policy_version: invitation.policyVersion,
          },
        },
      });
    });

    return {
      user_id: userId,
      session_token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
      organization_id: invitation.organizationId,
      allowed_actions: allowedActions,
      correlation_id: correlationId,
    };
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDisplayName(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    value.trim().length >= 1 &&
    value.trim().length <= MAX_DISPLAY_NAME_LENGTH
  );
}

function jsonObject(value: Prisma.JsonValue): Prisma.JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }
  return value;
}

function allowedActionsFrom(
  subjectAttributes: Prisma.JsonObject,
  policyActions: string[],
): string[] {
  const allowedActions = subjectAttributes.allowed_actions;
  if (
    Array.isArray(allowedActions) &&
    allowedActions.every(
      (action): action is string => typeof action === "string",
    )
  ) {
    return [...allowedActions];
  }
  return [...policyActions];
}

function problem(
  ExceptionClass:
    | typeof BadRequestException
    | typeof ConflictException
    | typeof UnprocessableEntityException,
  errorCode: AcceptInvitationErrorCode,
  correlationId: string,
): BadRequestException | ConflictException | UnprocessableEntityException {
  return new ExceptionClass({
    error_code: errorCode,
    code: errorCode,
    correlation_id: correlationId,
  });
}
