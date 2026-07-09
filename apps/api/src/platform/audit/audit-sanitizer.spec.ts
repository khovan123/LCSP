import { AuditSanitizer } from "./audit-sanitizer.js";

describe("AuditSanitizer", () => {
  it("returns undefined payload and no removed keys when payload is absent", () => {
    const result = AuditSanitizer.sanitize(undefined);

    expect(result).toEqual({ payload: undefined, removedKeys: [] });
  });

  it("keeps all fields when none match the sensitive pattern", () => {
    const result = AuditSanitizer.sanitize({ userId: "u-1", action: "login" });

    expect(result).toEqual({
      payload: { userId: "u-1", action: "login" },
      removedKeys: [],
    });
  });

  it.each([
    "password",
    "passwordHash",
    "sessionToken",
    "apiSecret",
    "apiKey",
    "mfaNonce",
    "verificationCode",
    "contentHash",
  ])("strips sensitive-keyed field %s and reports it as removed", (key) => {
    const result = AuditSanitizer.sanitize({
      [key]: "sensitive-value",
      safe: "ok",
    });

    expect(result.payload).toEqual({ safe: "ok" });
    expect(result.removedKeys).toEqual([key]);
  });

  it("strips multiple sensitive fields at once", () => {
    const result = AuditSanitizer.sanitize({
      passwordHash: "x",
      sessionToken: "y",
      userId: "u-1",
    });

    expect(result.payload).toEqual({ userId: "u-1" });
    expect(result.removedKeys.sort()).toEqual(["passwordHash", "sessionToken"]);
  });
});
