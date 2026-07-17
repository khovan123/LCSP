import { PBAC_DECISION } from "../pbac/decisions.ts";

export const AUDIT_DECISIONS = PBAC_DECISION;

export type AuditDecision =
  (typeof AUDIT_DECISIONS)[keyof typeof AUDIT_DECISIONS];

export interface AuditEventInput {
  eventType: string;
  actorId: string | null;
  organizationId: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  reasonCode?: string | null;
  correlationId: string;
  sessionId?: string | null;
  policyId?: string | null;
  policyVersion?: string | null;
  decision: AuditDecision | null;
  payload?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}
