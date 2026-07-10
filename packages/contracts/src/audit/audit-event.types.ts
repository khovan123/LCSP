export type AuditDecision = "allow" | "deny";

export interface AuditEventInput {
  eventType: string;
  actorId: string | null;
  organizationId: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  correlationId: string;
  decision: AuditDecision | null;
  payload?: Record<string, unknown>;
}

export interface AuditEvent extends AuditEventInput {
  id: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}
