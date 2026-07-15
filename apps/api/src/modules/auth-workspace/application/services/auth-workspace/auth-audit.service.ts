import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuditDecision, AuditEventInput } from "@lcsp/contracts/audit";
import {
  AUTH_AUDIT_EVENT_TYPES,
  type AuthAuditEventType,
} from "@lcsp/contracts/auth";

import { AuditSanitizer } from "../../../../../platform/audit/audit-sanitizer.js";
import { AuditWriterService } from "../../../../../platform/audit/audit-writer.service.js";
import type { AuditEvent } from "../../../domain/models/auth-workspace.models.ts";

export type AuthAuditEventInput = {
  eventType: AuthAuditEventType;
  actorId: string | null;
  organizationId: string | null;
  correlationId: string;
  decision: AuditDecision | null;
  resourceType?: string | null;
  resourceId?: string | null;
  reasonCode?: string | null;
  sessionId?: string | null;
  policyId?: string | null;
  policyVersion?: string | null;
  payload?: Record<string, unknown>;
};

type NormalizedAuthAuditEventInput = Omit<AuthAuditEventInput, "eventType"> & {
  eventType: string;
};

const LEGACY_EVENT_TYPE_ALIASES: Record<string, string> = {
  "auth.login.succeeded": "LOGIN_SUCCESS",
  "auth.login.failed": AUTH_AUDIT_EVENT_TYPES.authSignInFailed,
  "auth.session.revoked": AUTH_AUDIT_EVENT_TYPES.authSessionRevoked,
  "auth.mfa.enrolled": AUTH_AUDIT_EVENT_TYPES.authMfaEnrolled,
  "auth.mfa.verified": AUTH_AUDIT_EVENT_TYPES.authMfaOtpVerified,
  "auth.mfa.failed": AUTH_AUDIT_EVENT_TYPES.authMfaOtpFailed,
  "auth.profile.updated": AUTH_AUDIT_EVENT_TYPES.authProfileUpdated,
  "auth.oauth.start.succeeded": AUTH_AUDIT_EVENT_TYPES.authOauthStart,
  "auth.oauth.start.failed": AUTH_AUDIT_EVENT_TYPES.authOauthStart,
  "auth.oauth.login.succeeded": AUTH_AUDIT_EVENT_TYPES.authOauthLoginSuccess,
  "auth.oauth.login.failed": AUTH_AUDIT_EVENT_TYPES.authOauthLoginFailed,
};

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger(AuthAuditService.name);

  constructor(private readonly auditWriter: AuditWriterService) {}

  async write(event: AuthAuditEventInput | AuditEvent): Promise<void> {
    try {
      await this.auditWriter.write(this.toAuditEventInput(event));
    } catch (error) {
      this.logger.error(
        `Failed to write auth audit event: ${(error as Error).message}`,
      );
    }
  }

  async writeInTx(
    event: AuthAuditEventInput | AuditEvent,
    tx: Prisma.TransactionClient,
  ): Promise<void> {
    try {
      await this.auditWriter.writeInTx(this.toAuditEventInput(event), tx);
    } catch (error) {
      this.logger.error(
        `Failed to write auth audit event in transaction: ${(error as Error).message}`,
      );
    }
  }

  private toAuditEventInput(
    event: AuthAuditEventInput | AuditEvent,
  ): AuditEventInput {
    const normalized: NormalizedAuthAuditEventInput = isLegacyAuditEvent(event)
      ? this.fromLegacyAuditEvent(event)
      : event;
    const { payload, removedKeys } = AuditSanitizer.sanitize(
      normalized.payload,
    );

    for (const key of removedKeys) {
      this.logger.warn(`Auth audit payload field removed by sanitizer: ${key}`);
    }

    return {
      eventType: normalized.eventType,
      actorId: normalized.actorId,
      organizationId: normalized.organizationId,
      resourceType: normalized.resourceType ?? null,
      resourceId: normalized.resourceId ?? null,
      reasonCode: normalized.reasonCode ?? null,
      correlationId: normalized.correlationId,
      sessionId: normalized.sessionId ?? null,
      policyId: normalized.policyId ?? null,
      policyVersion: normalized.policyVersion ?? null,
      decision: normalized.decision,
      payload,
    };
  }

  private fromLegacyAuditEvent(
    event: AuditEvent,
  ): NormalizedAuthAuditEventInput {
    const eventType = readRequiredString(event, "event_type");
    return {
      eventType: LEGACY_EVENT_TYPE_ALIASES[eventType] ?? eventType,
      actorId: readNullableString(event, "actor_id"),
      organizationId: readNullableString(event, "organization_id"),
      resourceType: readNullableString(event, "resource_type"),
      resourceId: readNullableString(event, "resource_id"),
      reasonCode: readNullableString(event, "reason_code"),
      correlationId: readRequiredString(event, "correlation_id"),
      sessionId: readNullableString(event, "session_id"),
      policyId: readNullableString(event, "policy_id"),
      policyVersion: readNullableString(event, "policy_version"),
      decision: readDecision(event, "decision"),
      payload: { ...event },
    };
  }
}

function isLegacyAuditEvent(
  event: AuthAuditEventInput | AuditEvent,
): event is AuditEvent {
  return "event_type" in event;
}

function readRequiredString(event: AuditEvent, key: string): string {
  const value = event[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Auth audit event field ${key} must be a string`);
  }
  return value;
}

function readNullableString(event: AuditEvent, key: string): string | null {
  const value = event[key];
  return typeof value === "string" ? value : null;
}

function readDecision(event: AuditEvent, key: string): AuditDecision | null {
  const value = event[key];
  return value === "allow" || value === "deny" ? value : null;
}
