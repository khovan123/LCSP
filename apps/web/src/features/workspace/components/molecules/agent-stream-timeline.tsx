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
  sequence: number;
  label: string;
  detail: string | null;
  meta: string | null;
  failed: boolean;
  kind: StreamRowKind;
  status: StreamRowStatus;
  input: AssessmentRuntimeSummaryValue | null;
  output: AssessmentRuntimeSummaryValue | null;
};

export function AgentStreamTimeline({
  events,
  history,
  onLoadOlder,
  className,
}: AgentStreamTimelineProps) {
  const rows = projectStreamRows(events);
  const labels = streamLabels();
  const hasRunningActivity = rows.some((row) => row.status === "running");
  const duration = streamDuration(events);
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
            ) : (
              <CheckCircle2 className="size-3.5 text-emerald-500" />
            )}
            <span>
              {hasRunningActivity ? labels.thinking : labels.completed}
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

function projectStreamRows(
  events: AssessmentAgentStreamEvent[],
): ProjectedStreamRow[] {
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  const rows: ProjectedStreamRow[] = [];
  const toolRows = new Map<string, ProjectedStreamRow>();
  const modelProgressRows = new Map<string, ProjectedStreamRow>();
  const semanticToolIds = new Set<string>();
  const semanticModelOutputIds = new Set<string>();
  const semanticReasoningIds = new Set<string>();

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
      projected.label = semanticName(
        event,
        semantic,
        event.toolName ?? "tool",
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
      projected.label = streamLabels().reasoning;
      projected.detail =
        reasoningSummaryText(semantic) ??
        event.text ??
        streamLabels().running;
      projected.meta = semanticMeta(event, semantic);
      rows.push(projected);
      previousMergeKey = null;
      continue;
    }

    const modelProgressKey = modelCallProgressKey(event);
    if (modelProgressKey) {
      const existing = modelProgressRows.get(modelProgressKey);
      if (existing) {
        const updated = toStreamRow(event);
        existing.sequence = event.sequence;
        existing.detail = updated.detail;
        existing.meta = updated.meta;
        existing.failed = updated.failed;
        existing.status = updated.status;
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
      continue;
    }
    rows.push(toStreamRow(event));
    previousMergeKey = mergeKey;
  }

  return rows;
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
  const name =
    event.subagentName ??
    event.agentName ??
    event.toolName ??
    event.nodeName ??
    event.source ??
    "runtime";
  const labels = streamLabels();
  const semantic = semanticData(event.data);
  if (semantic) {
    return row(
      event,
      `${semanticLabel(semantic, labels)} · ${semanticName(event, semantic, name)}`,
      semanticDetail(semantic) ?? event.text,
      semanticMeta(event, semantic),
      event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed ||
        semantic.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
    );
  }

  switch (event.eventType) {
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.subagentSelected:
      return row(event, `${labels.subagent} · ${name}`, labels.selected, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentStarted:
      return row(event, `${labels.agent} · ${name}`, labels.running, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentCompleted:
      return row(event, `${labels.agent} · ${name}`, labels.completed, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.agentFailed:
      return row(event, `${labels.agent} · ${name}`, event.text ?? labels.failed, eventMeta(event), true);
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryStarted:
      return row(event, `${labels.flow} · ${name}`, labels.running, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryCompleted:
      return row(event, `${labels.flow} · ${name}`, labels.completed, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.boundaryFailed:
      return row(event, `${labels.flow} · ${name}`, event.text ?? labels.failed, eventData(event), true);
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelReasoningDelta:
      return row(event, `${labels.reasoning} · ${name}`, event.text, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelContentDelta:
      return row(event, `${labels.output} · ${name}`, event.text, eventMeta(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolCallDelta:
      return row(
        event,
        `${labels.toolCall} · ${event.toolName ?? name}`,
        event.text,
        eventMeta(event),
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.toolResult:
      return row(
        event,
        `${labels.toolOutput} · ${event.toolName ?? name}`,
        event.text,
        eventMeta(event),
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.log:
      return row(event, `${labels.log} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.runtimeEvent:
      return row(
        event,
        `${labels.runtime} · ${event.toolName ?? name}`,
        event.text,
        eventData(event),
        event.status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed,
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.customProgress:
      return row(event, `${labels.progress} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphUpdate:
      return row(event, `${labels.update} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.graphState:
      return row(event, `${labels.state} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.providerFallback:
      return row(event, `${labels.provider} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.credentialRotation:
      return row(event, `${labels.credential} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.scannerActivity:
      return row(event, `${labels.scanner} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.engineeringRule:
      return row(event, `${labels.engineeringRule} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.skillUsage:
      return row(event, `${labels.skill} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.ruleProvenance:
      return row(event, `${labels.provenance} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelRequest:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelResult:
      return row(event, `${labels.model} · ${name}`, event.text, eventData(event));
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallStarted:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallHeartbeat:
      return row(
        event,
        `${labels.model} · ${modelCallName(event, name)}`,
        event.text ?? labels.running,
        modelCallMeta(event),
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallCompleted:
      return row(
        event,
        `${labels.model} · ${modelCallName(event, name)}`,
        event.text ?? labels.completed,
        modelCallMeta(event),
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallFailed:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.modelCallTimeout:
      return row(
        event,
        `${labels.model} · ${modelCallName(event, name)}`,
        event.text ?? labels.failed,
        modelCallMeta(event),
        true,
      );
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolCall:
    case ASSESSMENT_AGENT_STREAM_EVENT_TYPES.semanticToolResult:
      return row(event, `${labels.toolCall} · ${event.toolName ?? name}`, event.text, eventData(event));
    default:
      return row(event, event.eventType, event.text, eventData(event));
  }
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
    sequence: event.sequence,
    label,
    detail,
    meta,
    failed,
    kind: streamRowKind(event),
    status: streamRowStatus(event, failed),
    input: null,
    output: null,
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

function eventData(event: AssessmentAgentStreamEvent): string | null {
  if (event.data === null) return eventMeta(event);
  const serialized = JSON.stringify(event.data);
  const meta = eventMeta(event);
  return [meta, serialized].filter(Boolean).join(" · ") || null;
}

function modelCallName(
  event: AssessmentAgentStreamEvent,
  fallback: string,
): string {
  const data = isSummaryRecord(event.data) ? event.data : null;
  return firstString(data?.model, event.nodeName, fallback);
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

function semanticLabel(
  semantic: SemanticRecord,
  labels: ReturnType<typeof streamLabels>,
): string {
  switch (semantic.kind) {
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerFile:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerSymbol:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerDependency:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.scannerTraceStep:
      return labels.scanner;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.engineeringRule:
      return labels.engineeringRule;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.skillUsage:
      return labels.skill;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.ruleProvenance:
      return labels.provenance;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelRequest:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.modelOutput:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.decisionModel:
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.reasoningSummary:
      return labels.model;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolCall:
      return labels.toolCall;
    case ASSESSMENT_AGENT_STREAM_SEMANTIC_KINDS.toolResult:
      return labels.toolOutput;
    default:
      return labels.runtime;
  }
}

function semanticName(
  event: AssessmentAgentStreamEvent,
  semantic: SemanticRecord,
  fallback: string,
): string {
  return firstString(
    semantic.toolName,
    semantic.skillName,
    semantic.engineeringRuleId,
    semantic.dependencyName,
    semantic.functionName,
    semantic.filePath,
    semantic.model,
    event.toolName,
    event.nodeName,
    fallback,
  );
}

function semanticDetail(semantic: SemanticRecord): string | null {
  const refs = [
    semantic.filePath,
    semantic.functionName,
    semantic.symbolRef,
    semantic.dependencyName,
    semantic.traceId,
    semantic.edgeType,
    semantic.fromRef,
    semantic.toRef,
    semantic.concept,
    semantic.decision,
    semantic.reasonCode,
    semantic.evaluationStatus,
    semantic.provider,
    semantic.model,
    semantic.decisionType,
    semantic.shadowProposedAction,
    semantic.authoritativeAction,
    semantic.fallbackReason,
    semantic.goalSummary,
    semantic.status,
  ].filter((value): value is string => typeof value === "string" && value.length > 0);
  const structured = semanticDisplayFields(semantic, [
    "parameters",
    "resultSummary",
    "availableToolNames",
    "inputArtifactRefs",
    "outputRefs",
    "usage",
    "confidence",
    "agreement",
    "decisionMode",
    "policyVersion",
    "thresholdUsed",
    "latencyMs",
    "finishReason",
    "skillVersionOrHash",
    "promptVersion",
  ]);
  const detail = [...refs, ...structured];
  return detail.length > 0 ? detail.join("\n") : null;
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
      <div
        className={cn(
          "min-w-0 rounded-xl px-2.5 py-2 text-xs transition-colors duration-200",
          row.kind === "tool" && "border border-border/60 bg-muted/20",
          row.kind === "reasoning" && "bg-muted/10",
          row.failed && "border-destructive/30 bg-destructive/5",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <StreamKindIcon kind={row.kind} />
          <span
            className={cn(
              "min-w-0 truncate font-medium text-foreground",
              row.failed && "text-destructive",
            )}
          >
            {row.label}
          </span>
          {statusLabel ? (
            <span
              className={cn(
                "ml-auto shrink-0 text-[11px] text-muted-foreground",
                row.status === "running" && "animate-pulse",
                row.status === "failed" && "text-destructive",
              )}
            >
              {statusLabel}
            </span>
          ) : null}
        </div>

        {row.kind === "reasoning" && row.detail ? (
          <details className="group mt-1.5">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 text-[11px] text-muted-foreground select-none">
              <ChevronDown className="size-3 transition-transform duration-200 group-open:rotate-180" />
              {labels.reasoning}
            </summary>
            <div className="mt-1.5 whitespace-pre-wrap break-words wrap-anywhere text-xs leading-5 text-foreground/90">
              {row.detail}
            </div>
          </details>
        ) : row.detail ? (
          <div className="mt-1 whitespace-pre-wrap break-words wrap-anywhere text-xs leading-5 text-foreground/90">
            {row.detail}
          </div>
        ) : null}

        {row.kind === "tool" ? (
          <div className="mt-2 space-y-1.5">
            <StreamPayloadDisclosure
              label={labels.toolCall}
              value={row.input}
              defaultOpen={row.status === "running"}
            />
            <StreamPayloadDisclosure
              label={labels.toolOutput}
              value={row.output}
            />
          </div>
        ) : null}

        {row.meta ? (
          <div className="mt-1.5 whitespace-pre-wrap break-words wrap-anywhere text-[11px] leading-4 text-muted-foreground">
            {row.meta}
          </div>
        ) : null}
      </div>
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

function StreamPayloadDisclosure({
  label,
  value,
  defaultOpen = false,
}: {
  label: string;
  value: AssessmentRuntimeSummaryValue | null;
  defaultOpen?: boolean;
}) {
  const cleaned = cleanedStreamValue(value);
  if (cleaned === null) return null;
  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-lg border border-border/50 bg-background/60"
    >
      <summary className="flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground select-none">
        <ChevronDown className="size-3 transition-transform duration-200 group-open:rotate-180" />
        {label}
      </summary>
      <pre className="max-h-72 overflow-auto border-t border-border/40 px-2.5 py-2 text-[11px] leading-4 whitespace-pre-wrap break-words text-foreground/85">
        {formatStreamValue(cleaned)}
      </pre>
    </details>
  );
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
  return cleanedStreamValue(event.data) === null && !event.text;
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
  };
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
