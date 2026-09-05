import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import {
  ASSESSMENT_FLOW_STAGES,
  ASSESSMENT_REPOSITORY_PROVIDERS,
} from "@lcsp/contracts/assessment";
import { REPOSITORY_SCAN_JOB_STATUSES } from "@lcsp/contracts/github-integration";
import { TECHNICAL_EVIDENCE_REPORT_STATUSES } from "@lcsp/contracts/scan";

import { deriveAssessmentFlowRuntime } from "../src/features/assessment-flow/utils/assessment-flow-runtime";
import { repositorySetupSchema } from "../src/features/assessment-flow/schemas/repository-setup.schema";
import { TOOL_ACTIVITY_STATUSES } from "../src/features/workspace/types/assessment-chat.types";

const newAssessmentPagePath = new URL(
  "../src/app/(workspace)/assessments/new/page.tsx",
  import.meta.url,
);
const repositorySetupPath = new URL(
  "../src/features/assessment-flow/components/organisms/repository-setup-step.tsx",
  import.meta.url,
);
const scannerSequencePath = new URL(
  "../src/features/assessment-flow/components/molecules/scanner-activity-sequence.tsx",
  import.meta.url,
);

test("new assessment opens repository setup and removes the legacy details form", async () => {
  const [page, setup] = await Promise.all([
    readFile(newAssessmentPagePath, "utf8"),
    readFile(repositorySetupPath, "utf8"),
  ]);

  assert.match(page, /RepositorySetupStep/);
  assert.doesNotMatch(page, /CreateAssessmentForm/);
  assert.match(setup, /GitProviderQuestion/);
  assert.match(setup, /connectAssessmentRepository/);
  assert.match(setup, /startRepositoryAnalysis/);
  assert.match(setup, /AssessmentComposer/);
});

test("flow remains in repository setup before a secure repository connection", () => {
  const flow = deriveAssessmentFlowRuntime({
    hasRepositoryConnection: false,
    snapshot: null,
    scanJob: null,
    evidenceReport: null,
  });

  assert.equal(flow.stage, ASSESSMENT_FLOW_STAGES.repositorySetup);
  assert.equal(flow.evidenceAccepted, false);
});

test("repository setup accepts only a repository URL matching a supported provider", () => {
  assert.equal(
    repositorySetupSchema.safeParse({
      provider: ASSESSMENT_REPOSITORY_PROVIDERS.github,
      repositoryUrl: "https://github.com/acme/payments.git",
    }).success,
    true,
  );
  assert.equal(
    repositorySetupSchema.safeParse({
      provider: ASSESSMENT_REPOSITORY_PROVIDERS.gitlab,
      repositoryUrl: "https://github.com/acme/payments",
    }).success,
    false,
  );
  assert.equal(
    repositorySetupSchema.safeParse({
      provider: ASSESSMENT_REPOSITORY_PROVIDERS.bitbucket,
      repositoryUrl: "https://bitbucket.org/acme/payments",
    }).success,
    false,
  );
});

test("flow remains in scanner while source evidence is incomplete", () => {
  const flow = deriveAssessmentFlowRuntime({
    hasRepositoryConnection: true,
    snapshot: {
      id: "snapshot-1",
      assessmentId: "assessment-1",
      provider: ASSESSMENT_REPOSITORY_PROVIDERS.github,
      repositoryFullName: "acme/payments",
      commitSha: "a".repeat(40),
      createdAt: "2026-09-05T00:00:00.000Z",
    },
    scanJob: {
      id: "scan-1",
      assessmentId: "assessment-1",
      snapshotId: "snapshot-1",
      status: REPOSITORY_SCAN_JOB_STATUSES.running,
      attemptCount: 1,
      blockedReason: null,
      updatedAt: "2026-09-05T00:00:01.000Z",
    },
    evidenceReport: null,
  });

  assert.equal(flow.stage, ASSESSMENT_FLOW_STAGES.scanner);
  assert.deepEqual(
    flow.activities.map((activity) => activity.status),
    [
      TOOL_ACTIVITY_STATUSES.completed,
      TOOL_ACTIVITY_STATUSES.completed,
      TOOL_ACTIVITY_STATUSES.running,
      TOOL_ACTIVITY_STATUSES.pending,
      TOOL_ACTIVITY_STATUSES.pending,
    ],
  );
});

test("flow begins Interview only after accepted evidence for the scan", () => {
  const flow = deriveAssessmentFlowRuntime({
    hasRepositoryConnection: true,
    snapshot: {
      id: "snapshot-1",
      assessmentId: "assessment-1",
      provider: ASSESSMENT_REPOSITORY_PROVIDERS.github,
      repositoryFullName: "acme/payments",
      commitSha: "a".repeat(40),
      createdAt: "2026-09-05T00:00:00.000Z",
    },
    scanJob: {
      id: "scan-1",
      assessmentId: "assessment-1",
      snapshotId: "snapshot-1",
      status: REPOSITORY_SCAN_JOB_STATUSES.completed,
      attemptCount: 1,
      blockedReason: null,
      updatedAt: "2026-09-05T00:00:02.000Z",
    },
    evidenceReport: {
      id: "evidence-1",
      assessmentId: "assessment-1",
      scanJobId: "scan-1",
      snapshotId: "snapshot-1",
      status: TECHNICAL_EVIDENCE_REPORT_STATUSES.accepted,
      rejectionReason: null,
      createdAt: "2026-09-05T00:00:03.000Z",
    },
  });

  assert.equal(flow.stage, ASSESSMENT_FLOW_STAGES.interview);
  assert.equal(flow.evidenceAccepted, true);
  assert.ok(
    flow.activities.every(
      (activity) => activity.status === TOOL_ACTIVITY_STATUSES.completed,
    ),
  );
});

test("scanner activity composition reuses the shared ToolActivity rows", async () => {
  const source = await readFile(scannerSequencePath, "utf8");

  assert.match(source, /ToolActivityList/);
  assert.match(source, /ToolActivityRow/);
  assert.doesNotMatch(source, /function ToolActivityRow/);
});
