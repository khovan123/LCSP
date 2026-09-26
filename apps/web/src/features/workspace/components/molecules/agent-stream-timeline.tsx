import {
  ASSESSMENT_AGENT_STREAM_EVENT_TYPES,
  ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS,
  ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
  type AssessmentAgentStreamEvent,
  type AssessmentRuntimeSummaryValue,
} from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";
import {
  Brain,
  CheckCircle2,
  ChevronDown,
  Circle,
  LoaderCircle,
  Terminal,
  Wrench,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import type { WorkspaceRuntimeAgentStreamHistoryState } from "../../types/workspace-runtime.types";
import { AgentMessage, AgentTurn } from "./agent-turn";

type AgentStreamTimelineProps = {
  events: AssessmentAgentStreamEvent[];
  activeRunId?: string | null;
  reset?: boolean;
  history?: WorkspaceRuntimeAgentStreamHistoryState;
  onLoadOlder?: () => void;
  className?: string;
};

type StreamRowKind =
  | "tool"
  | "reasoning"
  | "model"
  | "progress"
  | "log"
  | "activity";

type StreamRowStatus = "running" | "completed" | "failed" | "neutral";

type ProjectedStreamRow = {
  id: string;
  runId: string;
  sequence: number;
  label: string;
  detail: string | null;
  meta: string | null;
  failed: boolean;
  kind: StreamRowKind;
  status: StreamRowStatus;
  input: AssessmentRuntimeSummaryValue | null;
  output: AssessmentRuntimeSummaryValue | null;
  technical: AssessmentRuntimeSummaryValue | null;
};

export function AgentStreamTimeline({
  events,
  activeRunId = null,
  reset = false,
  history,
  onLoadOlder,
  className,
}: AgentStreamTimelineProps) {
  const visibleEvents = reset
    ? []
    : scopeAgentStreamRunEvents(events, activeRunId);
  const rows = projectStreamRows(visibleEvents);
  const labels = streamLabels();
  const hasRunningActivity = rows.some((row) => row.status === "running");
  const failed = !hasRunningActivity && streamEndedWithFailure(visibleEvents);
  const duration = streamDuration(visibleEvents);
  const showHistoryAction =
    ((history?.hasMore === true && history.nextCursor !== null) ||
      history?.error != null) &&
    onLoadOlder !== undefined;
  if (rows.length === 0 && !showHistoryAction) return null;

  return (
    <AgentTurn className={className}>
      <AgentMessage>
        <details
          data-slot="agent-stream-timeline"
          open={hasRunningActivity}
          className="group min-w-0"
        >
          <summary className="flex cursor-pointer list-none items-center gap-2 py-1 text-xs font-medium text-muted-foreground select-none">
            {hasRunningActivity ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : failed ? (
              <XCircle className="size-3.5 text-destructive" />
            ) : (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            )}
            <span className={cn(failed && "text-destructive")}>
              {hasRunningActivity
                ? labels.thinking
                : failed
                  ? labels.failed
                  : labels.completed}
              {!hasRunningActivity && duration ? ` · ${duration}` : ""}
            </span>
            <ChevronDown className="ml-0.5 size-3 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="mt-1.5 space-y-2 pl-0.5">
            {showHistoryAction ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={history?.isLoading === true}
                onClick={onLoadOlder}
              >
                {history?.isLoading === true
                  ? labels.loadingOlder
                  : history?.error != null
                    ? labels.retryHistory
                    : labels.loadOlder}
              </Button>
            ) : null}
            {history?.error ? (
              <div className="text-xs text-destructive">
                {labels.historyLoadFailed}
              </div>
            ) : null}
            <div className="relative space-y-0.5">
              <div
                aria-hidden="true"
                className="absolute bottom-3 left-[7px] top-3 w-px bg-border/60"
              />
              {rows.map((row) => (
                <StreamRowView key={row.id} row={row} labels={labels} />
              ))}
            </div>
          </div>
        </details>
      </AgentMessage>
    </AgentTurn>
  );
}

function scopeAgentStreamRunEvents(
  events: AssessmentAgentStreamEvent[],
  activeRunId: string | null,
): AssessmentAgentStreamEvent[] {
  if (activeRunId) {
    return events.filter((event) => event.runId === activeRunId);
  }
  return latestAgentStreamRunEvents(events);
}

function latestAgentStreamRunEvents(
  events: AssessmentAgentStreamEvent[],
): AssessmentAgentStreamEvent[] {
  if (events.length === 0) return events;

  const latest = events.reduce((current, candidate) => {
    const emittedAt = candidate.emittedAt.localeCompare(current.emittedAt);
    if (emittedAt > 0) return candidate;
    if (emittedAt < 0) return current;
    if (candidate.runId === current.runId && candidate.sequence > current.sequence) {
      return candidate;
    }
    if (candidate.runId !== current.runId && candidate.eventId > current.eventId) {
      return candidate;
    }
    return current;
  });

  return events.filter((event) => event.runId === latest.runId);
}

function projectStreamRows(
  events: AssessmentAgentStreamEvent[],
): ProjectedStreamRow[] {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  const rows: ProjectedStreamRow[] = [];
  const toolRows = new Map<string, ProjectedStreamRow>();
  const modelProgressRows = new Map<string, ProjectedStreamRow>();
  const runtimeRows = new Map<string, ProjectedStreamRow>();
  const lifecycleRows = new Map<string, ProjectedStreamRow>();
  const semanticToolIds = new Set<string>();
  const semanticModelOutputIds = new Set<string>();
  const semanticReasoningIds = new Set<string>();
  const recoveredProviderFailures = recoveredProviderFailureCutoffs(ordered);

  for (const event of ordered) {
    const semantic = semanticData(event.data);
    if (!semantic) continue;
    const toolIdentity = toolIdentityKey(event, semantic);
    if (
      toolIdentity &&
      (semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall ||
        semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult)
    ) {
      semanticToolIds.add(toolIdentity);
    }
    if (
      semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput &&
      event.messageId
    ) {
      semanticModelOutputIds.add(event.messageId);
    }
    if (
      semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary &&
      event.messageId
    ) {
      semanticReasoningIds.add(event.messageId);
    }
  }

  let previousMergeKey: string | null = null;
  for (const event of ordered) {
    if (
      shouldSuppressEvent(
        event,
        semanticToolIds,
        semanticModelOutputIds,
        semanticReasoningIds,
        recoveredProviderFailures,
      )
    ) {
      continue;
    }

    const semantic = semanticData(event.data);
    const toolIdentity = semantic ? toolIdentityKey(event, semantic) : null;
    if (
      semantic &&
      toolIdentity &&
      (semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall ||
        semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult)
    ) {
      const existing = toolRows.get(toolIdentity);
      if (existing) {
        existing.sequence = event.sequence;
        existing.failed =
          existing.failed ||
          event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed;
        existing.status = existing.failed ? "failed" : "completed";
        existing.meta = semanticMeta(event, semantic);
        existing.technical = appendTechnicalDetails(
          existing.technical,
          technicalEventDetails(event),
        );
        if (
          semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall
        ) {
          existing.input = cleanedStreamValue(semantic.parameters);
        } else {
          existing.output = cleanedStreamValue(semantic.resultSummary);
          existing.detail = null;
        }
        previousMergeKey = null;
        continue;
      }

      const projected = toStreamRow(event);
      projected.kind = "tool";
      projected.label = meaningfulToolActivity(
        typeof semantic.toolName === "string" ? semantic.toolName : event.toolName,
        semantic.parameters ?? semantic.resultSummary ?? null,
      );
      projected.detail = null;
      projected.input =
        semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall
          ? cleanedStreamValue(semantic.parameters)
          : null;
      projected.output =
        semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult
          ? cleanedStreamValue(semantic.resultSummary)
          : null;
      projected.status =
        semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult
          ? projected.failed
            ? "failed"
            : "completed"
          : "running";
      rows.push(projected);
      toolRows.set(toolIdentity, projected);
      previousMergeKey = null;
      continue;
    }

    if (
      semantic?.kind ===
      ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary
    ) {
      const projected = toStreamRow(event);
      projected.kind = "reasoning";
      projected.label = activityCopy("reasoningReviewed");
      projected.detail =
        reasoningSummaryText(semantic) ??
        event.text ??
        streamLabels().running;
      projected.meta = semanticMeta(event, semantic);
      rows.push(projected);
      previousMergeKey = null;
      continue;
    }

    const lifecycleProgressKey = lifecycleEventProgressKey(event);
    if (lifecycleProgressKey) {
      const existing = lifecycleRows.get(lifecycleProgressKey);
      if (existing) {
        const updated = toStreamRow(event);
        existing.sequence = event.sequence;
        existing.label = updated.label;
        existing.detail = updated.detail;
        existing.meta = updated.meta;
        existing.failed = updated.failed;
        existing.status = updated.status;
        existing.technical = appendTechnicalDetails(
          existing.technical,
          updated.technical,
        );
        previousMergeKey = null;
        continue;
      }
      const projected = toStreamRow(event);
      rows.push(projected);
      lifecycleRows.set(lifecycleProgressKey, projected);
      previousMergeKey = null;
      continue;
    }

    const runtimeProgressKey = runtimeEventProgressKey(event);
    if (runtimeProgressKey) {
      const existing = runtimeRows.get(runtimeProgressKey);
      if (existing) {
        const updated = toStreamRow(event);
        existing.sequence = event.sequence;
        existing.label = updated.label;
        existing.detail = updated.detail;
        existing.meta = updated.meta;
        existing.failed = updated.failed;
        existing.status = updated.status;
        existing.technical = appendTechnicalDetails(
          existing.technical,
          updated.technical,
        );
        previousMergeKey = null;
        continue;
      }
      const projected = toStreamRow(event);
      rows.push(projected);
      runtimeRows.set(runtimeProgressKey, projected);
      previousMergeKey = null;
      continue;
    }

    const modelProgressKey = modelCallProgressKey(event);
    if (modelProgressKey) {
      const existing = modelProgressRows.get(modelProgressKey);
      if (existing) {
        const updated = toStreamRow(event);
        existing.sequence = event.sequence;
        existing.label = updated.label;
        existing.detail = updated.detail;
        existing.meta = updated.meta;
        existing.failed = updated.failed;
        existing.status = updated.status;
        existing.technical = appendTechnicalDetails(
          existing.technical,
          updated.technical,
        );
        previousMergeKey = null;
        continue;
      }
      const projected = toStreamRow(event);
      rows.push(projected);
      modelProgressRows.set(modelProgressKey, projected);
      previousMergeKey = null;
      continue;
    }

    const mergeKey = deltaMergeKey(event);
    const previous = rows.at(-1);
    if (mergeKey && previous && previousMergeKey === mergeKey) {
      previous.detail = `${previous.detail ?? ""}${event.text ?? ""}`;
      previous.sequence = event.sequence;
      previous.technical = appendTechnicalDetails(
        previous.technical,
        technicalEventDetails(event),
      );
      continue;
    }
    rows.push(toStreamRow(event));
    previousMergeKey = mergeKey;
  }

  return finalizeProjectedRows(rows, ordered);
}

function finalizeProjectedRows(
  rows: ProjectedStreamRow[],
  events: AssessmentAgentStreamEvent[],
): ProjectedStreamRow[] {
  const outcomes = terminalOutcomesByRun(events);
  return rows.map((row) => {
    if (row.status !== "running") return row;
    const outcome = outcomes.get(row.runId);
    if (!outcome) return row;
    return {
      ...row,
      status: outcome,
      failed: outcome === "failed",
      label:
        outcome === "failed" && row.kind === "model"
          ? activityCopy("aiAnalysisFailed")
          : row.label,
    };
  });
}

function terminalOutcomesByRun(
  events: AssessmentAgentStreamEvent[],
): Map<string, "completed" | "failed"> {
  const outcomes = new Map<string, "completed" | "failed">();
  for (const event of [...events].sort((left, right) => left.sequence - right.sequence)) {
    const runtimeType = runtimeEventType(event);
    if (
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed ||
      runtimeType === "RUN_FAILED"
    ) {
      outcomes.set(event.runId, "failed");
      continue;
    }
    if (
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted ||
      runtimeType === "RUN_COMPLETED"
    ) {
      outcomes.set(event.runId, "completed");
    }
  }
  return outcomes;
}

function deltaMergeKey(event: AssessmentAgentStreamEvent): string | null {
  if (
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelContentDelta &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelReasoningDelta &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolCallDelta
  ) {
    return null;
  }
  return [
    event.runId,
    event.eventType,
    event.agentName ?? "",
    event.messageId ?? "",
    event.toolCallId ?? "",
    event.namespace.join("/"),
  ].join(":");
}

function toStreamRow(event: AssessmentAgentStreamEvent): ProjectedStreamRow {
  const semantic = semanticData(event.data);
  if (semantic) {
    const failed =
      event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed ||
      semantic.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed;
    return row(
      event,
      meaningfulSemanticActivity(event, semantic),
      semantic.kind === ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary
        ? reasoningSummaryText(semantic) ?? event.text
        : null,
      semanticMeta(event, semantic),
      failed,
    );
  }

  switch (event.eventType) {
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.subagentSelected:
      return row(event, activityCopy("subagentSelected"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted:
      return row(event, activityCopy("repositoryAnalysisStarted"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted:
      return row(event, activityCopy("repositoryAnalysisCompleted"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed:
      return row(event, activityCopy("repositoryAnalysisFailed"), null, eventMeta(event), true);
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted:
      return row(event, activityCopy("scanWorkflowStarted"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted:
      return row(event, activityCopy("scanWorkflowCompleted"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed:
      return row(event, activityCopy("scanWorkflowFailed"), null, eventMeta(event), true);
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelReasoningDelta:
      return row(event, activityCopy("reasoningReviewed"), event.text, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelContentDelta:
      return row(event, activityCopy("modelOutputReviewed"), event.text, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolCallDelta:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolResult:
      return row(event, meaningfulToolActivity(event.toolName, event.data), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.log:
      return row(event, activityCopy("runtimeProgress"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent: {
      const projected = row(
        event,
        meaningfulRuntimeActivity(event),
        null,
        eventMeta(event),
        event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
      );
      projected.status = runtimeEventStatus(event);
      projected.failed = projected.status === "failed";
      return projected;
    }
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphUpdate:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphState:
      return row(event, activityCopy("analysisProgressUpdated"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback: {
      const projected = row(event, activityCopy("providerFallback"), null, eventMeta(event));
      projected.status = "completed";
      return projected;
    }
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.credentialRotation: {
      const projected = row(event, activityCopy("credentialRotation"), null, eventMeta(event));
      projected.status = "completed";
      return projected;
    }
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.scannerActivity:
      return row(event, activityCopy("repositoryEvidenceInspected"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.engineeringRule:
      return row(event, activityCopy("engineeringRuleEvaluated"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.skillUsage:
      return row(event, activityCopy("analysisSkillApplied"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.ruleProvenance:
      return row(event, activityCopy("evidenceProvenanceLinked"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest:
      return row(event, activityCopy("aiAnalysisRunning"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult:
      return row(event, activityCopy("aiAnalysisCompleted"), null, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat:
      return row(event, activityCopy("aiAnalysisRunning"), null, modelCallMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted:
      return row(event, activityCopy("aiAnalysisCompleted"), null, modelCallMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout:
      return row(event, activityCopy("aiAnalysisFailed"), null, modelCallMeta(event), true);
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult:
      return row(event, meaningfulToolActivity(event.toolName, event.data), null, eventMeta(event));
    default:
      return row(event, activityCopy("analysisProgressUpdated"), null, eventMeta(event));
  }
}

function meaningfulSemanticActivity(
  event: AssessmentAgentStreamEvent,
  semantic: SemanticRecord,
): string {
  switch (semantic.kind) {
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult:
      return meaningfulToolActivity(
        firstString(semantic.toolName, event.toolName),
        semantic.parameters ?? semantic.resultSummary ?? null,
      );
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary:
      return activityCopy("reasoningReviewed");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelRequest:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.decisionModel:
      return activityCopy("aiAnalysisRunning");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput:
      return activityCopy("aiAnalysisCompleted");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerFile:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerSymbol:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerDependency:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerTraceStep:
      return activityCopy("repositoryEvidenceInspected");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.engineeringRule:
      return activityCopy("engineeringRuleEvaluated");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.skillUsage:
      return activityCopy("analysisSkillApplied");
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.ruleProvenance:
      return activityCopy("evidenceProvenanceLinked");
    default:
      return activityCopy("analysisProgressUpdated");
  }
}

function meaningfulRuntimeActivity(event: AssessmentAgentStreamEvent): string {
  const data = isSummaryRecord(event.data) ? event.data : null;
  const identity = (event.toolName ?? event.nodeName ?? event.source ?? "").toLowerCase();
  const runtimeEventType = summaryString(data?.runtimeEventType)?.toUpperCase() ?? "";
  const outputSummary = data?.outputSummary;
  const outputText =
    typeof outputSummary === "string"
      ? outputSummary.toLowerCase()
      : outputSummary === undefined || outputSummary === null
        ? ""
        : formatSemanticValue(outputSummary).toLowerCase();
  const text = (event.text ?? "").toLowerCase();

  if (identity.includes("repository_archive_download")) {
    return text.includes("downloaded") || runtimeEventType === "TOOL_COMPLETED"
      ? activityCopy("repositorySourceDownloaded")
      : activityCopy("repositorySourceDownloading");
  }
  if (identity.includes("repository_sandbox_hydration")) {
    return text.includes("hydrated") || runtimeEventType === "TOOL_COMPLETED"
      ? activityCopy("repositoryWorkspaceReady")
      : activityCopy("repositoryWorkspacePreparing");
  }
  if (identity.includes("repository_deep_analysis")) {
    return event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed
      ? activityCopy("repositoryAnalysisFailed")
      : activityCopy("repositoryDeepAnalysis");
  }
  if (identity.includes("langgraph_run")) {
    if (
      event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed ||
      outputText.includes("error")
    ) {
      return activityCopy("repositoryAnalysisFailed");
    }
    if (
      runtimeEventType === "TOOL_COMPLETED" ||
      text.includes("state: running") ||
      outputText.includes("running")
    ) {
      return activityCopy("repositoryAnalysisRunning");
    }
    return activityCopy("repositoryAnalysisQueued");
  }
  if (identity.includes("agent_runtime")) {
    return event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed
      ? activityCopy("scanWorkflowFailed")
      : activityCopy("repositoryScanStarted");
  }
  if (identity.includes("runtime-event")) {
    return activityCopy("runtimeProgressConnected");
  }
  return activityCopy("runtimeProgress");
}

function meaningfulToolActivity(
  toolName: string | null | undefined,
  payload: AssessmentRuntimeSummaryValue | null | undefined,
): string {
  const name = (toolName ?? "").toLowerCase();
  const searchable = `${name} ${formatSemanticValue(payload ?? "")}`.toLowerCase();

  if (/\b(git\s+push|git_push)\b/.test(searchable)) return activityCopy("changesPushed");
  if (/\b(git\s+commit|git_commit)\b/.test(searchable)) return activityCopy("changesCommitted");
  if (/\b(pytest|vitest|jest|test:web|test:e2e|pnpm test|npm test)\b/.test(searchable)) {
    return activityCopy("targetedTestsRan");
  }
  if (/\b(eslint|ruff|lint)\b/.test(searchable)) return activityCopy("codeQualityValidated");
  if (/\b(tsc|typecheck|py_compile|mypy)\b/.test(searchable)) {
    return activityCopy("typeSafetyValidated");
  }
  if (/\b(apply_patch|write_file|edit_file|patch_apply|workspace_file_write)\b/.test(searchable)) {
    return activityCopy("implementationUpdated");
  }
  if (/\b(git\s+diff|git\s+status|git\s+log|git_review)\b/.test(searchable)) {
    return activityCopy("repositoryChangesReviewed");
  }
  if (/\b(grep|rg|search|search_nodes)\b/.test(searchable)) {
    return activityCopy("repositorySourceSearched");
  }
  if (/\b(find|glob|locate)\b/.test(searchable)) return activityCopy("relevantFilesLocated");
  if (/\b(read_file|cat|sed|open_file)\b/.test(searchable)) {
    return activityCopy("sourceFilesReviewed");
  }
  if (name === "ls" || /\b(list_files|list_directory)\b/.test(searchable)) {
    return activityCopy("repositoryFilesInspected");
  }
  return activityCopy("repositoryToolRan");
}

function activityCopy(
  key: keyof ReturnType<typeof streamActivityLabels>,
): string {
  return streamActivityLabels()[key];
}

function streamActivityLabels() {
  return {
    repositoryScanStarted: t("pages.appShell.agentStreamActivities.repositoryScanStarted"),
    repositoryAnalysisStarted: t("pages.appShell.agentStreamActivities.repositoryAnalysisStarted"),
    repositoryAnalysisCompleted: t("pages.appShell.agentStreamActivities.repositoryAnalysisCompleted"),
    repositoryAnalysisFailed: t("pages.appShell.agentStreamActivities.repositoryAnalysisFailed"),
    scanWorkflowStarted: t("pages.appShell.agentStreamActivities.scanWorkflowStarted"),
    scanWorkflowCompleted: t("pages.appShell.agentStreamActivities.scanWorkflowCompleted"),
    scanWorkflowFailed: t("pages.appShell.agentStreamActivities.scanWorkflowFailed"),
    repositoryAnalysisQueued: t("pages.appShell.agentStreamActivities.repositoryAnalysisQueued"),
    repositoryAnalysisRunning: t("pages.appShell.agentStreamActivities.repositoryAnalysisRunning"),
    repositorySourceDownloading: t("pages.appShell.agentStreamActivities.repositorySourceDownloading"),
    repositorySourceDownloaded: t("pages.appShell.agentStreamActivities.repositorySourceDownloaded"),
    repositoryWorkspacePreparing: t("pages.appShell.agentStreamActivities.repositoryWorkspacePreparing"),
    repositoryWorkspaceReady: t("pages.appShell.agentStreamActivities.repositoryWorkspaceReady"),
    repositoryDeepAnalysis: t("pages.appShell.agentStreamActivities.repositoryDeepAnalysis"),
    runtimeProgressConnected: t("pages.appShell.agentStreamActivities.runtimeProgressConnected"),
    runtimeProgress: t("pages.appShell.agentStreamActivities.runtimeProgress"),
    analysisProgressUpdated: t("pages.appShell.agentStreamActivities.analysisProgressUpdated"),
    reasoningReviewed: t("pages.appShell.agentStreamActivities.reasoningReviewed"),
    modelOutputReviewed: t("pages.appShell.agentStreamActivities.modelOutputReviewed"),
    aiAnalysisRunning: t("pages.appShell.agentStreamActivities.aiAnalysisRunning"),
    aiAnalysisCompleted: t("pages.appShell.agentStreamActivities.aiAnalysisCompleted"),
    aiAnalysisFailed: t("pages.appShell.agentStreamActivities.aiAnalysisFailed"),
    providerFallback: t("pages.appShell.agentStreamActivities.providerFallback"),
    credentialRotation: t("pages.appShell.agentStreamActivities.credentialRotation"),
    repositoryEvidenceInspected: t("pages.appShell.agentStreamActivities.repositoryEvidenceInspected"),
    engineeringRuleEvaluated: t("pages.appShell.agentStreamActivities.engineeringRuleEvaluated"),
    analysisSkillApplied: t("pages.appShell.agentStreamActivities.analysisSkillApplied"),
    evidenceProvenanceLinked: t("pages.appShell.agentStreamActivities.evidenceProvenanceLinked"),
    repositoryFilesInspected: t("pages.appShell.agentStreamActivities.repositoryFilesInspected"),
    repositorySourceSearched: t("pages.appShell.agentStreamActivities.repositorySourceSearched"),
    sourceFilesReviewed: t("pages.appShell.agentStreamActivities.sourceFilesReviewed"),
    relevantFilesLocated: t("pages.appShell.agentStreamActivities.relevantFilesLocated"),
    repositoryChangesReviewed: t("pages.appShell.agentStreamActivities.repositoryChangesReviewed"),
    implementationUpdated: t("pages.appShell.agentStreamActivities.implementationUpdated"),
    targetedTestsRan: t("pages.appShell.agentStreamActivities.targetedTestsRan"),
    codeQualityValidated: t("pages.appShell.agentStreamActivities.codeQualityValidated"),
    typeSafetyValidated: t("pages.appShell.agentStreamActivities.typeSafetyValidated"),
    changesCommitted: t("pages.appShell.agentStreamActivities.changesCommitted"),
    changesPushed: t("pages.appShell.agentStreamActivities.changesPushed"),
    repositoryToolRan: t("pages.appShell.agentStreamActivities.repositoryToolRan"),
    subagentSelected: t("pages.appShell.agentStreamActivities.subagentSelected"),
  };
}

function summaryString(
  value: AssessmentRuntimeSummaryValue | undefined,
): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
function row(
  event: AssessmentAgentStreamEvent,
  label: string,
  detail: string | null,
  meta: string | null,
  failed = false,
): ProjectedStreamRow {
  return {
    id: event.eventId,
    runId: event.runId,
    sequence: event.sequence,
    label,
    detail,
    meta,
    failed,
    kind: streamRowKind(event),
    status: streamRowStatus(event, failed),
    input: null,
    output: null,
    technical: technicalEventDetails(event),
  };
}

function streamRowKind(event: AssessmentAgentStreamEvent): StreamRowKind {
  switch (event.eventType) {
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelReasoningDelta:
      return "reasoning";
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout:
      return "model";
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolCallDelta:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolResult:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult:
      return "tool";
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.log:
      return "log";
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.scannerActivity:
      return "progress";
    default:
      return "activity";
  }
}

function streamRowStatus(
  event: AssessmentAgentStreamEvent,
  failed: boolean,
): StreamRowStatus {
  if (
    failed ||
    event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed
  ) {
    return "failed";
  }
  if (
    event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.completed ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted
  ) {
    return "completed";
  }
  if (
    event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.running ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat
  ) {
    return "running";
  }
  return "neutral";
}

function eventMeta(event: AssessmentAgentStreamEvent): string | null {
  const parts = [
    event.namespace.length > 0 ? event.namespace.join(" › ") : null,
    event.nodeName,
    event.status,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}



function modelCallMeta(event: AssessmentAgentStreamEvent): string | null {
  const data = isSummaryRecord(event.data) ? event.data : null;
  const fields =
    data === null
      ? []
      : semanticDisplayFields(data, [
          "provider",
          "model",
          "elapsed_seconds",
          "timeout_seconds",
          "attempt",
          "error_type",
          "error_code",
        ]);
  const meta = eventMeta(event);
  return [meta, ...fields].filter(Boolean).join("\n") || null;
}

type SemanticRecord = Record<string, AssessmentRuntimeSummaryValue>;

function semanticData(
  value: AssessmentRuntimeSummaryValue | null,
): SemanticRecord | null {
  if (!isSummaryRecord(value)) return null;
  if (
    value.schemaVersion !==
      ASSESSMENT_AGENT_STREAM_SCHEMA_VERSIONS.semanticV1 ||
    typeof value.kind !== "string"
  ) {
    return null;
  }
  return value;
}



function semanticMeta(
  event: AssessmentAgentStreamEvent,
  semantic: SemanticRecord,
): string | null {
  const correlation = [
    event.namespace.length > 0 ? event.namespace.join(" › ") : null,
    event.nodeName,
    event.messageId,
    event.toolCallId,
    semantic.durability,
  ].filter((part): part is string => typeof part === "string" && part.length > 0);
  return correlation.length > 0 ? correlation.join(" · ") : eventMeta(event);
}

function isSummaryRecord(
  value: AssessmentRuntimeSummaryValue | null | undefined,
): value is SemanticRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function firstString(
  ...values: Array<AssessmentRuntimeSummaryValue | string | null | undefined>
): string {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "runtime";
}

function semanticDisplayFields(
  semantic: SemanticRecord,
  keys: string[],
): string[] {
  return keys.flatMap((key) => {
    const value = semantic[key];
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value) && value.length === 0) return [];
    return [`${humanizeSemanticKey(key)}: ${formatSemanticValue(value)}`];
  });
}

function formatSemanticValue(value: AssessmentRuntimeSummaryValue): string {
  if (Array.isArray(value)) {
    return value.map((item) => formatSemanticValue(item)).join(", ");
  }
  if (value !== null && typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

function humanizeSemanticKey(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replaceAll("_", " ")
    .trim();
}

function technicalEventDetails(
  event: AssessmentAgentStreamEvent,
): AssessmentRuntimeSummaryValue | null {
  const data = isSummaryRecord(event.data) ? event.data : null;
  const details: Record<string, AssessmentRuntimeSummaryValue> = {
    eventType: event.eventType,
    runtimeEventType:
      typeof data?.runtimeEventType === "string" ? data.runtimeEventType : event.eventType,
    status: event.status,
    source: event.source,
    agentName: event.agentName,
    subagentName: event.subagentName,
    nodeName: event.nodeName,
    toolName: event.toolName,
    provider: typeof data?.provider === "string" ? data.provider : null,
    model: typeof data?.model === "string" ? data.model : null,
    runId: event.runId,
    correlationId: event.correlationId,
    messageId: event.messageId,
    callId: event.toolCallId,
    namespace: event.namespace.length > 0 ? event.namespace : null,
    emittedAt: event.emittedAt,
    text: event.text,
    payload: cleanedStreamValue(event.data),
  };
  const cleaned = Object.fromEntries(
    Object.entries(details).filter(([, value]) => value !== null && value !== ""),
  );
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

function appendTechnicalDetails(
  current: AssessmentRuntimeSummaryValue | null,
  next: AssessmentRuntimeSummaryValue | null,
): AssessmentRuntimeSummaryValue | null {
  if (next === null) return current;
  if (current === null) return next;
  return Array.isArray(current) ? [...current, next] : [current, next];
}

function StreamTechnicalDetails({
  row,
  labels,
}: {
  row: ProjectedStreamRow;
  labels: ReturnType<typeof streamLabels>;
}) {
  const technical = cleanedStreamValue(row.technical);
  const hasToolPayload = row.input !== null || row.output !== null;
  if (technical === null && row.meta === null && !hasToolPayload) return null;

  return (
    <div data-stream-technical-details className="mt-2 space-y-2 border-t border-border/40 pt-2">
      <div className="text-[11px] font-medium text-muted-foreground">
        {labels.technicalDetails}
      </div>
      {row.meta ? (
        <div className="whitespace-pre-wrap break-words wrap-anywhere font-mono text-[11px] leading-4 text-muted-foreground">
          {row.meta}
        </div>
      ) : null}
      {technical !== null ? (
        <pre className="max-h-72 overflow-auto rounded-lg border border-border/50 bg-background/60 px-2.5 py-2 text-[11px] leading-4 whitespace-pre-wrap break-words text-foreground/85">
          {formatStreamValue(technical)}
        </pre>
      ) : null}
      {row.input !== null ? (
        <StreamPayloadBlock label={labels.toolCall} value={row.input} />
      ) : null}
      {row.output !== null ? (
        <StreamPayloadBlock label={labels.toolOutput} value={row.output} />
      ) : null}
    </div>
  );
}

function StreamPayloadBlock({
  label,
  value,
}: {
  label: string;
  value: AssessmentRuntimeSummaryValue;
}) {
  const cleaned = cleanedStreamValue(value);
  if (cleaned === null) return null;
  return (
    <div className="overflow-hidden rounded-lg border border-border/50 bg-background/60">
      <div className="px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground">
        {label}
      </div>
      <pre className="max-h-72 overflow-auto border-t border-border/40 px-2.5 py-2 text-[11px] leading-4 whitespace-pre-wrap break-words text-foreground/85">
        {formatStreamValue(cleaned)}
      </pre>
    </div>
  );
}
function StreamRowView({
  row,
  labels,
}: {
  row: ProjectedStreamRow;
  labels: ReturnType<typeof streamLabels>;
}) {
  const statusLabel =
    row.status === "running"
      ? labels.running
      : row.status === "completed"
        ? labels.completed
        : row.status === "failed"
          ? labels.failed
          : null;

  return (
    <div
      data-stream-sequence={row.sequence}
      data-stream-kind={row.kind}
      data-stream-status={row.status}
      className="relative min-w-0 pl-6"
    >
      <span
        aria-hidden="true"
        className={cn(
          "absolute left-0 top-[9px] z-10 flex size-[15px] items-center justify-center rounded-full bg-background text-muted-foreground",
          row.status === "failed" && "text-destructive",
          row.status === "completed" && "text-emerald-500",
        )}
      >
        <StreamStatusIcon row={row} />
      </span>
      <details
        data-stream-activity
        className={cn(
          "group/activity min-w-0 rounded-xl px-2.5 py-2 text-xs transition-colors duration-200 open:bg-muted/10",
          row.kind === "tool" && "border border-border/60 bg-muted/20",
          row.kind === "reasoning" && "bg-muted/10",
          row.failed && "border border-destructive/30 bg-destructive/5",
        )}
      >
        <summary className="flex cursor-pointer list-none items-center gap-2 select-none">
          <StreamKindIcon kind={row.kind} />
          <span
            className={cn(
              "min-w-0 flex-1 truncate font-medium text-foreground",
              row.failed && "text-destructive",
            )}
          >
            {row.label}
          </span>
          {statusLabel ? (
            <span
              className={cn(
                "shrink-0 text-[11px] text-muted-foreground",
                row.status === "running" && "animate-pulse",
                row.status === "failed" && "text-destructive",
              )}
            >
              {statusLabel}
            </span>
          ) : null}
          <ChevronDown className="size-3 shrink-0 text-muted-foreground transition-transform duration-200 group-open/activity:rotate-180" />
        </summary>

        {row.detail ? (
          <div className="mt-2 whitespace-pre-wrap break-words wrap-anywhere text-xs leading-5 text-foreground/90">
            {row.detail}
          </div>
        ) : null}

        <StreamTechnicalDetails row={row} labels={labels} />
      </details>
    </div>
  );
}
function StreamStatusIcon({ row }: { row: ProjectedStreamRow }) {
  if (row.status === "running") {
    return <LoaderCircle className="size-3.5 animate-spin" />;
  }
  if (row.status === "completed") {
    return <CheckCircle2 className="size-3.5" />;
  }
  if (row.status === "failed") {
    return <XCircle className="size-3.5" />;
  }
  return <Circle className="size-2.5 fill-current" />;
}

function StreamKindIcon({ kind }: { kind: StreamRowKind }) {
  if (kind === "tool") {
    return <Wrench aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (kind === "reasoning") {
    return <Brain aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  if (kind === "log") {
    return <Terminal aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />;
  }
  return null;
}


function formatStreamValue(value: AssessmentRuntimeSummaryValue): string {
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
}

function cleanedStreamValue(
  value: AssessmentRuntimeSummaryValue | undefined | null,
): AssessmentRuntimeSummaryValue | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    return value === "[HIDDEN_PRIVATE_RUNTIME_STATE]" ? null : value;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => cleanedStreamValue(item))
      .filter(
        (item): item is AssessmentRuntimeSummaryValue => item !== null,
      );
    return cleaned.length > 0 ? cleaned : null;
  }
  if (typeof value === "object") {
    if (
      value.hidden === "private_runtime_state" ||
      value.hidden === "[HIDDEN_PRIVATE_RUNTIME_STATE]"
    ) {
      return null;
    }
    const entries = Object.entries(value).flatMap(([key, nested]) => {
      const cleaned = cleanedStreamValue(nested);
      return cleaned === null ? [] : ([[key, cleaned]] as const);
    });
    return entries.length > 0 ? Object.fromEntries(entries) : null;
  }
  return value;
}

function shouldSuppressEvent(
  event: AssessmentAgentStreamEvent,
  semanticToolIds: Set<string>,
  semanticModelOutputIds: Set<string>,
  semanticReasoningIds: Set<string>,
  recoveredProviderFailures: Map<string, number>,
): boolean {
  const identity = [
    event.nodeName,
    event.toolName,
    event.source,
    event.text,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (identity.includes("piimiddleware[")) return true;
  if (
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphUpdate ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphState
  ) {
    return true;
  }
  const recoveredProviderKey = modelCallProgressKey(event);
  if (
    recoveredProviderKey &&
    event.sequence < (recoveredProviderFailures.get(recoveredProviderKey) ?? -1)
  ) {
    return true;
  }
  if (
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolCallDelta
  ) {
    return true;
  }
  if (
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolResult &&
    semanticToolIds.has(toolIdentityKey(event, null) ?? "")
  ) {
    return true;
  }
  if (
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelContentDelta &&
    event.messageId !== null &&
    semanticModelOutputIds.has(event.messageId)
  ) {
    return true;
  }
  if (
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelReasoningDelta &&
    event.messageId !== null &&
    semanticReasoningIds.has(event.messageId)
  ) {
    return true;
  }
  if (cleanedStreamValue(event.data) !== null || event.text) {
    return false;
  }
  return !(
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted ||
    event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed
  );
}

function recoveredProviderFailureCutoffs(
  events: AssessmentAgentStreamEvent[],
): Map<string, number> {
  const cutoffs = new Map<string, number>();
  const failedModelCalls = events.filter(
    (event) =>
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed ||
      event.eventType === ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout,
  );
  for (const fallback of events) {
    if (fallback.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback) {
      continue;
    }
    const data = isSummaryRecord(fallback.data) ? fallback.data : null;
    const provider =
      typeof data?.current_provider === "string"
        ? data.current_provider.trim().toLowerCase()
        : "";
    if (!provider) continue;
    for (const failed of failedModelCalls) {
      if (failed.runId !== fallback.runId || failed.sequence >= fallback.sequence) {
        continue;
      }
      const failedData = isSummaryRecord(failed.data) ? failed.data : null;
      if (
        typeof failedData?.provider !== "string" ||
        failedData.provider.trim().toLowerCase() !== provider
      ) {
        continue;
      }
      const key = modelCallProgressKey(failed);
      if (!key) continue;
      const existing = cutoffs.get(key);
      if (existing === undefined || fallback.sequence < existing) {
        cutoffs.set(key, fallback.sequence);
      }
    }
  }
  return cutoffs;
}

function toolIdentityKey(
  event: AssessmentAgentStreamEvent,
  semantic: SemanticRecord | null,
): string | null {
  const toolCallId =
    (typeof semantic?.toolCallId === "string" ? semantic.toolCallId : null) ??
    event.toolCallId;
  if (toolCallId) return `${event.runId}:${toolCallId}`;
  if (event.messageId && (event.toolName || semantic?.toolName)) {
    return `${event.runId}:${event.messageId}:${String(
      semantic?.toolName ?? event.toolName,
    )}`;
  }
  return null;
}

function lifecycleEventProgressKey(
  event: AssessmentAgentStreamEvent,
): string | null {
  const namespace = event.namespace.join("/");
  switch (event.eventType) {
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed:
      return [
        "agent",
        event.runId,
        event.agentName ?? event.subagentName ?? "agent",
        namespace,
      ].join(":");
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed:
      return [
        "boundary",
        event.runId,
        event.source ?? event.agentName ?? "boundary",
        namespace,
      ].join(":");
    default:
      return null;
  }
}

function runtimeEventType(event: AssessmentAgentStreamEvent): string | null {
  if (event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent) {
    return null;
  }
  const data = isSummaryRecord(event.data) ? event.data : null;
  return typeof data?.runtimeEventType === "string"
    ? data.runtimeEventType.toUpperCase()
    : null;
}

function runtimeEventStatus(event: AssessmentAgentStreamEvent): StreamRowStatus {
  const type = runtimeEventType(event);
  if (type === "RUN_FAILED" || type === "TOOL_FAILED") return "failed";
  if (
    type === "RUN_COMPLETED" ||
    type === "TOOL_COMPLETED"
  ) {
    return "completed";
  }
  if (type === "RUN_STARTED" || type === "TOOL_STARTED") return "running";
  return streamRowStatus(
    event,
    event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
  );
}

function runtimeEventProgressKey(
  event: AssessmentAgentStreamEvent,
): string | null {
  const type = runtimeEventType(event);
  if (
    type !== "RUN_STARTED" &&
    type !== "RUN_COMPLETED" &&
    type !== "RUN_FAILED" &&
    type !== "TOOL_STARTED" &&
    type !== "TOOL_COMPLETED" &&
    type !== "TOOL_FAILED"
  ) {
    return null;
  }
  const data = isSummaryRecord(event.data) ? event.data : null;
  const stage = typeof data?.stage === "string" ? data.stage : "";
  return [
    event.runId,
    event.toolName ?? event.source ?? event.nodeName ?? "runtime",
    stage,
  ].join(":");
}

function modelCallProgressKey(event: AssessmentAgentStreamEvent): string | null {
  if (
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed &&
    event.eventType !== ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout
  ) {
    return null;
  }
  const data = isSummaryRecord(event.data) ? event.data : null;
  return [
    event.runId,
    event.agentName ?? "",
    event.nodeName ?? "",
    typeof data?.provider === "string" ? data.provider : "",
    typeof data?.model === "string" ? data.model : "",
  ].join(":");
}

function reasoningSummaryText(semantic: SemanticRecord): string | null {
  const result = semantic.resultSummary;
  if (typeof result === "string") return result;
  if (isSummaryRecord(result)) {
    return firstString(result.summary, result.text, null);
  }
  return null;
}

function streamEndedWithFailure(events: AssessmentAgentStreamEvent[]): boolean {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  const latestRunId = ordered.at(-1)?.runId;
  if (!latestRunId) return false;
  return terminalOutcomesByRun(ordered).get(latestRunId) === "failed";
}


function streamDuration(events: AssessmentAgentStreamEvent[]): string | null {
  const timestamps = events
    .map((event) => Date.parse(event.emittedAt))
    .filter((value) => Number.isFinite(value));
  if (timestamps.length < 2) return null;
  const elapsedSeconds = Math.max(
    0,
    Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000),
  );
  if (elapsedSeconds < 1) return null;
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function streamLabels() {
  return {
    subagent: t("pages.appShell.agentStreamLabels.subagent"),
    agent: t("pages.appShell.agentStreamLabels.agent"),
    flow: t("pages.appShell.agentStreamLabels.flow"),
    reasoning: t("pages.appShell.agentStreamLabels.reasoning"),
    output: t("pages.appShell.agentStreamLabels.output"),
    toolCall: t("pages.appShell.agentStreamLabels.toolCall"),
    toolOutput: t("pages.appShell.agentStreamLabels.toolOutput"),
    log: t("pages.appShell.agentStreamLabels.log"),
    runtime: t("pages.appShell.agentStreamLabels.runtime"),
    progress: t("pages.appShell.agentStreamLabels.progress"),
    update: t("pages.appShell.agentStreamLabels.update"),
    state: t("pages.appShell.agentStreamLabels.state"),
    provider: t("pages.appShell.agentStreamLabels.provider"),
    credential: t("pages.appShell.agentStreamLabels.credential"),
    scanner: t("pages.appShell.agentStreamLabels.scanner"),
    engineeringRule: t("pages.appShell.agentStreamLabels.engineeringRule"),
    skill: t("pages.appShell.agentStreamLabels.skill"),
    model: t("pages.appShell.agentStreamLabels.model"),
    provenance: t("pages.appShell.agentStreamLabels.provenance"),
    selected: t("pages.appShell.agentStreamSelected"),
    loadOlder: t("pages.appShell.agentStreamLoadOlder"),
    loadingOlder: t("pages.appShell.agentStreamLoadingOlder"),
    retryHistory: t("pages.appShell.agentStreamRetryHistory"),
    historyLoadFailed: t("pages.appShell.agentStreamHistoryLoadFailed"),
    running: t("pages.appShell.chatActivityStatuses.running"),
    completed: t("pages.appShell.chatActivityStatuses.completed"),
    failed: t("pages.appShell.chatActivityStatuses.failed"),
    thinking: t("pages.appShell.chatThinking"),
    technicalDetails: t("pages.appShell.agentStreamTechnicalDetails"),
  };
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
