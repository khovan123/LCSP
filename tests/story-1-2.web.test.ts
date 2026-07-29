import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  SESSION_COOKIE_NAME,
  signInSchema,
  sessionCookieOptions,
  toSignInOutcome,
} from "@lcsp/web";

function problem(code: string, status: number) {
  return {
    ok: false,
    problem: {
      type: `test/${code.toLowerCase().replaceAll("_", "-")}`,
      status,
      code,
      titleKey: "auth.errors.validationFailed.title",
      detailKey: "auth.errors.validationFailed.detail",
      requiredAction: "none",
      correlationId: "test-correlation",
    },
  };
}

test("successful sign-in outcomes redirect without exposing a session token", () => {
  assert.deepEqual(toSignInOutcome({ ok: true, mfa_required: false }, true), {
    kind: "authenticated",
  });
  assert.deepEqual(toSignInOutcome({ ok: true, mfa_required: true }, true), {
    kind: "mfa_required",
  });
});

test("sign-in errors expose safe i18n keys", () => {
  assert.deepEqual(
    toSignInOutcome(problem("INVALID_CREDENTIALS", 401), false),
    {
      kind: "error",
      titleKey: "auth.errors.invalidCredentials.title",
      detailKey: "auth.errors.invalidCredentials.detail",
    },
  );
  assert.deepEqual(
    toSignInOutcome(problem("TEMPORARY_LOCKED", 429), false),
    {
      kind: "error",
      titleKey: "auth.errors.temporaryLock.title",
      detailKey: "auth.errors.temporaryLock.detail",
    },
  );
});

test("session storage is an httpOnly same-site cookie", () => {
  assert.equal(SESSION_COOKIE_NAME, "lcsp_session");
  assert.equal(sessionCookieOptions.httpOnly, true);
  assert.equal(sessionCookieOptions.sameSite, "lax");
});

test("sign-in schema rejects malformed credentials without retaining a password outside the form", () => {
  assert.equal(
    signInSchema.safeParse({
      email: "reviewer@lcsp.test",
      password: "correct-horse",
    }).success,
    true,
  );
  assert.equal(
    signInSchema.safeParse({ email: "not-an-email", password: "correct-horse" })
      .success,
    false,
  );
  assert.equal(
    signInSchema.safeParse({ email: "reviewer@lcsp.test", password: "" })
      .success,
    false,
  );
});
