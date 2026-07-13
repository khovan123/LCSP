import {
  BadRequestException,
  UnprocessableEntityException,
} from "@nestjs/common";

import { Invitation } from "../../../domain/models/auth-workspace.models.ts";
import { EmailAddress } from "../../../domain/value-objects/email-address.value-object.ts";
import type { AssessmentScopeRepository } from "../../ports/persistence/assessment-scope.repository.ts";
import type { AuditEventRepository } from "../../ports/persistence/audit-event.repository.ts";
import type { InvitationRepository } from "../../ports/persistence/invitation.repository.ts";
import type { PolicyRepository } from "../../ports/persistence/policy.repository.ts";
import { AuthWorkspaceSupportService } from "../../services/auth-workspace/auth-workspace-support.service.ts";
import type {
  InviteDeveloperErrorCode,
  InviteDeveloperResponse,
} from "../../contracts/auth-workspace/invitation.contract.ts";
import {
  DEVELOPER_SUBJECT_ROLE,
  isDeveloperAllowedAction,
} from "@lcsp/contracts/pbac";
import { INVITE_DEVELOPER_ERROR_CODES } from "@lcsp/contracts/auth";
import { InviteDeveloperCommand } from "./invite-developer.command.ts";

const DEFAULT_EXPIRY_HOURS = 72;
const MAX_EXPIRY_HOURS = 168;
const MILLIS_PER_HOUR = 60 * 60_000;

type InviteDeveloperRepositories = {
  invitations: Pick<InvitationRepository, "nextId" | "save">;
  policies: Pick<PolicyRepository, "findLatestByOrganizationAndRole">;
  auditEvents: AuditEventRepository;
};

export class InviteDeveloperHandler {
  constructor(
    private readonly support: AuthWorkspaceSupportService,
    private readonly repositories: InviteDeveloperRepositories,
    private readonly assessments: AssessmentScopeRepository,
  ) {}

  async execute(
    command: InviteDeveloperCommand,
  ): Promise<InviteDeveloperResponse> {
    const input = command.input;
    const correlationId =
      input.correlationId ?? this.support.createCorrelationId();

    if (!input.email || !EmailAddress.isValid(input.email)) {
      throw problem(
        UnprocessableEntityException,
        INVITE_DEVELOPER_ERROR_CODES.invalidEmail,
        correlationId,
      );
    }

    if (
      !Array.isArray(input.allowedActions) ||
      input.allowedActions.length === 0
    ) {
      throw problem(
        BadRequestException,
        INVITE_DEVELOPER_ERROR_CODES.invalidActions,
        correlationId,
      );
    }

    if (!input.allowedActions.every(isDeveloperAllowedAction)) {
      throw problem(
        BadRequestException,
        INVITE_DEVELOPER_ERROR_CODES.invalidActions,
        correlationId,
      );
    }

    if (input.assessmentId) {
      const owned = await this.assessments.belongsToOrganization(
        input.assessmentId,
        input.orgId,
      );
      if (!owned) {
        throw problem(
          BadRequestException,
          INVITE_DEVELOPER_ERROR_CODES.assessmentNotOwned,
          correlationId,
        );
      }
    }

    const developerPolicy =
      await this.repositories.policies.findLatestByOrganizationAndRole(
        input.orgId,
        DEVELOPER_SUBJECT_ROLE,
      );
    if (!developerPolicy) {
      throw problem(
        BadRequestException,
        INVITE_DEVELOPER_ERROR_CODES.invalidRequest,
        correlationId,
      );
    }

    const expiresAt =
      this.support.now() + expiryHours(input.expiresInHours) * MILLIS_PER_HOUR;
    const email = EmailAddress.create(input.email).toString();
    const allowedActions = [...input.allowedActions];
    const invitation = new Invitation({
      id: this.repositories.invitations.nextId(),
      email,
      organizationId: input.orgId,
      state: "approved",
      emailVerified: false,
      membershipStatus: "active",
      subjectAttributes: {
        role: DEVELOPER_SUBJECT_ROLE,
        ...(input.assessmentId ? { scope: input.assessmentId } : {}),
        allowed_actions: allowedActions,
      },
      policyId: developerPolicy.id,
      policyVersion: developerPolicy.version,
      expiresAt,
    });

    await this.repositories.invitations.save(invitation);
    await this.repositories.auditEvents.append({
      event_type: "AUTH_DEVELOPER_INVITED",
      actor_id: input.actorId,
      organization_id: input.orgId,
      decision: "allow",
      correlation_id: correlationId,
      policy_id: developerPolicy.id,
      policy_version: developerPolicy.version,
      invitee_email: email,
      invitation_id: invitation.id,
      allowed_actions: allowedActions,
      scope: input.assessmentId ?? null,
      expires_at: new Date(expiresAt).toISOString(),
    });

    return {
      invitation_id: invitation.id,
      email,
      expires_at: new Date(expiresAt).toISOString(),
      allowed_actions: allowedActions,
      correlation_id: correlationId,
    };
  }
}

function expiryHours(value: number | undefined): number {
  if (value === undefined) {
    return DEFAULT_EXPIRY_HOURS;
  }
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_EXPIRY_HOURS;
  }
  return Math.min(Math.floor(value), MAX_EXPIRY_HOURS);
}

function problem(
  ExceptionClass:
    typeof BadRequestException | typeof UnprocessableEntityException,
  errorCode: InviteDeveloperErrorCode,
  correlationId: string,
): BadRequestException | UnprocessableEntityException {
  return new ExceptionClass({
    error_code: errorCode,
    code: errorCode,
    correlation_id: correlationId,
  });
}
