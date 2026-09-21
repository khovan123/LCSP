import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  EXEMPTION_SCHEMA_VERSION,
  PROOF_SCHEMA_VERSION,
  REQUIRED_STAGE_NAMES,
  REQUIRED_VISIBLE_EVENT_TYPES,
  validateManagedSandboxProof,
  validateNonSandboxExemption,
} from "./check-managed-sandbox-release-gate.mjs";

const headSha = "a".repeat(40);
const baseSha = "b".repeat(40);
const priorSha = "c".repeat(40);

function completeStages() {
  return REQUIRED_STAGE_NAMES.map((name) => ({
    name,
    status:
      name === "INTERVIEW_BRANCH" ? "GOVERNED_NO_INTERVIEW" : "COMPLETED",
    branch:
      name === "INTERVIEW_BRANCH" ? "NO_INTERVIEW_GOVERNED" : undefined,
    evidenceRefs: [`evidence:${name.toLowerCase()}`],
  }));
}

function validProof(overrides = {}) {
  return {
    schemaVersion: PROOF_SCHEMA_VERSION,
    run: {
      prNumber: 338,
      runId: "review-run-338-1",
      generation: 1,
      baseSha,
      headSha,
      triggerType: "webhook:synchronize",
      triggerId: "delivery-338",
      status: "COMPLETED",
      terminalVerdict: "READY",
    },
    exactHead: {
      pinnedHeadSha: headSha,
      sandboxCheckoutSha: headSha,
      finalHeadSha: headSha,
      headUnchanged: true,
    },
    canonicalRuns: [
      {
        runId: "review-run-338-1",
        generation: 1,
        headSha,
        state: "COMPLETED",
        authoritative: true,
      },
      {
        runId: "review-run-338-old",
        generation: 0,
        headSha: priorSha,
        state: "SUPERSEDED",
        authoritative: false,
        reason: "HEAD_CHANGED",
      },
    ],
    restartReconciliation: {
      performed: true,
      activeRunIds: ["review-run-338-1"],
      orphanedRuns: [
        {
          runId: "review-run-335-opened",
          previousState: "RUNNING",
          newState: "SUPERSEDED",
          reason: "PM2_RESTART_ORPHANED_PRIOR_HEAD",
        },
      ],
    },
    managedSandbox: {
      hostKind: "MANAGED_SANDBOX",
      productionEquivalent: true,
      checkoutSha: headSha,
      artifactRefs: ["artifact:sandbox-log"],
      logRefs: ["log:sanitized-sandbox"],
    },
    ci: {
      headSha,
      allRequiredTerminal: true,
      allRequiredPassed: true,
      requiredChecks: [
        {
          name: "API e2e tests",
          externalId: "check-run:api-e2e",
          status: "COMPLETED",
          conclusion: "SUCCESS",
        },
      ],
      pendingChecks: [],
    },
    github: {
      headSha,
      mergeable: true,
      mergeState: "MERGEABLE",
      branchState: "CURRENT",
    },
    stages: completeStages(),
    correlation: {
      prNumber: 338,
      runId: "review-run-338-1",
      generation: 1,
      baseSha,
      headSha,
      assessmentId: "assessment-338",
      scannerRunId: "scanner-338",
      programEvidenceGraphId: "pge-338",
      runtimeRunId: "runtime-338",
      agentRunIds: ["agent-planner-338", "agent-investigator-338"],
      engineeringRuleIds: ["ENG-HUMAN-OVERSIGHT"],
      toolCallIds: ["tool-call-338"],
      messageIds: ["message-338"],
      ciCheckRunIds: ["check-run:api-e2e"],
      runtimeEventIds: ["runtime-event-338"],
    },
    runtime: {
      persistedVisibleEventTypes: [...REQUIRED_VISIBLE_EVENT_TYPES],
      reconnectReplayProven: true,
      webSseObserved: true,
    },
    scenarios: {
      duplicateRunPattern: {
        prNumber: 335,
        staleRunState: "SUPERSEDED",
        staleRunAuthoritative: false,
        canonicalRunId: "review-run-335-synchronize",
      },
      greenExactHead: {
        prNumber: 338,
        codeReviewPassed: true,
        ciPassed: true,
        mergeable: true,
        verdict: "READY",
      },
      ciPendingCase: {
        prNumber: 336,
        codeReviewPassed: true,
        pendingChecks: ["API e2e tests"],
        verdict: "NOT_READY",
      },
      cancellation: {
        cancelledRunId: "review-run-cancelled",
        cancelledRunState: "CANCELLED",
        unrelatedRunId: "review-run-other",
        unrelatedRunStates: ["RUNNING"],
      },
    },
    privacy: {
      sanitized: true,
      secretScanPassed: true,
      hiddenReasoningExcluded: true,
      rawPromptExcluded: true,
      privateContextExcluded: true,
      unrestrictedSourceExcluded: true,
    },
    artifacts: ["artifact:machine-readable-proof"],
    ...overrides,
  };
}

function clone(value) {
  return structuredClone(value);
}

function expectInvalid(proof, pattern) {
  const result = validateManagedSandboxProof(proof);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), pattern);
}

test("accepts a complete managed-sandbox proof for the green exact-head case", () => {
  const result = validateManagedSandboxProof(validProof());

  assert.equal(result.ok, true);
  assert.deepEqual(result.summary, {
    prNumber: 338,
    runId: "review-run-338-1",
    generation: 1,
    headSha,
    verdict: "READY",
  });
});

test("rejects READY verdicts when the PR head changes before final verdict", () => {
  const proof = clone(validProof());
  proof.exactHead.finalHeadSha = priorSha;
  proof.exactHead.headUnchanged = false;

  expectInvalid(proof, /READY\/PASS verdict is forbidden when final PR head changed/u);
});

test("rejects duplicate authoritative active runs for the same current head", () => {
  const proof = clone(validProof());
  proof.canonicalRuns.push({
    runId: "review-run-338-duplicate",
    generation: 1,
    headSha,
    state: "RUNNING",
    authoritative: true,
  });
  proof.canonicalRuns[0].state = "RUNNING";

  expectInvalid(proof, /only one canonical active run/u);
});

test("rejects stale prior-head runs that remain active after synchronize", () => {
  const proof = clone(validProof());
  proof.canonicalRuns.push({
    runId: "review-run-338-prior-active",
    generation: 0,
    headSha: priorSha,
    state: "RUNNING",
    authoritative: false,
  });

  expectInvalid(proof, /prior-head run review-run-338-prior-active/u);
});

test("rejects code-review PASS as READY while required CI is still pending", () => {
  const proof = clone(validProof());
  proof.ci.allRequiredTerminal = false;
  proof.ci.allRequiredPassed = false;
  proof.ci.pendingChecks = ["API e2e tests"];

  expectInvalid(proof, /READY\/PASS verdict is forbidden while required CI is pending/u);
});

test("rejects missing pipeline stages and runtime event classes", () => {
  const proof = clone(validProof());
  proof.stages = proof.stages.filter((stage) => stage.name !== "PLANNER");
  proof.runtime.persistedVisibleEventTypes =
    proof.runtime.persistedVisibleEventTypes.filter(
      (eventType) => eventType !== "MODEL_RESULT",
    );

  expectInvalid(
    proof,
    /stages missing PLANNER[\s\S]*runtime persisted event types missing MODEL_RESULT/u,
  );
});

test("rejects raw prompts, hidden reasoning, source and secret-like text", () => {
  const proof = clone(validProof());
  proof.privacy.systemPrompt = "You are the hidden system prompt";
  proof.privacy.hiddenReasoning = "private deliberation";
  proof.privacy.note = "api_key=ghp_123456789012345678901234567890123456";

  expectInvalid(
    proof,
    /privacy\.systemPrompt[\s\S]*privacy\.hiddenReasoning[\s\S]*secret-like/u,
  );
});

test("rejects selected-run cancellation that also cancels unrelated runs", () => {
  const proof = clone(validProof());
  proof.scenarios.cancellation.unrelatedRunStates = ["CANCELLED"];

  expectInvalid(proof, /must not cancel unrelated runs/u);
});

test("accepts an explicit non-sandbox exemption without marking release ready", () => {
  const result = validateNonSandboxExemption(
    {
      schemaVersion: EXEMPTION_SCHEMA_VERSION,
      ticket: "LCSP-333",
      approvedBy: "release-owner",
      reason: "Managed VPS unavailable; release remains blocked pending acceptance.",
      scope: "DIAGNOSTIC_ONLY",
      expiresAt: "2099-01-01T00:00:00.000Z",
      riskAcceptance: "Temporary non-ready exemption for evidence collection.",
    },
    new Date("2026-09-21T00:00:00.000Z"),
  );

  assert.equal(result.ok, true);
  assert.equal(result.summary.scope, "DIAGNOSTIC_ONLY");
  assert.equal(result.warnings.length, 1);
});

test("rejects expired or release-ready non-sandbox exemptions", () => {
  const result = validateNonSandboxExemption(
    {
      schemaVersion: EXEMPTION_SCHEMA_VERSION,
      ticket: "LCSP-333",
      approvedBy: "release-owner",
      reason: "Expired exemption",
      scope: "RELEASE_READY",
      expiresAt: "2026-01-01T00:00:00.000Z",
      riskAcceptance: "Expired",
    },
    new Date("2026-09-21T00:00:00.000Z"),
  );

  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /cannot assert RELEASE_READY/u);
  assert.match(result.errors.join("\n"), /expired/u);
});

test("CLI validates proof and writes a machine-readable outcome artifact", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "lcsp333-managed-sandbox-gate-"),
  );
  const proofPath = path.join(directory, "proof.json");
  const outPath = path.join(directory, "outcome.json");
  await writeFile(proofPath, `${JSON.stringify(validProof(), null, 2)}\n`);

  const result = spawnSync(
    process.execPath,
    [
      "scripts/check-managed-sandbox-release-gate.mjs",
      "--proof",
      proofPath,
      "--out",
      outPath,
    ],
    {
      cwd: path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."),
      encoding: "utf8",
    },
  );

  assert.equal(result.status, 0, result.stderr);
  const outcome = JSON.parse(await readFile(outPath, "utf8"));
  assert.equal(outcome.ok, true);
  assert.equal(outcome.mode, "PROOF");
});
