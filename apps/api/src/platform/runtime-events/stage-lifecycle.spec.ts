import { describe, expect, it } from "@jest/globals";
import { ASSESSMENT_STAGE_LIFECYCLE_STATES } from "@lcsp/contracts/evidence";

import {
  deriveStageLifecycles,
  type StageLifecycleInput,
} from "./stage-lifecycle.js";

const STATES = ASSESSMENT_STAGE_LIFECYCLE_STATES;

function progress(
  overrides: {
    planner?: Partial<{
      candidateCount: number;
      selectedCount: number;
      skippedCount: number;
    }>;
    investigator?: Partial<{
      selectedCount: number;
      completedCount: number;
      domainLimitedCount: number;
      limitedOrFailedCount: number;
      waitingForInputCount: number;
      runtimeFailedCount: number;
      pendingCount: number;
    }>;
  } = {},
) {
  return [
    {
      assessmentId: "assessment-1",
      runId: "run-1",
      planningBatchId: "batch-1",
      contextRevisionUsed: 4,
      targeted: false,
      approximate: false,
      planner: {
        candidateCount: 41,
        selectedCount: 40,
        skippedCount: 1,
        ...overrides.planner,
      },
      investigator: {
        selectedCount: 40,
        completedCount: 0,
        domainLimitedCount: 0,
        limitedOrFailedCount: 0,
        waitingForInputCount: 0,
        runtimeFailedCount: 0,
        pendingCount: 40,
        ...overrides.investigator,
      },
    },
  ];
}

function derive(overrides: Partial<StageLifecycleInput> = {}) {
  const input: StageLifecycleInput = {
    assessmentIds: ["assessment-1"],
    scanJobs: [
      {
        assessmentId: "assessment-1",
        status: "COMPLETED",
        updatedAt: "2026-09-28T10:00:00.000Z",
      },
    ],
    evidenceReports: [{ assessmentId: "assessment-1", status: "ACCEPTED" }],
    interviewThreads: [
      {
        assessmentId: "assessment-1",
        contextRevision: 4,
        processedRevision: 4,
        activeQuestionId: null,
      },
    ],
    engineeringProgress: progress(),
    liveAssessmentIds: new Set<string>(),
    ...overrides,
  };
  return deriveStageLifecycles(input)[0];
}

describe("deriveStageLifecycles", () => {
  it("keeps the scanner done while a downstream dispatch is active", () => {
    // Planner/Investigator run under the same scan job and post SCAN-tagged
    // bookkeeping; that must never reopen a finished scan.
    const lifecycle = derive({
      liveAssessmentIds: new Set(["assessment-1"]),
    });

    expect(lifecycle.scanner.state).toBe(STATES.done);
    expect(lifecycle.scanner.source).toBe("acceptedEvidence");
    expect(lifecycle.investigator.state).toBe(STATES.running);
  });

  it("shows the scanner running only for a real active scan job", () => {
    const lifecycle = derive({
      scanJobs: [
        {
          assessmentId: "assessment-1",
          status: "RUNNING",
          updatedAt: "2026-09-28T11:00:00.000Z",
        },
      ],
      evidenceReports: [],
    });

    expect(lifecycle.scanner.state).toBe(STATES.running);
    expect(lifecycle.scanner.source).toBe("scanJob");
  });

  it("prefers the newest scan job when an assessment was rescanned", () => {
    const lifecycle = derive({
      scanJobs: [
        {
          assessmentId: "assessment-1",
          status: "FAILED",
          updatedAt: "2026-09-28T09:00:00.000Z",
        },
        {
          assessmentId: "assessment-1",
          status: "RUNNING",
          updatedAt: "2026-09-28T12:00:00.000Z",
        },
      ],
      evidenceReports: [],
    });

    expect(lifecycle.scanner.state).toBe(STATES.running);
  });

  it("reports the interview waiting only while a question is open", () => {
    expect(derive().interview.state).toBe(STATES.contextConfirmed);
    expect(
      derive({
        interviewThreads: [
          {
            assessmentId: "assessment-1",
            contextRevision: 5,
            processedRevision: 4,
            activeQuestionId: "question-1",
          },
        ],
      }).interview.state,
    ).toBe(STATES.waitingForCustomer);
  });

  it("marks the plan ready from the durable plan, not from a live dispatch", () => {
    const lifecycle = derive();

    expect(lifecycle.planner.state).toBe(STATES.planReady);
    expect(lifecycle.planner.source).toBe("ruleInvestigationPlan");
    expect(lifecycle.planner.detail).toBe("40/41");
  });

  it("separates partial claims from complete claims", () => {
    expect(
      derive({
        engineeringProgress: progress({
          investigator: { completedCount: 40, pendingCount: 0 },
        }),
      }).investigator.state,
    ).toBe(STATES.claimsComplete);

    expect(
      derive({
        engineeringProgress: progress({
          investigator: {
            completedCount: 38,
            pendingCount: 0,
            limitedOrFailedCount: 2,
          },
        }),
      }).investigator.state,
    ).toBe(STATES.claimsPartial);
  });

  it("surfaces enrichment when every selected rule stopped for want of scanner memory", () => {
    const lifecycle = derive({
      engineeringProgress: progress({
        investigator: {
          completedCount: 0,
          pendingCount: 0,
          domainLimitedCount: 40,
        },
      }),
    });

    expect(lifecycle.investigator.state).toBe(STATES.needsScannerEnrichment);
    expect(lifecycle.gate.state).toBe(STATES.queued);
  });

  it("opens the gate only once no selected rule is still pending", () => {
    expect(derive().gate.state).toBe(STATES.queued);
    expect(
      derive({
        engineeringProgress: progress({
          investigator: { completedCount: 40, pendingCount: 0 },
        }),
      }).gate.state,
    ).toBe(STATES.ready);
  });

  it("does not crash for an assessment with no artifacts at all", () => {
    const lifecycle = derive({
      scanJobs: [],
      evidenceReports: [],
      interviewThreads: [],
      engineeringProgress: [],
    });

    expect(lifecycle.scanner.state).toBe(STATES.queued);
    expect(lifecycle.interview.state).toBe(STATES.queued);
    expect(lifecycle.planner.state).toBe(STATES.queued);
    expect(lifecycle.investigator.state).toBe(STATES.queued);
    expect(lifecycle.gate.state).toBe(STATES.queued);
  });
});
