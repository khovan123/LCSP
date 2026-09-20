import { describe, expect, it } from "@jest/globals";
import {
  idempotency,
  integer,
  parseListQuery,
  record,
} from "./admin-account.validation.js";

describe("admin account validation helpers", () => {
  it("rejects non-integer page/pageSize gracefully without crashing", () => {
    expect(() => parseListQuery({ page: "bad" }, "corr-1")).toThrow();
    expect(integer("not-a-number", 1, 100)).toBe(1);
    expect(integer("15", 1, 100)).toBe(15);
  });

  it("trims and accepts valid idempotency key", () => {
    expect(idempotency("   valid-key   ", "corr-2")).toBe("valid-key");
    expect(() => idempotency("", "corr-2")).toThrow();
    expect(() => idempotency(123, "corr-2")).toThrow();
  });

  it("validates record allowed keys", () => {
    expect(record({ a: 1 }, "corr-3", ["a", "b"])).toEqual({ a: 1 });
    expect(() => record({ a: 1, c: 2 }, "corr-3", ["a", "b"])).toThrow();
    expect(() => record(null, "corr-3")).toThrow();
    expect(() => record("string", "corr-3")).toThrow();
  });
});
