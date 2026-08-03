"use client";

import { useState } from "react";
import type { MessageKey } from "@lcsp/i18n";
import { resolveMessage } from "@lcsp/i18n";
import { FileTextIcon } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SectionHeading } from "@/components/molecules/section-heading";
import {
  useRequestFinalReportMutation,
  useRequestGapAnalysisMutation,
} from "@/lib/api/assessment-queries";
import { appLocale } from "@/lib/locale";
import {
  DOCUMENT_REQUEST_PANEL_STATUSES,
  type DocumentRequestPanelProps,
  type DocumentRequestPanelStatus,
} from "../../types/document-request-panel.types";
import { DocumentRequestActionCard } from "../molecules/document-request-action-card";

export function DocumentRequestPanel({
  assessmentId,
}: DocumentRequestPanelProps) {
  const finalReportMutation = useRequestFinalReportMutation(assessmentId);
  const gapAnalysisMutation = useRequestGapAnalysisMutation(assessmentId);
  const [status, setStatus] = useState<DocumentRequestPanelStatus>(
    DOCUMENT_REQUEST_PANEL_STATUSES.idle,
  );
  const [messageKey, setMessageKey] = useState<MessageKey | null>(null);

  async function onRequestFinalReport() {
    setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.loading);
    setMessageKey(null);

    const outcome = await finalReportMutation.mutateAsync();

    if (outcome.kind === "requested") {
      setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.done);
      setMessageKey("pages.classification.finalReportRequestedDetail");
      return;
    }

    if (outcome.kind === "blocked") {
      setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.error);
      setMessageKey(outcome.detailKey);
      return;
    }

    if (outcome.kind === "redirect") {
      window.location.assign(outcome.location);
      return;
    }

    setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.error);
    setMessageKey(outcome.detailKey);
  }

  async function onRequestGapAnalysis() {
    setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.loading);
    setMessageKey(null);

    const outcome = await gapAnalysisMutation.mutateAsync();

    if (outcome.kind === "requested") {
      setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.done);
      setMessageKey("pages.classification.finalReportRequestedDetail");
      return;
    }

    if (outcome.kind === "blocked") {
      setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.error);
      setMessageKey(outcome.detailKey);
      return;
    }

    if (outcome.kind === "redirect") {
      window.location.assign(outcome.location);
      return;
    }

    setStatus(DOCUMENT_REQUEST_PANEL_STATUSES.error);
    setMessageKey(outcome.detailKey);
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <SectionHeading
        title={resolveMessage(
          appLocale,
          "pages.classification.generateFinalReport",
        )}
        description={resolveMessage(
          appLocale,
          "pages.classification.documentsPageDescription",
        )}
        icon={<FileTextIcon className="size-4" />}
      />

      <div className="grid gap-6">
        <DocumentRequestActionCard
          title={resolveMessage(
            appLocale,
            "pages.classification.generateFinalReport",
          )}
          description={resolveMessage(
            appLocale,
            "pages.classification.finalReportPageHint",
          )}
          actionLabel={resolveMessage(
            appLocale,
            "pages.classification.requestFinalReportButton",
          )}
          disabled={status === DOCUMENT_REQUEST_PANEL_STATUSES.loading}
          onAction={() => {
            void onRequestFinalReport();
          }}
        />

        <DocumentRequestActionCard
          title={resolveMessage(
            appLocale,
            "pages.classification.gapAnalysisLabel",
          )}
          description={resolveMessage(
            appLocale,
            "pages.classification.gapAnalysisPendingMessage",
          )}
          actionLabel={resolveMessage(
            appLocale,
            "pages.classification.generateGapAnalysis",
          )}
          actionVariant="secondary"
          highlighted
          disabled={status === DOCUMENT_REQUEST_PANEL_STATUSES.loading}
          onAction={() => {
            void onRequestGapAnalysis();
          }}
        />

        {status === DOCUMENT_REQUEST_PANEL_STATUSES.done && messageKey ? (
          <Alert>
            <AlertTitle>
              {resolveMessage(
                appLocale,
                "pages.classification.finalReportRequestedTitle",
              )}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, messageKey)}
            </AlertDescription>
          </Alert>
        ) : null}

        {status === DOCUMENT_REQUEST_PANEL_STATUSES.error && messageKey ? (
          <Alert variant="destructive">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.classification.errorTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, messageKey)}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
