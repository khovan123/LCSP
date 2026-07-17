import { AuditRedactorService } from "./audit-redactor.service.js";

describe("AuditRedactorService", () => {
  const service = new AuditRedactorService();

  it("removes sensitive fields recursively without mutating safe data", () => {
    expect(
      service.redact({
        action: "sign-in",
        sessionToken: "do-not-return",
        details: {
          userId: "user-1",
          mfaSecret: "do-not-return",
          attempts: [{ recoveryCode: "do-not-return", result: "ok" }],
        },
      }),
    ).toEqual({
      action: "sign-in",
      details: {
        userId: "user-1",
        attempts: [{ result: "ok" }],
      },
    });
  });

  it("returns null for non-object payloads", () => {
    expect(service.redact(null)).toBeNull();
    expect(service.redact("secret-free scalar")).toBeNull();
  });
});
