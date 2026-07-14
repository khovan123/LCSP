export type AuditDecision = "allow" | "deny";

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
