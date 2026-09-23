import { describe, expect, it } from "@jest/globals";
import { asRecord, cleanString, isNumber, isRecord } from "./type-guards.js";

describe("type-guards", () => {
  describe("isRecord", () => {
    it("returns true for plain objects and records", () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: "value" })).toBe(true);
    });

    it("returns false for null, undefined, arrays, and primitives", () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord([1, 2, 3])).toBe(false);
      expect(isRecord("string")).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe("asRecord", () => {
    it("returns records and null for non-record values", () => {
      expect(asRecord({ key: "value" })).toEqual({ key: "value" });
      expect(asRecord(null)).toBeNull();
      expect(asRecord([])).toBeNull();
      expect(asRecord("value")).toBeNull();
    });
  });

  describe("isNumber", () => {
    it("returns true for finite numbers", () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
      expect(isNumber(1e5)).toBe(true);
    });

    it("returns false for NaN, Infinity, strings, and non-numbers", () => {
      expect(isNumber(Number.NaN)).toBe(false);
      expect(isNumber(Number.POSITIVE_INFINITY)).toBe(false);
      expect(isNumber(Number.NEGATIVE_INFINITY)).toBe(false);
      expect(isNumber("42")).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
    });
  });

  describe("cleanString", () => {
    it("trims and returns non-empty strings", () => {
      expect(cleanString("  hello world  ")).toBe("hello world");
      expect(cleanString("a")).toBe("a");
    });

    it("returns null for empty strings, whitespace-only, and non-strings", () => {
      expect(cleanString("")).toBeNull();
      expect(cleanString("   ")).toBeNull();
      expect(cleanString(null)).toBeNull();
      expect(cleanString(undefined)).toBeNull();
      expect(cleanString(123)).toBeNull();
      expect(cleanString({})).toBeNull();
    });
  });
});
