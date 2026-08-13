"use client";

import { resolveMessage } from "@lcsp/i18n";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { appLocale } from "@/lib/locale";
import {
  WORKSPACE_RUNTIME_CONNECTION_STATES,
  type WorkspaceRuntimeAssessmentTimeline,
  type WorkspaceRuntimeConnectionState,
} from "../../types/workspace-runtime.types";

export function AssessmentRuntimeSidebarPanel({
  assessmentId,
  timeline,
}: {
  assessmentId: string;
  timeline: WorkspaceRuntimeAssessmentTimeline;
}) {
  const [isHydrated, setIsHydrated] = useState(false);
  const hasActivity =
    timeline.currentRun !== null || timeline.recentActivity.length > 0;

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  return (
    <div className="mt-3 rounded-lg border border-sidebar-border/70 bg-sidebar-accent/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {t("pages.appShell.runtimePanelTitle")}
          </p>
          <p className="mt-1 text-xs text-sidebar-foreground/65">
            {timeline.lastEmittedAt === null
              ? t("pages.appShell.runtimePanelAwaiting")
              : `${t("pages.appShell.runtimePanelLastUpdated")}: ${formatTimelineTime(
                  timeline.lastEmittedAt,
                  isHydrated,
                )}`}
          </p>
        </div>
        <Badge variant={connectionBadgeVariant(timeline.connectionState)}>
          {connectionLabel(timeline.connectionState)}
        </Badge>
      </div>

      {timeline.currentRun ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant={statusBadgeVariant(timeline.currentRun.status)}>
              {runStatusLabel(timeline.currentRun.status)}
            </Badge>
            <span className="truncate text-xs text-sidebar-foreground/80">
              {stageLabel(timeline.currentRun.stage)}
            </span>
          </div>

          {timeline.currentRun.activeTools.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium tracking-wide text-sidebar-foreground/70 uppercase">
                {t("pages.appShell.runtimePanelActiveTools")}
              </p>
              <ul className="space-y-2">
                {timeline.currentRun.activeTools.map((tool) => (
                  <li
                    className="rounded-md border border-sidebar-border/50 px-2 py-2"
                    key={`${timeline.currentRun?.runId}-${tool.toolName}`}
                  >
                    <p className="truncate text-xs font-medium">{tool.toolName}</p>
                    <p className="mt-1 text-[11px] text-sidebar-foreground/70">
                      {tool.summary}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {timeline.recentActivity.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-sidebar-foreground/70 uppercase">
            {t("pages.appShell.runtimePanelRecentActivity")}
          </p>
          <ul className="space-y-2">
            {timeline.recentActivity.slice(0, 6).map((item) => (
              <li
                className="rounded-md border border-sidebar-border/50 px-2 py-2"
                key={item.eventId}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-medium">
                    {item.toolName ?? runtimeEventLabel(item.eventType)}
                  </span>
                  <Badge variant={statusBadgeVariant(item.runStatus)}>
                    {runStatusLabel(item.runStatus)}
                  </Badge>
                </div>
                <p className="mt-1 text-[11px] text-sidebar-foreground/70">
                  {item.summary}
                </p>
                <p className="mt-1 text-[10px] text-sidebar-foreground/55">
                  {formatTimelineTime(item.emittedAt, isHydrated)}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {!hasActivity ? (
        <p className="mt-3 text-xs text-sidebar-foreground/65">
          {t("pages.appShell.runtimePanelEmpty")}
        </p>
      ) : null}

      <div className="mt-3">
        <Link
          className="text-xs font-medium text-sidebar-primary underline-offset-4 hover:underline"
          href={`/assessments/${assessmentId}/technical-evidence`}
        >
          {t("pages.appShell.runtimePanelViewFull")}
        </Link>
      </div>
    </div>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}

function connectionBadgeVariant(state: WorkspaceRuntimeConnectionState) {
  return state === WORKSPACE_RUNTIME_CONNECTION_STATES.connected
    ? "default"
    : "secondary";
}

function connectionLabel(state: WorkspaceRuntimeConnectionState) {
  if (state === WORKSPACE_RUNTIME_CONNECTION_STATES.connected) {
    return t("pages.appShell.runtimePanelConnection.connected");
  }
  if (state === WORKSPACE_RUNTIME_CONNECTION_STATES.disconnected) {
    return t("pages.appShell.runtimePanelConnection.disconnected");
  }
  return t("pages.appShell.runtimePanelConnection.connecting");
}

function statusBadgeVariant(status: string) {
  if (status === "FAILED") return "destructive";
  if (status === "COMPLETED") return "default";
  return "secondary";
}

function runStatusLabel(status: string) {
  switch (status) {
    case "RUNNING":
      return t("pages.appShell.runtimePanelStatuses.running");
    case "WAITING":
      return t("pages.appShell.runtimePanelStatuses.waiting");
    case "COMPLETED":
      return t("pages.appShell.runtimePanelStatuses.completed");
    case "FAILED":
      return t("pages.appShell.runtimePanelStatuses.failed");
    default:
      return status;
  }
}

function stageLabel(stage: string) {
  switch (stage) {
    case "SNAPSHOT":
      return t("pages.appShell.runtimePanelStages.snapshot");
    case "SCAN":
      return t("pages.appShell.runtimePanelStages.scan");
    case "TECHNICAL_EVIDENCE":
      return t("pages.appShell.runtimePanelStages.technicalEvidence");
    case "TECHNICAL_PROFILE":
      return t("pages.appShell.runtimePanelStages.technicalProfile");
    case "AI_USAGE_FLOW":
      return t("pages.appShell.runtimePanelStages.aiUsageFlow");
    case "RECONCILIATION":
      return t("pages.appShell.runtimePanelStages.reconciliation");
    case "CLASSIFICATION":
      return t("pages.appShell.runtimePanelStages.classification");
    case "CONFLICTS":
      return t("pages.appShell.runtimePanelStages.conflicts");
    case "DOCUMENTS":
      return t("pages.appShell.runtimePanelStages.documents");
    case "LEGAL_RETRIEVAL":
      return t("pages.appShell.runtimePanelStages.legalRetrieval");
    default:
      return stage;
  }
}

function runtimeEventLabel(eventType: string) {
  switch (eventType) {
    case "RUN_STARTED":
      return t("pages.appShell.runtimePanelEvents.runStarted");
    case "RUN_STAGE_CHANGED":
      return t("pages.appShell.runtimePanelEvents.runStageChanged");
    case "TOOL_STARTED":
      return t("pages.appShell.runtimePanelEvents.toolStarted");
    case "TOOL_COMPLETED":
      return t("pages.appShell.runtimePanelEvents.toolCompleted");
    case "TOOL_FAILED":
      return t("pages.appShell.runtimePanelEvents.toolFailed");
    case "TOOL_WAITING_INPUT":
      return t("pages.appShell.runtimePanelEvents.toolWaitingInput");
    case "TOOL_SKIPPED":
      return t("pages.appShell.runtimePanelEvents.toolSkipped");
    case "RUN_COMPLETED":
      return t("pages.appShell.runtimePanelEvents.runCompleted");
    case "RUN_FAILED":
      return t("pages.appShell.runtimePanelEvents.runFailed");
    default:
      return eventType;
  }
}

function formatTimelineTime(value: string, isHydrated: boolean) {
  if (!isHydrated) {
    return formatStableTimestamp(value);
  }
  return formatRelativeTime(value);
}

function formatStableTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toISOString();
}

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  const deltaSeconds = Math.max(
    0,
    Math.round((Date.now() - timestamp) / 1000),
  );
  if (deltaSeconds < 60) {
    return `${deltaSeconds}s`;
  }
  const deltaMinutes = Math.round(deltaSeconds / 60);
  if (deltaMinutes < 60) {
    return `${deltaMinutes}m`;
  }
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h`;
  }
  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d`;
}
