import { test } from "node:test";
import * as assert from "node:assert/strict";

import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";
import { PUBLIC_ENTRY_ROUTES } from "@lcsp/web/auth-entry";
import {
  canCreateAssessment,
  getAssessmentStatusLabelKey,
  getWizardStatusLabelKey,
  toAssessmentsOutcome,
  toWorkspaceOutcome,
  WORKSPACE_ROUTES,
  getWorkspaceNavigationUrl,
  isWorkspaceNavigationItemActive,
  parseWorkspaceNavigationTarget,
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

test("workspace action projection shows create assessment only when backend grants it", () => {
  assert.equal(canCreateAssessment(["assessment:create"]), true);
  assert.equal(canCreateAssessment(["assessment:read"]), false);
});

test("workspace redirects auth and mfa failures to safe routes", () => {
  assert.deepEqual(
    toWorkspaceOutcome(
      problem(AUTH_ERROR_CODES.authRequired, 401),
      false,
      401,
    ),
    { kind: "redirect", location: PUBLIC_ENTRY_ROUTES.signIn },
  );

  assert.deepEqual(
    toWorkspaceOutcome(
      problem(AUTH_ERROR_CODES.mfaRequired, 403),
      false,
      403,
    ),
    { kind: "redirect", location: WORKSPACE_ROUTES.mfaVerify },
  );
});

test("workspace outcome normalizes the MW-auth-006 flat API contract", () => {
  assert.deepEqual(
    toWorkspaceOutcome(
      {
        organization_id: "org-1",
        organization_name: "Acme Legal",
        subject_role: "Manager",
        granted_actions: ["assessment:create"],
      },
      true,
      200,
    ),
    {
      kind: "loaded",
      workspace: {
        organization: {
          id: "org-1",
          name: "Acme Legal",
        },
        membership: {
          role: "Manager",
        },
        granted_actions: ["assessment:create"],
      },
    },
  );
});

test("assessment status values resolve to business-language i18n keys", () => {
  assert.equal(
    getAssessmentStatusLabelKey("WIZARD_IN_PROGRESS"),
    "pages.workspace.statuses.WIZARD_IN_PROGRESS",
  );
  assert.equal(
    getAssessmentStatusLabelKey("WIZARD_SUBMITTED"),
    "pages.workspace.statuses.WIZARD_SUBMITTED",
  );
  assert.equal(
    getAssessmentStatusLabelKey("EVIDENCE_REQUIRED"),
    "pages.workspace.statuses.EVIDENCE_REQUIRED",
  );
  assert.equal(
    getAssessmentStatusLabelKey("SCAN_IN_PROGRESS"),
    "pages.workspace.statuses.SCAN_IN_PROGRESS",
  );
  assert.equal(
    getAssessmentStatusLabelKey("CLASSIFICATION_LOCKED"),
    "pages.workspace.statuses.CLASSIFICATION_LOCKED",
  );
  assert.equal(
    getAssessmentStatusLabelKey("READY_FOR_REVIEW"),
    "pages.workspace.statuses.READY_FOR_REVIEW",
  );
});

test("wizard status values resolve independently from assessment lifecycle", () => {
  assert.equal(
    getWizardStatusLabelKey("NOT_STARTED"),
    "pages.workspace.wizardStatuses.NOT_STARTED",
  );
  assert.equal(
    getWizardStatusLabelKey("IN_PROGRESS"),
    "pages.workspace.wizardStatuses.IN_PROGRESS",
  );
  assert.equal(
    getWizardStatusLabelKey("SUBMITTED"),
    "pages.workspace.wizardStatuses.SUBMITTED",
  );
});

test("assessment list outcome accepts only array payloads", () => {
  assert.deepEqual(
    toAssessmentsOutcome(
      {
        assessments: [
          {
            id: "assessment-1",
            name: "EU AI Act readiness",
            status: "WIZARD_IN_PROGRESS",
            wizard_status: "IN_PROGRESS",
            created_at: "2026-07-12T01:00:00.000Z",
          },
        ],
      },
      true,
    ),
    {
      kind: "loaded",
      assessments: [
        {
          id: "assessment-1",
          name: "EU AI Act readiness",
          status: "WIZARD_IN_PROGRESS",
          wizard_status: "IN_PROGRESS",
          created_at: "2026-07-12T01:00:00.000Z",
        },
      ],
    },
  );

  assert.deepEqual(toAssessmentsOutcome({}, true), {
    kind: "error",
    detailKey: "pages.workspace.errors.assessmentsUnavailableDetail",
    titleKey: "pages.workspace.errors.assessmentsUnavailableTitle",
  });
});

test("workspace sidebar navigation active state uses pathname and hash", () => {
  assert.equal(
    isWorkspaceNavigationItemActive({
      currentPathname: "/workspace",
      currentHash: "",
      href: "/workspace",
    }),
    true,
  );
  assert.equal(
    isWorkspaceNavigationItemActive({
      currentPathname: "/workspace",
      currentHash: "#assessments",
      href: "/workspace",
    }),
    false,
  );
  assert.equal(
    isWorkspaceNavigationItemActive({
      currentPathname: "/workspace",
      currentHash: "#assessments",
      href: "/workspace#assessments",
    }),
    true,
  );
});

test("workspace sidebar navigation keeps same-page targets as client-side urls", () => {
  assert.deepEqual(parseWorkspaceNavigationTarget("/workspace#assessments"), {
    pathname: "/workspace",
    hash: "#assessments",
  });
  assert.equal(getWorkspaceNavigationUrl("/workspace"), "/workspace");
  assert.equal(
    getWorkspaceNavigationUrl("/workspace#documents"),
    "/workspace#documents",
  );
});
