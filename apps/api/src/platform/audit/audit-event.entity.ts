import type {
  AuditDecision,
  AuditEvent as AuditEventProps,
  AuditEventInput,
} from "@lcsp/contracts/audit";

export class AuditEventEntity implements AuditEventProps {
  private constructor(
    readonly id: string,
    readonly eventType: string,
    readonly actorId: string | null,
    readonly organizationId: string | null,
    readonly correlationId: string,
    readonly decision: AuditDecision | null,
    readonly payload: Record<string, unknown>,
    readonly occurredAt: Date,
  ) {}

  static create(
    id: string,
    input: AuditEventInput,
    occurredAt: Date = new Date(),
  ): AuditEventEntity {
    return new AuditEventEntity(
      id,
      input.eventType,
      input.actorId,
      input.organizationId,
      input.correlationId,
      input.decision,
      input.payload ?? {},
      occurredAt,
    );
  }

  static fromPersistence(fields: AuditEventProps): AuditEventEntity {
    return new AuditEventEntity(
      fields.id,
      fields.eventType,
      fields.actorId,
      fields.organizationId,
      fields.correlationId,
      fields.decision,
      fields.payload,
      fields.occurredAt,
    );
  }
}
