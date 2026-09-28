import {
  ASSESSMENT_AGENT_STREAM_STAGES,
  ASSESSMENT_RUNTIME_PLAN_REASON_CODES,
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
import { AgentStreamActivityLog } from "./agent-stream-activity-log";
import { AgentStreamTimeline } from "./agent-stream-timeline";
import {
  deriveAgentStreamRunOutcome,
  AGENT_STREAM_RUN_OUTCOMES,
  isAgentStreamDispatchFailed,
  shouldShowAgentStreamHistoryAction,
} from "../../utils/agent-stream-projection";
import { AgentStreamTechnicalSummary } from "./agent-stream-technical-summary";
import { AgentStreamInvestigatorOutput } from "./agent-stream-investigator-output";
import { AgentStreamPlannerOutput } from "./agent-stream-planner-output";
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
  className,
}: AgentStreamTurnProps) {
  const outcome = outcomeOverride ?? deriveAgentStreamRunOutcome(events);
  const showHistoryAction = shouldShowAgentStreamHistoryAction(
    history,
    onLoadOlder,
  );
  const { actor, message } = buildAgentStreamTurnHeadline(stages, outcome);
  const labels = turnLabels();

  const {
    plannerRules: plannerRuleHeaders,
    investigatorRules: investigatorRuleHeaders,
  } = output ?? projectAgentStreamTurnOutput(stageEvents);

  return (
    <AgentTurn className={className}>
      <AgentMessage>
        <ThoughtLine label={actor} />
        <ThinkingLine label={message} className="mt-1" />

        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.scanner) ? (
          <AgentStreamActivityLog events={events} />
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

        {stages.includes(ASSESSMENT_AGENT_STREAM_STAGES.investigate) ? (
          <AgentStreamInvestigatorOutput
            rules={investigatorRuleHeaders}
            dispatchFailed={isAgentStreamDispatchFailed(events)}
          />
        ) : null}

        {events.length > 0 || showHistoryAction ? (
          <details
            className="mt-3 group/technical"
            data-slot="agent-stream-turn-technical-details"
          >
            <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-muted-foreground select-none">
              {labels.technicalDetails}
              <span>· {events.length}</span>
            </summary>
            <AgentStreamTechnicalSummary
              events={events}
              stageEvents={stageEvents}
            />
            <details className="mt-2" data-stream-raw-events>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {t("pages.appShell.agentStreamTechnicalSummary.rawEvents")} ·{" "}
                {events.length}
              </summary>
              <div className="mt-1.5">
                <AgentStreamTimeline
                  events={events}
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
  // rule only gets listed once it has a real concept to show instead.
  const nameableSkipped = skipped.filter((rule) => rule.concept !== null);
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
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              {nameableSkipped.map((rule) => (
                <li
                  key={rule.ruleId}
                  data-stream-planner-skipped-goal
                  className="break-words"
                >
                  {rule.concept}
                </li>
              ))}
            </ul>
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
