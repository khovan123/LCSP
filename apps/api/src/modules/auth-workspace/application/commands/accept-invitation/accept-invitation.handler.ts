import * as crypto from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { AUDIT_DECISIONS } from "@lcsp/contracts/audit";
import {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_AUDIT_EVENT_TYPES,
  AUTH_INVITATION_STATES,
  AUTH_MEMBERSHIP_STATUSES,
} from "@lcsp/contracts/auth";

import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.ts";
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
import { AuthAuditService } from "../../services/auth-workspace/auth-audit.service.ts";
import {
  invitationAssessmentId,
  projectInvitationScope,
} from "../../services/auth-workspace/invitation-scope-projection.ts";
import { AcceptInvitationCommand } from "./accept-invitation.command.ts";

const SESSION_TTL_MS = 8 * 60 * 60_000;
const MIN_PASSWORD_LENGTH = 12;
const MAX_DISPLAY_NAME_LENGTH = 100;

export class AcceptInvitationHandler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authAudit: AuthAuditService,
  ) {}

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

    const userId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const sessionId = crypto.randomUUID();
    const sessionToken = issueOpaqueToken();
    const sessionExpiresAt = new Date(Date.now() + SESSION_TTL_MS);
    const accepted = await this.prisma.$transaction(async (tx) => {
      const invitation = await tx.authInvitation.findUnique({
        where: { id: invitationToken },
      });
      const now = new Date();
      if (
        !invitation ||
        invitation.expiresAt <= now ||
        invitation.state !== AUTH_INVITATION_STATES.approved
      ) {
        throw problem(
          BadRequestException,
          ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
          correlationId,
        );
      }

      const policy = await tx.authPolicy.findUnique({
        where: {
          id_version: {
            id: invitation.policyId,
            version: invitation.policyVersion,
          },
        },
      });
      const assessmentId = invitationAssessmentId(invitation.subjectAttributes);
      const assessment = assessmentId
        ? await tx.assessment.findUnique({ where: { id: assessmentId } })
        : null;
      const projection = policy
        ? projectInvitationScope({
            organizationId: invitation.organizationId,
            subjectAttributes: invitation.subjectAttributes,
            policy,
            assessment,
          })
        : null;
      if (!projection) {
        throw problem(
          BadRequestException,
          ACCEPT_INVITATION_ERROR_CODES.invitationInvalid,
          correlationId,
        );
      }

      const existingUser = await tx.authUser.findUnique({
        where: { email: invitation.email },
      });
      if (existingUser) {
        throw problem(
          ConflictException,
          ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists,
          correlationId,
        );
      }

      const consumed = await tx.authInvitation.updateMany({
        where: {
          id: invitation.id,
          state: AUTH_INVITATION_STATES.approved,
          expiresAt: { gt: new Date() },
        },
        data: { state: AUTH_INVITATION_STATES.consumed },
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
          status: AUTH_MEMBERSHIP_STATUSES.active,
          subjectAttributes: {
            ...(invitation.subjectAttributes as Prisma.JsonObject),
            allowed_actions: projection.allowedActions,
          },
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

      await this.authAudit.writeInTx(
        {
          eventType: AUTH_AUDIT_EVENT_TYPES.authDeveloperInvitationAccepted,
          actorId: userId,
          organizationId: invitation.organizationId,
          resourceType: "AuthInvitation",
          resourceId: null,
          decision: AUDIT_DECISIONS.allow,
          correlationId,
          sessionId,
          policyId: invitation.policyId,
          policyVersion: invitation.policyVersion,
          payload: {
            event_type: AUTH_AUDIT_EVENT_TYPES.authDeveloperInvitationAccepted,
            actor_id: userId,
            organization_id: invitation.organizationId,
            decision: AUDIT_DECISIONS.allow,
            correlation_id: correlationId,
            session_id: sessionId,
            policy_id: invitation.policyId,
            policy_version: invitation.policyVersion,
          },
        },
        tx,
      );

      return { invitation, projection };
    });

    return {
      user_id: userId,
      session_token: sessionToken,
      expires_at: sessionExpiresAt.toISOString(),
      organization_id: accepted.invitation.organizationId,
      allowed_actions: accepted.projection.allowedActions,
      scope:
        accepted.projection.scope.type === "assessment"
          ? {
              type: "assessment",
              assessment_id: accepted.projection.scope.assessmentId,
            }
          : { type: "organization", assessment_id: null },
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
