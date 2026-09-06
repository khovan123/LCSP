import * as React from "react";
import { resolveMessage } from "@lcsp/i18n";
import { RouteIcon } from "lucide-react";

import type { ArtifactRef } from "@/features/artifacts/types/artifact.types";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

import {
  INVESTIGATION_TRACE_STATUSES,
  type InvestigationTraceStatus,
  type InvestigationTraceStep,
} from "../../types/structured-results.types";
import { ChatResultContainer } from "./chat-result-container";

export type InvestigationTraceProps = {
  status?: InvestigationTraceStatus;
  steps?: InvestigationTraceStep[];
  evidenceClaimCount?: number | null;
  summary?: string | null;
  artifactRef?: ArtifactRef | null;
  onOpenArtifact?: (ref: ArtifactRef) => void;
  className?: string;
};

const statusConfig: Record<
  InvestigationTraceStatus,
  { dotClassName: string; textClassName: string; labelKey: string }
> = {
  [INVESTIGATION_TRACE_STATUSES.inProgress]: {
    dotClassName: "bg-sky-400 dark:bg-sky-400",
    textClassName: "text-sky-500 dark:text-sky-400",
    labelKey: "pages.structuredResults.investigationTrace.inProgress",
  },
  [INVESTIGATION_TRACE_STATUSES.completed]: {
    dotClassName: "bg-emerald-400 dark:bg-emerald-400",
    textClassName: "text-emerald-500 dark:text-emerald-400",
    labelKey: "pages.structuredResults.investigationTrace.completed",
  },
  [INVESTIGATION_TRACE_STATUSES.failed]: {
    dotClassName: "bg-destructive",
    textClassName: "text-destructive",
    labelKey: "pages.structuredResults.investigationTrace.failed",
  },
  [INVESTIGATION_TRACE_STATUSES.paused]: {
    dotClassName: "bg-amber-400 dark:bg-amber-400",
    textClassName: "text-amber-500 dark:text-amber-400",
    labelKey: "pages.structuredResults.investigationTrace.paused",
  },
};

export function InvestigationTrace({
  status = INVESTIGATION_TRACE_STATUSES.inProgress,
  steps = [],
  evidenceClaimCount,
  summary,
  className,
}: InvestigationTraceProps) {
  const currentStatusConfig = statusConfig[status] ?? statusConfig[INVESTIGATION_TRACE_STATUSES.inProgress];

  const hasClaims =
    typeof evidenceClaimCount === "number" &&
    Number.isFinite(evidenceClaimCount) &&
    evidenceClaimCount >= 0;

  const claimsText = hasClaims
    ? t("pages.structuredResults.investigationTrace.claimsCollected").replace(
        "{count}",
        String(evidenceClaimCount),
      )
    : null;

  return (
    <ChatResultContainer
      className={cn("p-3.5", className)}
      header={
        <header className="flex min-w-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded-md border border-border/70 bg-muted/60 text-foreground"
            >
              <RouteIcon className="size-3.5" />
            </span>
            <h3 className="truncate text-[13px] font-semibold text-foreground">
              {t("pages.structuredResults.investigationTrace.title")}
            </h3>
          </div>
          <div
            data-slot="investigation-status"
            className={cn(
              "flex shrink-0 items-center gap-1.5 text-[11px] font-normal",
              currentStatusConfig.textClassName,
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                currentStatusConfig.dotClassName,
              )}
            />
            <span>{t(currentStatusConfig.labelKey)}</span>
          </div>
        </header>
      }
      footer={
        hasClaims || summary ? (
          <footer className="flex min-w-0 flex-wrap items-center justify-between gap-2 text-[10px] text-muted-foreground">
            <span className="min-w-0 truncate">
              {claimsText ?? summary}
            </span>
            <span className="shrink-0 text-muted-foreground/80">
              {t("pages.structuredResults.investigationTrace.linkedToTracedPath")}
            </span>
          </footer>
        ) : null
      }
    >
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">
          {t("pages.structuredResults.investigationTrace.currentPath")}
        </p>

        {steps.length > 0 ? (
          <ol
            aria-label={t("pages.structuredResults.investigationTrace.currentPath")}
            className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5"
          >
            {steps.map((step, index) => (
              <li key={step.id} className="flex min-w-0 items-center gap-1.5">
                <span
                  data-slot="investigation-trace-step"
                  className="inline-flex h-7 min-w-0 max-w-full items-center justify-center rounded-md border border-border/60 bg-muted/40 px-2.5 text-[11px] font-normal text-foreground"
                >
                  <span className="truncate">{step.label}</span>
                </span>
                {index < steps.length - 1 ? (
                  <span
                    aria-hidden="true"
                    className="select-none text-xs text-muted-foreground"
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground italic">
            {t("pages.structuredResults.investigationTrace.noPathAvailable")}
          </p>
        )}
      </div>
    </ChatResultContainer>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
