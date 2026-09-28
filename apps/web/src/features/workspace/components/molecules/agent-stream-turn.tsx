import {
  ASSESSMENT_AGENT_STREAM_STAGES,
  ASSESSMENT_RUNTIME_PLAN_REASON_CODES,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
} from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";

import type { AgentStreamRuleHeader } from "../../types/agent-stream-rule.types";
import type { AgentStreamTurnProps } from "../../types/agent-stream-turn.types";
import { projectAgentStreamTurnOutput } from "../../utils/agent-stream-turn-output";
import {
  buildAgentStreamTurnHeadline,
  selectPlannerOutcomes,
} from "../../utils/agent-stream-turn-copy";
import { agentThinkingLabel } from "../../utils/agent-thinking-label";
import { AgentStreamActivityLog } from "./agent-stream-activity-log";
import { AgentStreamInvestigatorProgress } from "./agent-stream-investigator-progress";
import { AgentStreamTimeline } from "./agent-stream-timeline";
import {
  deriveAgentStreamRunOutcome,
  AGENT_STREAM_RUN_OUTCOMES,
  isAgentStreamDispatchFailed,
  shouldShowAgentStreamHistoryAction,
} from "../../utils/agent-stream-projection";
import { AgentStreamTechnicalSummary } from "./agent-stream-technical-summary";
import { AgentStreamInvestigatorOutput } from "./agent-stream-investigator-output";
import {
  AgentStreamPlannerOutput,
  AgentStreamRuleGoalList,
} from "./agent-stream-planner-output";
import {
  AgentMessage,
  AgentTurn,
  ThinkingLine,
  ThoughtLine,
} from "./agent-turn";

/**
 * One customer-visible turn for one pipeline dispatch — which may span
 * several stages at once (Planner and Investigator commonly run
 * synchronously inside the same boundary call). One headline, then each
 * participating stage's own output section, then the raw feed collapsed
 * behind Technical details.
 */
export function AgentStreamTurn({
  stages,
  runId,
  events,
  stageEvents,
  output,
  outcomeOverride,
  history,
  onLoadOlder,
  outputs,
  planOrder,
  className,
}: AgentStreamTurnProps) {
  const outcome = outcomeOverride ?? deriveAgentStreamRunOutcome(events);
  const showHistoryAction = shouldShowAgentStreamHistoryAction(
    history,
    onLoadOlder,
  );
  const { actor, message } = buildAgentStreamTurnHeadline(stages, outcome);
  // Each investigated rule carries its own Technical details, so the
  // Investigator's turn-level feed keeps only events outside any rule.
  const investigating = stages.includes(
    ASSESSMENT_AGENT_STREAM_STAGES.investigate,
  );
  const ruleOwned = new Set(
    (stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.investigate] ?? []).filter(
      (event) => event.engineeringRuleId,
    ),
  );
  const outsideRule = (event: (typeof events)[number]) => !ruleOwned.has(event);
  const technicalEvents = investigating ? events.filter(outsideRule) : events;
  const technicalStageEvents = investigating
    ? Object.fromEntries(
        Object.entries(stageEvents).map(([stage, items]) => [
          stage,
          (items ?? []).filter(outsideRule),
        ]),
      )
    : stageEvents;
  const labels = turnLabels();

  const {
    plannerRules: plannerRuleHeaders,
    investigatorRules: investigatorRuleHeaders,
  } = output ?? projectAgentStreamTurnOutput(stageEvents);

  return (
    <AgentTurn className={className}>
      <AgentMessage>
        <ThoughtLine label={actor} />
        {/* The Scanner step already carries this turn's thinking line. */}
        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.scanner) ? null : (
          <ThinkingLine
            label={agentThinkingLabel(
              outcome === AGENT_STREAM_RUN_OUTCOMES.running,
              events,
            )}
            className="mt-1 text-muted-foreground"
          />
        )}
        <ThinkingLine label={message} className="mt-1" />

        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.scanner) ? (
          <AgentStreamActivityLog events={events} />
        ) : null}

        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.investigate) ? (
          <AgentStreamInvestigatorProgress
            events={events}
            dispatchRunning={outcome === AGENT_STREAM_RUN_OUTCOMES.running}
            planOrder={
              planOrder ??
              plannerRuleHeaders
                .filter((rule) => rule.planned)
                .sort((a, b) => a.sequence - b.sequence)
                .map((rule) => rule.ruleId)
            }
            // A rule cannot still be running once its dispatch has ended.
            rules={
              outcome === AGENT_STREAM_RUN_OUTCOMES.running
                ? investigatorRuleHeaders
                : investigatorRuleHeaders.map((rule) =>
                    rule.status === ASSESSMENT_RUNTIME_RUN_STATUSES.running
                      ? { ...rule, status: ASSESSMENT_RUNTIME_RUN_STATUSES.failed }
                      : rule,
                  )
            }
          />
        ) : null}

        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.planner)
          ? renderPlannerOutput(
              plannerRuleHeaders,
              labels,
              deriveAgentStreamRunOutcome(
                stageEvents[ASSESSMENT_AGENT_STREAM_STAGES.planner] ?? [],
              ) === AGENT_STREAM_RUN_OUTCOMES.failed ||
                plannerRuleHeaders.some(
                  (rule) =>
                    rule.reasonCode ===
                    ASSESSMENT_RUNTIME_PLAN_REASON_CODES.plannerFailure,
                ),
            )
          : null}

        {/* Per-rule results live in each rule's row; only a dispatch-level
            failure is summarised here. */}
        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.investigate) &&
        isAgentStreamDispatchFailed(events) ? (
          <AgentStreamInvestigatorOutput rules={[]} dispatchFailed />
        ) : null}

        {outputs ? <div className="mt-3 space-y-3">{outputs}</div> : null}

        {technicalEvents.length > 0 || showHistoryAction ? (
          <details
            className="mt-3 group/technical"
            data-slot="agent-stream-turn-technical-details"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground select-none">
              {labels.technicalDetails}
              <span>· {technicalEvents.length}</span>
            </summary>
            <AgentStreamTechnicalSummary
              events={technicalEvents}
              stageEvents={technicalStageEvents}
            />
            <details className="mt-2" data-stream-raw-events>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {t("pages.appShell.agentStreamTechnicalSummary.rawEvents")} ·{" "}
                {technicalEvents.length}
              </summary>
              <div className="mt-1.5">
                <AgentStreamTimeline
                  events={technicalEvents}
                  activeRunId={runId}
                  embedded
                  outcomeOverride={outcomeOverride}
                  history={history}
                  onLoadOlder={onLoadOlder}
                />
              </div>
            </details>
          </details>
        ) : null}
      </AgentMessage>
    </AgentTurn>
  );
}

function renderPlannerOutput(
  ruleHeaders: AgentStreamRuleHeader[],
  labels: ReturnType<typeof turnLabels>,
  failed: boolean,
) {
  const { selected, skipped } = selectPlannerOutcomes(ruleHeaders);
  if (failed && selected.length === 0)
    return (
      <div
        data-stream-planner-failure-summary
        className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
      >
        {labels.plannerFailed}
      </div>
    );
  // A raw rule ID (e.g. "ER-7") means nothing to a customer, so a skipped
  // rule is listed exactly like a selected one: by its goals, else concept.
  const nameableSkipped = skipped.filter(
    (rule) => rule.goals.length > 0 || rule.concept !== null,
  );
  if (selected.length === 0 && skipped.length === 0) return null;
  return (
    <>
      {selected.length > 0 ? (
        <AgentStreamPlannerOutput rules={selected} />
      ) : null}
      {skipped.length > 0 ? (
        <details
          data-stream-planner-skipped
          className="mt-3 min-w-0 text-sm text-foreground"
        >
          <summary className="cursor-pointer font-medium select-none">
            {labels.skippedGoals} · {skipped.length}
          </summary>
          {nameableSkipped.length > 0 ? (
            <div data-stream-planner-skipped-goals>
              <AgentStreamRuleGoalList rules={nameableSkipped} />
            </div>
          ) : null}
        </details>
      ) : null}
    </>
  );
}

function turnLabels() {
  return {
    technicalDetails: t("pages.appShell.agentStreamTechnicalDetails"),
    plannerFailed: t("pages.appShell.agentStreamTurn.plannerFailed"),
    skippedGoals: t("pages.appShell.agentStreamTurn.skippedGoals"),
  };
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
