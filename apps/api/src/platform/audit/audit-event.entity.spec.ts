import { AuditEventEntity } from "./audit-event.entity.js";

describe("AuditEventEntity", () => {
  it("T01: creates an event with all fields", () => {
    const occurredAt = new Date("2026-01-01T00:00:00Z");
    const event = AuditEventEntity.create(
      "audit-1",
      {
        eventType: "AUTH_SIGN_IN_SUCCESS",
        actorId: "user-1",
        organizationId: "org-1",
        correlationId: "corr-1",
        decision: "allow",
        payload: { ip: "127.0.0.1" },
      },
      occurredAt,
    );

    expect(event.id).toBe("audit-1");
    expect(event.eventType).toBe("AUTH_SIGN_IN_SUCCESS");
    expect(event.actorId).toBe("user-1");
    expect(event.organizationId).toBe("org-1");
    expect(event.correlationId).toBe("corr-1");
    expect(event.decision).toBe("allow");
    expect(event.payload).toEqual({ ip: "127.0.0.1" });
    expect(event.occurredAt).toBe(occurredAt);
  });

  it("T02: creates an event with actorId = null", () => {
    const event = AuditEventEntity.create("audit-2", {
      eventType: "AUTH_OAUTH_START",
      actorId: null,
      organizationId: "org-1",
      correlationId: "corr-2",
      decision: null,
    });

    expect(event.actorId).toBeNull();
  });

  it("T03: defaults payload to an empty object when not provided", () => {
    const event = AuditEventEntity.create("audit-3", {
      eventType: "AUTH_SESSION_REVOKED",
      actorId: "user-1",
      organizationId: null,
      correlationId: "corr-3",
      decision: null,
    });

    expect(event.payload).toEqual({});
  });

  it("defaults occurredAt to now when not provided", () => {
    const before = Date.now();
    const event = AuditEventEntity.create("audit-4", {
      eventType: "AUTH_MFA_ENROLLED",
      actorId: "user-1",
      organizationId: "org-1",
      correlationId: "corr-4",
      decision: "allow",
    });
    const after = Date.now();

    expect(event.occurredAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(event.occurredAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("rehydrates an event from persisted fields via fromPersistence", () => {
    const fields = {
      id: "audit-5",
      eventType: "AUTH_DEVELOPER_REVOKED",
      actorId: "user-2",
      organizationId: "org-2",
      correlationId: "corr-5",
      decision: "deny" as const,
      payload: { reason: "expired" },
      occurredAt: new Date("2026-01-02T00:00:00Z"),
    };

    const event = AuditEventEntity.fromPersistence(fields);

    expect(event).toMatchObject(fields);
  });
});
