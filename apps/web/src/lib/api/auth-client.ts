import {
  AUTH_ERROR_CODES,
  type AuthErrorCode,
  type ProblemCodeEnvelope,
} from "@lcsp/contracts/auth";

import type {
  MfaVerifyOutcome,
  MfaVerifyRequest,
} from "./types/mfa-verify.types";

export type { MfaVerifyOutcome } from "./types/mfa-verify.types";

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignInOutcome =
  | { kind: "authenticated" }
  | { kind: "mfa_required" }
  | {
      kind: "error";
      titleKey:
        | "auth.errors.invalidCredentials.title"
        | "auth.errors.temporaryLock.title";
      detailKey:
        | "auth.errors.invalidCredentials.detail"
        | "auth.errors.temporaryLock.detail";
    };

export function toSignInOutcome(payload: unknown, ok: boolean): SignInOutcome {
  if (ok && isSignInSuccess(payload)) {
    return payload.mfa_required
      ? { kind: "mfa_required" }
      : { kind: "authenticated" };
  }

  const code = getProblemCode(payload);
  if (code === AUTH_ERROR_CODES.temporaryLock) {
    return {
      kind: "error",
      titleKey: "auth.errors.temporaryLock.title",
      detailKey: "auth.errors.temporaryLock.detail",
    };
  }

  return {
    kind: "error",
    titleKey: "auth.errors.invalidCredentials.title",
    detailKey: "auth.errors.invalidCredentials.detail",
  };
}

export async function signIn(
  credentials: SignInRequest,
): Promise<SignInOutcome> {
  const response = await fetch("/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(credentials),
  });

  const payload: unknown = await response.json().catch(() => null);
  return toSignInOutcome(payload, response.ok);
}

export function toMfaVerifyOutcome(
  payload: unknown,
  ok: boolean,
): MfaVerifyOutcome {
  if (
    ok &&
    typeof payload === "object" &&
    payload !== null &&
    (payload as { verified?: unknown }).verified === true
  ) {
    return { kind: "verified" };
  }

  const code = getProblemCode(payload);
  if (code === AUTH_ERROR_CODES.sessionInvalid) {
    return { kind: "session_invalid" };
  }
  if (code === AUTH_ERROR_CODES.mfaRateLimited) {
    return {
      kind: "rate_limited",
      titleKey: "auth.errors.mfaRateLimited.title",
      detailKey: "auth.errors.mfaRateLimited.detail",
    };
  }
  if (code === AUTH_ERROR_CODES.mfaInvalid) {
    return {
      kind: "invalid",
      titleKey: "auth.errors.mfaInvalid.title",
      detailKey: "auth.errors.mfaInvalid.detail",
    };
  }

  return {
    kind: "error",
    titleKey: "pages.mfaVerify.errors.requestFailedTitle",
    detailKey: "pages.mfaVerify.errors.requestFailedDetail",
  };
}

export async function verifyMfaOtp(
  request: MfaVerifyRequest,
): Promise<MfaVerifyOutcome> {
  const response = await fetch("/api/auth/mfa/verify-otp", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(request),
  });

  const payload: unknown = await response.json().catch(() => null);
  return toMfaVerifyOutcome(payload, response.ok);
}

function isSignInSuccess(
  payload: unknown,
): payload is { ok: true; mfa_required?: boolean } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true
  );
}

function getProblemCode(payload: unknown): AuthErrorCode | undefined {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const problem = payload as ProblemCodeEnvelope;
  if ("problem" in problem && problem.problem) {
    return (
      problem.problem.code ??
      ("error_code" in problem.problem ? problem.problem.error_code : undefined)
    );
  }

  return "code" in problem ? (problem.code ?? problem.error_code) : undefined;
}
