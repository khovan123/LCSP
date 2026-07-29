"use client";

import { useState } from "react";
import type { MessageKey } from "@lcsp/i18n";
import { resolveMessage } from "@lcsp/i18n";

import { buttonVariants } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useRequestFinalReportMutation,
  useRequestGapAnalysisMutation,
} from "@/lib/api/assessment-queries";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";

export function DocumentRequestPanel({ assessmentId }: { assessmentId: string }) {
  const finalReportMutation = useRequestFinalReportMutation(assessmentId);
  const gapAnalysisMutation = useRequestGapAnalysisMutation(assessmentId);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [messageKey, setMessageKey] = useState<MessageKey | null>(null);

  async function onRequestFinalReport() {
    setStatus("loading");
    setMessageKey(null);

    const outcome = await finalReportMutation.mutateAsync();

    if (outcome.kind === "requested") {
      setStatus("done");
      setMessageKey("pages.classification.finalReportRequestedDetail");
      return;
    }

    if (outcome.kind === "blocked") {
      setStatus("error");
      setMessageKey(outcome.detailKey);
      return;
    }

    if (outcome.kind === "redirect") {
      window.location.assign(outcome.location);
      return;
    }

    setStatus("error");
    setMessageKey(outcome.detailKey);
  }

  async function onRequestGapAnalysis() {
    setStatus("loading");
    setMessageKey(null);

    const outcome = await gapAnalysisMutation.mutateAsync();

    if (outcome.kind === "requested") {
      setStatus("done");
      setMessageKey("pages.classification.finalReportRequestedDetail");
      return;
    }

    if (outcome.kind === "blocked") {
      setStatus("error");
      setMessageKey(outcome.detailKey);
      return;
    }

    if (outcome.kind === "redirect") {
      window.location.assign(outcome.location);
      return;
    }

    setStatus("error");
    setMessageKey(outcome.detailKey);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {resolveMessage(appLocale, "pages.classification.generateFinalReport")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolveMessage(appLocale, "pages.classification.documentsPageDescription")}
        </p>
      </header>

      <div className="grid gap-6">
        <div className="rounded-2xl border p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.finalReportPageHint")}
          </p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "default" }), "mt-4")}
            onClick={onRequestFinalReport}
            disabled={status === "loading"}
          >
            {resolveMessage(appLocale, "pages.classification.requestFinalReportButton")}
          </button>
        </div>

        <div className="rounded-2xl border p-6 bg-muted/50">
          <p className="text-sm font-medium">
            {resolveMessage(appLocale, "pages.classification.gapAnalysisLabel")}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.gapAnalysisPendingMessage")}
          </p>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "secondary" }), "mt-4")}
            onClick={onRequestGapAnalysis}
            disabled={status === "loading"}
          >
            {resolveMessage(appLocale, "pages.classification.generateGapAnalysis")}
          </button>
        </div>

        {status === "done" && messageKey ? (
          <Alert>
            <AlertTitle>{resolveMessage(appLocale, "pages.classification.finalReportRequestedTitle")}</AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, messageKey)}
            </AlertDescription>
          </Alert>
        ) : null}

        {status === "error" && messageKey ? (
          <Alert variant="destructive">
            <AlertTitle>{resolveMessage(appLocale, "pages.classification.errorTitle")}</AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, messageKey)}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
