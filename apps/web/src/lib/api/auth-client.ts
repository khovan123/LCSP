import {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_ERROR_CODES,
  PROBLEM_KEYS,
} from "@lcsp/contracts/auth";

import type {
  MfaVerifyOutcome,
  MfaVerifyRequest,
} from "./types/mfa-verify.types";
import { apiRequest } from "./api-request.ts";
import { API_OUTCOME_KINDS } from "./outcome-kinds.ts";
import { getProblemCode } from "./problem-envelope.ts";

export type { MfaVerifyOutcome } from "./types/mfa-verify.types";

const SIGN_IN_ERROR_TITLE_KEYS = {
  invalidCredentials: PROBLEM_KEYS.invalidCredentialsTitle,
  temporaryLock: PROBLEM_KEYS.temporaryLockTitle,
} as const;

const SIGN_IN_ERROR_DETAIL_KEYS = {
  invalidCredentials: PROBLEM_KEYS.invalidCredentialsDetail,
  temporaryLock: PROBLEM_KEYS.temporaryLockDetail,
} as const;

type SignInErrorTitleKey =
  (typeof SIGN_IN_ERROR_TITLE_KEYS)[keyof typeof SIGN_IN_ERROR_TITLE_KEYS];

type SignInErrorDetailKey =
  (typeof SIGN_IN_ERROR_DETAIL_KEYS)[keyof typeof SIGN_IN_ERROR_DETAIL_KEYS];

export const INVITATION_SCOPE_TYPES = {
  assessment: "assessment",
  organization: "organization",
} as const;

export type InvitationScope =
  | {
      type: typeof INVITATION_SCOPE_TYPES.assessment;
      assessment: { id: string; name: string };
    }
  | { type: typeof INVITATION_SCOPE_TYPES.organization; assessment: null };

export type InvitationPreview = {
  organization: { id: string; name: string };
  scope: InvitationScope;
  allowed_actions: string[];
  expires_at: string;
};

export type InvitationPreviewOutcome =
  | { kind: typeof API_OUTCOME_KINDS.loaded; preview: InvitationPreview }
  | { kind: typeof API_OUTCOME_KINDS.invitationInvalid }
  | { kind: typeof API_OUTCOME_KINDS.error };

export type AcceptInvitationRequest = {
  invitation_token: string;
  display_name: string;
  password: string;
};

export type AcceptInvitationOutcome =
  | { kind: typeof API_OUTCOME_KINDS.invitationAccepted; location: string }
  | { kind: typeof API_OUTCOME_KINDS.invitationInvalid }
  | { kind: typeof API_OUTCOME_KINDS.emailAlreadyExists }
  | { kind: typeof API_OUTCOME_KINDS.passwordTooShort }
  | { kind: typeof API_OUTCOME_KINDS.error };

export type SignInRequest = {
  email: string;
  password: string;
};

export type SignInWorkspaceOption = {
  id: string;
  name: string;
};

export type SignInOutcome =
  | { kind: typeof API_OUTCOME_KINDS.authenticated }
  | {
      kind: typeof API_OUTCOME_KINDS.workspaceSelectionRequired;
      workspaces: SignInWorkspaceOption[];
    }
  | { kind: typeof API_OUTCOME_KINDS.mfaRequired }
  | {
      kind: typeof API_OUTCOME_KINDS.error;
      titleKey: SignInErrorTitleKey;
      detailKey: SignInErrorDetailKey;
    };

export function toSignInOutcome(
  payload: unknown,
  ok: boolean,
  problemCode = getProblemCode(payload),
): SignInOutcome {
  if (ok && isSignInSuccess(payload)) {
    if (payload.workspace_selection_required) {
      return {
        kind: API_OUTCOME_KINDS.workspaceSelectionRequired,
        workspaces: payload.workspaces ?? [],
      };
    }
    return payload.mfa_required
      ? { kind: API_OUTCOME_KINDS.mfaRequired }
      : { kind: API_OUTCOME_KINDS.authenticated };
  }

  if (problemCode === AUTH_ERROR_CODES.temporaryLock) {
    return {
      kind: API_OUTCOME_KINDS.error,
      titleKey: SIGN_IN_ERROR_TITLE_KEYS.temporaryLock,
      detailKey: SIGN_IN_ERROR_DETAIL_KEYS.temporaryLock,
    };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    titleKey: SIGN_IN_ERROR_TITLE_KEYS.invalidCredentials,
    detailKey: SIGN_IN_ERROR_DETAIL_KEYS.invalidCredentials,
  };
}

export async function signIn(
  credentials: SignInRequest,
): Promise<SignInOutcome> {
  const { payload, ok, problemCode } = await apiRequest("/api/auth/sign-in", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(credentials),
  });

  return toSignInOutcome(payload, ok, problemCode);
}

export async function previewInvitation(
  invitationToken: string,
): Promise<InvitationPreviewOutcome> {
  const { payload, ok, problemCode } = await apiRequest(
    "/api/auth/invitations/preview",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ invitation_token: invitationToken }),
    },
  );

  return toInvitationPreviewOutcome(payload, ok, problemCode);
}

export async function acceptInvitation(
  request: AcceptInvitationRequest,
): Promise<AcceptInvitationOutcome> {
  const { payload, ok, problemCode } = await apiRequest(
    "/api/auth/accept-invitation",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );

  return toAcceptInvitationOutcome(payload, ok, problemCode);
}

export function toInvitationPreviewOutcome(
  payload: unknown,
  ok: boolean,
  problemCode = getProblemCode(payload),
): InvitationPreviewOutcome {
  if (ok && isInvitationPreview(payload)) {
    return { kind: API_OUTCOME_KINDS.loaded, preview: payload };
  }

  return problemCode === ACCEPT_INVITATION_ERROR_CODES.invitationInvalid
    ? { kind: API_OUTCOME_KINDS.invitationInvalid }
    : { kind: API_OUTCOME_KINDS.error };
}

export function toAcceptInvitationOutcome(
  payload: unknown,
  ok: boolean,
  problemCode = getProblemCode(payload),
): AcceptInvitationOutcome {
  if (ok && isAcceptedInvitation(payload)) {
    return {
      kind: API_OUTCOME_KINDS.invitationAccepted,
      location: payload.location,
    };
  }

  switch (problemCode) {
    case ACCEPT_INVITATION_ERROR_CODES.invitationInvalid:
      return { kind: API_OUTCOME_KINDS.invitationInvalid };
    case ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists:
      return { kind: API_OUTCOME_KINDS.emailAlreadyExists };
    case ACCEPT_INVITATION_ERROR_CODES.passwordTooShort:
      return { kind: API_OUTCOME_KINDS.passwordTooShort };
    default:
      return { kind: API_OUTCOME_KINDS.error };
  }
}

export function toMfaVerifyOutcome(
  payload: unknown,
  ok: boolean,
  problemCode = getProblemCode(payload),
): MfaVerifyOutcome {
  if (
    ok &&
    typeof payload === "object" &&
    payload !== null &&
    (payload as { verified?: unknown }).verified === true
  ) {
    return { kind: API_OUTCOME_KINDS.verified };
  }

  if (problemCode === AUTH_ERROR_CODES.sessionInvalid) {
    return { kind: API_OUTCOME_KINDS.sessionInvalid };
  }
  if (problemCode === AUTH_ERROR_CODES.mfaRateLimited) {
    return {
      kind: API_OUTCOME_KINDS.rateLimited,
      titleKey: "auth.errors.mfaRateLimited.title",
      detailKey: "auth.errors.mfaRateLimited.detail",
    };
  }
  if (problemCode === AUTH_ERROR_CODES.mfaInvalid) {
    return {
      kind: API_OUTCOME_KINDS.invalid,
      titleKey: "auth.errors.mfaInvalid.title",
      detailKey: "auth.errors.mfaInvalid.detail",
    };
  }

  return {
    kind: API_OUTCOME_KINDS.error,
    titleKey: "pages.mfaVerify.errors.requestFailedTitle",
    detailKey: "pages.mfaVerify.errors.requestFailedDetail",
  };
}

export async function verifyMfaOtp(
  request: MfaVerifyRequest,
): Promise<MfaVerifyOutcome> {
  const { payload, ok, problemCode } = await apiRequest(
    "/api/auth/mfa/verify-otp",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
    },
  );

  return toMfaVerifyOutcome(payload, ok, problemCode);
}

export async function signOut(): Promise<void> {
  await apiRequest("/api/auth/sign-out", {
    method: "POST",
  }).catch(() => null);
}

function isSignInSuccess(payload: unknown): payload is {
  ok?: true;
  mfa_required?: boolean;
  workspace_selection_required?: boolean;
  workspaces?: SignInWorkspaceOption[];
} {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }
  const candidate = payload as { ok?: unknown };
  return candidate.ok === undefined || candidate.ok === true;
}

function isInvitationPreview(payload: unknown): payload is InvitationPreview {
  if (typeof payload !== "object" || payload === null) {
    return false;
  }

  const candidate = payload as InvitationPreview;
  const scopeIsValid =
    candidate.scope?.type === INVITATION_SCOPE_TYPES.organization
      ? candidate.scope.assessment === null
      : candidate.scope?.type === INVITATION_SCOPE_TYPES.assessment &&
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
