import { randomUUID } from "node:crypto";

import type {
  AuditDecision,
  AuditEvent as AuditEventProps,
  AuditEventInput,
} from "@lcsp/contracts/audit";

export class AuditEventEntity implements AuditEventProps {
  readonly id: string = randomUUID();

  private constructor(
    readonly eventType: string,
    readonly actorId: string | null,
    readonly organizationId: string | null,
    readonly correlationId: string,
    readonly decision: AuditDecision | null,
    readonly payload: Record<string, unknown>,
    readonly occurredAt: Date,
  ) {}

  static create(
    input: AuditEventInput,
    occurredAt: Date = new Date(),
  ): AuditEventEntity {
    return new AuditEventEntity(
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
    const entity = new AuditEventEntity(
      fields.eventType,
      fields.actorId,
      fields.organizationId,
      fields.correlationId,
      fields.decision,
      fields.payload,
      fields.occurredAt,
    );
    Object.assign(entity, { id: fields.id });
    return entity;
  }
}
