import { ASSESSMENT_EVENT_TYPES } from "@lcsp/contracts/assessment";
import {
  OUTBOX_STATUSES,
  OUTBOX_AGGREGATE_TYPES,
} from "@lcsp/contracts/outbox";
import { OutboxMessageEntity } from "./outbox-message.entity.js";

describe("OutboxMessageEntity", () => {
  it("T01: creates a message with status pending and zero attempts", () => {
    const createdAt = new Date("2026-01-01T00:00:00Z");
    const message = OutboxMessageEntity.create(
      {
        aggregateType: OUTBOX_AGGREGATE_TYPES.assessment,
        aggregateId: "assessment-1",
        eventType: ASSESSMENT_EVENT_TYPES.createdOutbox,
        payload: { foo: "bar" },
      },
      createdAt,
    );

    expect(message.status).toBe(OUTBOX_STATUSES.pending);
    expect(message.attempts).toBe(0);
    expect(message.lastAttemptAt).toBeNull();
    expect(message.publishedAt).toBeNull();
    expect(message.errorMessage).toBeNull();
    expect(message.createdAt).toBe(createdAt);
    expect(message.id).toEqual(expect.any(String));
    expect(message.aggregateType).toBe(OUTBOX_AGGREGATE_TYPES.assessment);
    expect(message.aggregateId).toBe("assessment-1");
    expect(message.eventType).toBe(ASSESSMENT_EVENT_TYPES.createdOutbox);
    expect(message.payload).toEqual({ foo: "bar" });
  });

  it("defaults createdAt to now when not provided", () => {
    const before = Date.now();
    const message = OutboxMessageEntity.create({
      aggregateType: OUTBOX_AGGREGATE_TYPES.authUser,
      aggregateId: "user-1",
      eventType: "user.registered",
      payload: {},
    });
    const after = Date.now();

    expect(message.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(message.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("rehydrates a message from persisted fields via fromPersistence", () => {
    const fields = {
      id: "outbox-3",
      aggregateType: OUTBOX_AGGREGATE_TYPES.assessment,
      aggregateId: "assessment-2",
      eventType: ASSESSMENT_EVENT_TYPES.createdOutbox,
      payload: { foo: "bar" },
      status: OUTBOX_STATUSES.failed,
      attempts: 3,
      lastAttemptAt: new Date("2026-01-02T00:00:00Z"),
      publishedAt: null,
      errorMessage: "connection refused",
      createdAt: new Date("2026-01-01T00:00:00Z"),
    };

    const message = OutboxMessageEntity.fromPersistence(fields);

    expect(message).toMatchObject(fields);
  });
});
