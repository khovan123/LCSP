import { test } from "node:test";
import * as assert from "node:assert/strict";

import {
  ACCEPT_INVITATION_ERROR_CODES,
  AUTH_ERROR_CODES,
} from "@lcsp/contracts/auth";
import { EVIDENCE_ERROR_CODES } from "@lcsp/contracts/evidence";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import {
  acceptInvitationSchema,
  getAcceptedInvitationLocation,
  getVisibleDeveloperActions,
  isAcceptInvitationApiSuccess,
  safeAcceptInvitationErrorCode,
  safeInvitationPreviewErrorCode,
  sanitizeEvidencePayload,
  toAcceptInvitationOutcome,
  toDeveloperTaskContextOutcome,
  toEvidenceOutcome,
  toInvitationPreviewOutcome,
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

test("T01 accepted assessment invitation redirects without exposing session credentials", () => {
  assert.deepEqual(
    toAcceptInvitationOutcome(
      { ok: true, location: "/developer/assessments/assessment-1" },
      true,
    ),
    {
      kind: "invitation_accepted",
      location: "/developer/assessments/assessment-1",
    },
  );
  assert.equal(
    getAcceptedInvitationLocation({
      type: "assessment",
      assessment_id: "assessment-1",
    }),
    "/developer/assessments/assessment-1",
  );
});

test("T02 invitation failures collapse to one non-leaking state", () => {
  for (const payload of [
    problem(ACCEPT_INVITATION_ERROR_CODES.invitationInvalid, 403),
  ]) {
    assert.deepEqual(toInvitationPreviewOutcome(payload, false), {
      kind: "invitation_invalid",
    });
    assert.deepEqual(toAcceptInvitationOutcome(payload, false), {
      kind: "invitation_invalid",
    });
  }
  const sensitiveFailure = {
    ...problem("INTERNAL_FAILURE", 500),
    invitation_token: "must-not-cross-the-bff",
    email: "developer@example.com",
  };
  assert.equal(
    safeInvitationPreviewErrorCode(sensitiveFailure),
    "UPSTREAM_RESPONSE_INVALID",
  );
  assert.equal(
    safeAcceptInvitationErrorCode(sensitiveFailure),
    "UPSTREAM_RESPONSE_INVALID",
  );
});

test("T03 existing email receives its dedicated sign-in outcome", () => {
  assert.deepEqual(
    toAcceptInvitationOutcome(
      problem(ACCEPT_INVITATION_ERROR_CODES.emailAlreadyExists, 409),
      false,
    ),
    { kind: "email_already_exists" },
  );
});

test("T04 invitation form validates display name and twelve-character password", () => {
  assert.equal(
    acceptInvitationSchema.safeParse({
      display_name: "Developer",
      password: "twelve-chars",
    }).success,
    true,
  );
  assert.equal(
    acceptInvitationSchema.safeParse({
      display_name: "Developer",
      password: "short",
    }).success,
    false,
  );
  assert.equal(
    acceptInvitationSchema.safeParse({
      display_name: "x".repeat(101),
      password: "twelve-chars",
    }).success,
    false,
  );
});

test("T05 preview and scoped context preserve only display-safe projections", () => {
  assert.equal(
    toInvitationPreviewOutcome(
      {
        organization: { id: "org-1", name: "Acme" },
        scope: {
          type: "assessment",
          assessment: { id: "assessment-1", name: "AI review" },
        },
        allowed_actions: [PBAC_ACTIONS.evidenceReadRedacted],
        expires_at: "2026-07-21T00:00:00.000Z",
      },
      true,
    ).kind,
    "loaded",
  );
  assert.equal(
    toDeveloperTaskContextOutcome(
      {
        organization: { id: "org-1", name: "Acme" },
        scope: {
          type: "assessment",
          assessment: { id: "assessment-1", name: "AI review" },
        },
        granted_actions: [PBAC_ACTIONS.evidenceReadRedacted],
      },
      true,
      200,
    ).kind,
    "loaded",
  );
});

test("T06 evidence projection entirely removes source-location properties", () => {
  const sanitized = sanitizeEvidencePayload({
    source_archive_url: "https://private.example/source.zip",
    findings: [
      {
        finding_id: "finding-1",
        tool: "semgrep",
        finding_type: "model-call",
        severity: "MEDIUM",
        description: "An AI model call was detected.",
        file_path: "src/private.ts",
        line_number: 42,
      },
    ],
  });
  const serialized = JSON.stringify(sanitized);
  assert.equal(serialized.includes("file_path"), false);
  assert.equal(serialized.includes("line_number"), false);
  assert.equal(serialized.includes("src/private.ts"), false);
  assert.equal(serialized.includes("source_archive_url"), false);
  assert.equal(
    sanitizeEvidencePayload({
      findings: [{ file_path: "src/private.ts", line_number: 42 }],
    }),
    null,
  );
});

test("T07 missing evidence becomes the normal empty state", () => {
  assert.deepEqual(
    toEvidenceOutcome(
      problem(EVIDENCE_ERROR_CODES.notFound, 404),
      false,
      404,
    ),
    { kind: "empty" },
  );
});

test("T08 session revocation redirects to sign-in", () => {
  assert.deepEqual(
    toEvidenceOutcome(
      problem(AUTH_ERROR_CODES.sessionInvalid, 401),
      false,
      401,
    ),
    { kind: "redirect", location: "/sign-in" },
  );
  assert.deepEqual(
    toEvidenceOutcome(
      problem(AUTH_ERROR_CODES.mfaRequired, 401),
      false,
      401,
    ),
    { kind: "redirect", location: "/mfa/verify" },
  );
});

test("T09 narrowed scope stays inline as revoked", () => {
  assert.deepEqual(
    toEvidenceOutcome(
      problem(AUTH_ERROR_CODES.pbacDenied, 403),
      false,
      403,
    ),
    { kind: "access_revoked" },
  );
});

test("T10 manager-only actions are removed even if supplied by an API", () => {
  const visible = getVisibleDeveloperActions([
    PBAC_ACTIONS.evidenceReadRedacted,
    PBAC_ACTIONS.evidenceRead,
    PBAC_ACTIONS.assessmentCreate,
    PBAC_ACTIONS.membershipRevoke,
  ]);
  assert.deepEqual(visible.map(({ action }) => action), [
    PBAC_ACTIONS.evidenceReadRedacted,
  ]);
});

test("T11 invitation acceptance outcomes contain no session token field", () => {
  const outcome = toAcceptInvitationOutcome(
    {
      ok: true,
      location: "/workspace",
      session_token: "must-not-reach-client-js",
    },
    true,
  );
  assert.equal("session_token" in outcome, false);
  assert.equal(
    isAcceptInvitationApiSuccess({
      session_token: "   ",
      scope: { type: "assessment", assessment_id: "assessment-1" },
    }),
    false,
  );
  assert.equal(
    isAcceptInvitationApiSuccess({
      session_token: "session-token",
      scope: { type: "assessment", assessment_id: "" },
    }),
    false,
  );
  assert.equal(
    getAcceptedInvitationLocation({
      type: "organization",
      assessment_id: null,
    }),
    "/developer/assessments",
  );
});
