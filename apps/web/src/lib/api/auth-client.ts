import {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_ERROR_CODES,
  type ProblemCodeEnvelope,
} from "@lcsp/contracts/auth";

import type {
  MfaVerifyOutcome,
  MfaVerifyRequest,
} from "./types/mfa-verify.types";

export type { MfaVerifyOutcome } from "./types/mfa-verify.types";

export type InvitationScope =
  | {
      type: "assessment";
      assessment: { id: string; name: string };
    }
  | { type: "organization"; assessment: null };

export type InvitationPreview = {
  organization: { id: string; name: string };
  scope: InvitationScope;
  allowed_actions: string[];
  expires_at: string;
};

export type InvitationPreviewOutcome =
  | { kind: "loaded"; preview: InvitationPreview }
  | { kind: "invitation_invalid" }
  | { kind: "error" };

export type AcceptInvitationRequest = {
  invitation_token: string;
  display_name: string;
  password: string;
};

export type AcceptInvitationOutcome =
  | { kind: "invitation_accepted"; location: string }
  | { kind: "invitation_invalid" }
  | { kind: "email_already_exists" }
  | { kind: "password_too_short" }
  | { kind: "error" };

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

export async function previewInvitation(
  invitationToken: string,
): Promise<InvitationPreviewOutcome> {
  const response = await fetch("/api/auth/invitations/preview", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({ invitation_token: invitationToken }),
  });
  const payload: unknown = await response.json().catch(() => null);

  return toInvitationPreviewOutcome(payload, response.ok);
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptInvitationOutcome> {
  const response = await fetch("/api/auth/accept-invitation", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(request),
  });
  const payload: unknown = await response.json().catch(() => null);

  return toAcceptInvitationOutcome(payload, response.ok);
}

export function toInvitationPreviewOutcome(
  payload: unknown,
  ok: boolean,
): InvitationPreviewOutcome {
  if (ok && isInvitationPreview(payload)) {
    return { kind: "loaded", preview: payload };
  }

  return getProblemCode(payload) ===
    ACCEPT_INVITATION_ERROR_CODES.invitationInvalid
    ? { kind: "invitation_invalid" }
    : { kind: "error" };
}

export function toAcceptInvitationOutcome(
  payload: unknown,
  ok: boolean,
): AcceptInvitationOutcome {
  if (ok && isAcceptedInvitation(payload)) {
    return { kind: "invitation_accepted", location: payload.location };
  }

  switch (getProblemCode(payload)) {
    case ACCEPT_INVITATION_ERROR_CODES.invitationInvalid:
      return { kind: "invitation_invalid" };
    case ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists:
      return { kind: "email_already_exists" };
    case ACCEPT_INVITATION_ERROR_CODES.passwordTooShort:
      return { kind: "password_too_short" };
    default:
      return { kind: "error" };
  }
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

function isInvitationPreview(payload: unknown): payload is InvitationPreview {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as InvitationPreview;
  const scopeIsValid =
    candidate.scope?.type === "organization"
      ? candidate.scope.assessment === null
      : candidate.scope?.type === "assessment" &&
        typeof candidate.scope.assessment?.id === "string" &&
        typeof candidate.scope.assessment.name === "string";

  return (
    typeof candidate.organization?.id === "string" &&
    typeof candidate.organization.name === "string" &&
    scopeIsValid &&
    Array.isArray(candidate.allowed_actions) &&
    candidate.allowed_actions.every((action) => typeof action === "string") &&
    typeof candidate.expires_at === "string"
  );
}

function isAcceptedInvitation(
  payload: unknown,
): payload is { ok: true; location: string } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    (payload as { ok?: unknown }).ok === true &&
    typeof (payload as { location?: unknown }).location === "string"
  );
}

function getProblemCode(payload: unknown): string | undefined {
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
