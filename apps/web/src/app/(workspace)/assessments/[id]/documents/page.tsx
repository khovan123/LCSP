import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";
import { DocumentsPageClient } from "@/features/document/pages/documents-page-client";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.classification.metadataTitle"),
  description: resolveMessage(appLocale, "pages.classification.metadataDescription"),
};

const DEFAULT_DOCUMENTS = [
  {
    document_request_id: "gap-analysis",
    document_type: "GapAnalysis",
    status: "QUEUED",
    blocked_reason: null,
    guardrail_status: null,
    download_url: null,
    download_url_expires_at: null,
    requested_at: "",
    completed_at: null,
    correlation_id: "",
  },
  {
    document_request_id: "final-report",
    document_type: "FinalReport",
    status: "QUEUED",
    blocked_reason: null,
    guardrail_status: null,
    download_url: null,
    download_url_expires_at: null,
    requested_at: "",
    completed_at: null,
    correlation_id: "",
  },
  {
    document_request_id: "readiness-export",
    document_type: "ReadinessExport",
    status: "QUEUED",
    blocked_reason: null,
    guardrail_status: null,
    download_url: null,
    download_url_expires_at: null,
    requested_at: "",
    completed_at: null,
    correlation_id: "",
  },
] as const;

export default async function AssessmentDocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {resolveMessage(appLocale, "pages.classification.documentList.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {resolveMessage(appLocale, "pages.classification.documentList.description")}
        </p>
      </header>

      <DocumentsPageClient assessmentId={id} />
    </div>
  );
}
