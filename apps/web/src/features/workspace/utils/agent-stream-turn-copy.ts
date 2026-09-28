import {
  ASSESSMENT_AGENT_STREAM_STAGES,
  ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS,
  ASSESSMENT_RUNTIME_PLAN_REASON_CODES,
  type AssessmentAgentStreamStage,
} from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";

import type { AgentStreamRunOutcome } from "./agent-stream-projection";
import { AGENT_STREAM_RUN_OUTCOMES } from "./agent-stream-projection";
import type { AgentStreamRuleHeader } from "../types/agent-stream-rule.types";

const ACTOR_KEYS: Record<AssessmentAgentStreamStage, string> = {
  [ASSESSMENT_AGENT_STREAM_STAGES.scanner]:
    "pages.appShell.agentStreamTurn.scannerActor",
  [ASSESSMENT_AGENT_STREAM_STAGES.interview]:
    "pages.appShell.agentStreamTurn.interviewActor",
  [ASSESSMENT_AGENT_STREAM_STAGES.planner]:
    "pages.appShell.agentStreamTurn.plannerActor",
  [ASSESSMENT_AGENT_STREAM_STAGES.investigate]:
    "pages.appShell.agentStreamTurn.investigatorActor",
  [ASSESSMENT_AGENT_STREAM_STAGES.gate]:
    "pages.appShell.agentStreamTurn.gateActor",
};

const MESSAGE_KEYS: Record<
  AssessmentAgentStreamStage,
  Record<Exclude<AgentStreamRunOutcome, "paused">, string>
> = {
  [ASSESSMENT_AGENT_STREAM_STAGES.scanner]: {
    running: "pages.appShell.agentStreamTurn.scannerRunning",
    completed: "pages.appShell.agentStreamTurn.scannerCompleted",
    failed: "pages.appShell.agentStreamTurn.scannerFailed",
  },
  [ASSESSMENT_AGENT_STREAM_STAGES.interview]: {
    running: "pages.appShell.agentStreamTurn.interviewRunning",
    completed: "pages.appShell.agentStreamTurn.interviewCompleted",
    failed: "pages.appShell.agentStreamTurn.interviewFailed",
  },
  [ASSESSMENT_AGENT_STREAM_STAGES.planner]: {
    running: "pages.appShell.agentStreamTurn.plannerRunning",
    completed: "pages.appShell.agentStreamTurn.plannerCompleted",
    failed: "pages.appShell.agentStreamTurn.plannerFailed",
  },
  [ASSESSMENT_AGENT_STREAM_STAGES.investigate]: {
    running: "pages.appShell.agentStreamTurn.investigateRunning",
    completed: "pages.appShell.agentStreamTurn.investigateCompleted",
    failed: "pages.appShell.agentStreamTurn.investigateFailed",
  },
  [ASSESSMENT_AGENT_STREAM_STAGES.gate]: {
    running: "pages.appShell.agentStreamTurn.gateRunning",
    completed: "pages.appShell.agentStreamTurn.gateCompleted",
    failed: "pages.appShell.agentStreamTurn.gateFailed",
  },
};

// A stage's own priority when picking ONE message for a multi-stage turn:
// the most-downstream stage present is the most informative one to lead with.
const STAGE_MESSAGE_PRIORITY: AssessmentAgentStreamStage[] = [
  ASSESSMENT_AGENT_STREAM_STAGES.gate,
  ASSESSMENT_AGENT_STREAM_STAGES.investigate,
  ASSESSMENT_AGENT_STREAM_STAGES.planner,
  ASSESSMENT_AGENT_STREAM_STAGES.interview,
  ASSESSMENT_AGENT_STREAM_STAGES.scanner,
];

/**
 * One customer-facing headline (actor + one-line message) for an agent turn,
 * derived from every stage that one dispatch touched plus its run outcome.
 * A dispatch that ran Planner and Investigator synchronously (the common
 * case — one boundary call, not two separate customer-visible turns) gets
 * one combined actor instead of showing as two turns. Paused shares one
 * message across every stage, matching the existing cooperative-stop copy
 * already used for the raw timeline (pages.appShell.agentStreamActivities.billingPaused).
 */
export function buildAgentStreamTurnHeadline(
  stages: AssessmentAgentStreamStage[],
  outcome: AgentStreamRunOutcome,
): { actor: string; message: string } {
  const primaryStage =
    STAGE_MESSAGE_PRIORITY.find((stage) => stages.includes(stage)) ??
    stages[0] ??
    ASSESSMENT_AGENT_STREAM_STAGES.interview;
  const isCombinedAssessmentTurn =
    stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.planner) &&
    stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.investigate);
  const actor = isCombinedAssessmentTurn
    ? t("pages.appShell.agentStreamTurn.assessmentAgentActor")
    : t(ACTOR_KEYS[primaryStage]);
  const message =
    outcome === AGENT_STREAM_RUN_OUTCOMES.paused
      ? t("pages.appShell.agentStreamActivities.billingPaused")
      : t(MESSAGE_KEYS[primaryStage][outcome]);
  return { actor, message };
}

export function selectPlannerOutcomes(ruleHeaders: AgentStreamRuleHeader[]): {
  selected: AgentStreamRuleHeader[];
  skipped: AgentStreamRuleHeader[];
} {
  const planned = ruleHeaders.filter((header) => header.planned);
  return {
    // A selected rule with neither goals nor a concept yet (still streaming
    // in) has nothing meaningful to show — everything else falls back to
    // its concept, never its raw ruleId (see AgentStreamPlannerOutput).
    selected: planned.filter(
      (header) =>
        header.decision === ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.select &&
        header.reasonCode !==
          ASSESSMENT_RUNTIME_PLAN_REASON_CODES.plannerFailure &&
        (header.goals.length > 0 || header.concept !== null),
    ),
    skipped: planned.filter(
      (header) =>
        header.decision === ASSESSMENT_ENGINEERING_RULE_PLAN_DECISIONS.skip,
    ),
  };
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
