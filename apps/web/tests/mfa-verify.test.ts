import * as assert from "node:assert/strict";
import { test } from "node:test";

import {
  toMfaVerifyOutcome,
  type MfaVerifyOutcome,
  verifyMfaOtp,
} from "../src/lib/api/auth-client.ts";
import { mfaVerifySchema } from "../src/features/auth/schemas/mfa-verify.schema.ts";
import { buildMfaVerifyApiBody } from "../src/app/api/auth/mfa/verify-otp/mfa-verify-proxy.ts";

test("MFA verification accepts only a six-digit numeric OTP", () => {
  assert.equal(mfaVerifySchema.safeParse({ otp: "012345" }).success, true);
  assert.equal(mfaVerifySchema.safeParse({ otp: "12345" }).success, false);
  assert.equal(mfaVerifySchema.safeParse({ otp: "1234567" }).success, false);
  assert.equal(mfaVerifySchema.safeParse({ otp: "12a456" }).success, false);
});

test("successful MFA verification returns a workspace redirect outcome", () => {
  assert.deepEqual(toMfaVerifyOutcome({ verified: true }, true), {
    kind: "verified",
  });
});

test("invalid and replayed OTP responses use the same non-leaking message", () => {
  const expected: MfaVerifyOutcome = {
    kind: "invalid",
    titleKey: "auth.errors.mfaInvalid.title",
    detailKey: "auth.errors.mfaInvalid.detail",
  };

  assert.deepEqual(
    toMfaVerifyOutcome({ problem: { code: "OTP_INVALID" } }, false),
    expected,
  );
  assert.deepEqual(
    toMfaVerifyOutcome({ error_code: "OTP_REPLAYED" }, false),
    expected,
  );
});

test("MFA rate limiting returns a locked outcome", () => {
  assert.deepEqual(
    toMfaVerifyOutcome({ problem: { code: "MFA_RATE_LIMITED" } }, false),
    {
      kind: "rate_limited",
      titleKey: "auth.errors.mfaRateLimited.title",
      detailKey: "auth.errors.mfaRateLimited.detail",
    },
  );
});

test("invalid or expired pending sessions return a sign-in outcome", () => {
  assert.deepEqual(
    toMfaVerifyOutcome({ problem: { code: "SESSION_INVALID" } }, false),
    { kind: "session_invalid" },
  );
});

test("MFA client sends the OTP only in a same-origin JSON body", async () => {
  const originalFetch = globalThis.fetch;
  let capturedInput: string | URL | Request | undefined;
  let capturedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    capturedInput = input;
    capturedInit = init;
    return Response.json({ verified: true });
  };

  try {
    await verifyMfaOtp({ otp: "012345" });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(capturedInput, "/api/auth/mfa/verify-otp");
  assert.equal(capturedInit?.credentials, "same-origin");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), { otp: "012345" });
});

test("MFA BFF body uses the server-side pending session", () => {
  assert.deepEqual(
    buildMfaVerifyApiBody("pending-session", {
      otp: "012345",
      session_token: "client-controlled-token",
    }),
    {
    session_token: "pending-session",
    otp: "012345",
    },
  );
});
