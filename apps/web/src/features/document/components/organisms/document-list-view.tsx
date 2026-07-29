"use client";

import { useMemo } from "react";
import { DOCUMENT_TYPES, type DocumentRequestStatus, type DocumentType } from "@lcsp/contracts/document";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";
import { DocumentStatusCard } from "../molecules/document-status-card";

type DocumentListItem = {
  document_request_id: string;
  document_type: DocumentType;
  status: DocumentRequestStatus;
  blocked_reason: string | null;
  download_url: string | null;
  download_url_expires_at: string | null;
  requested_at: string;
};

type DocumentListViewProps = {
  assessmentId: string;
  documents: DocumentListItem[];
  canDownloadFinalReport: boolean;
};

export function DocumentListView({
  assessmentId,
  documents,
  canDownloadFinalReport,
}: DocumentListViewProps) {
  const sortedDocuments = useMemo(
    () => [...documents].sort((left, right) => left.document_type.localeCompare(right.document_type)),
    [documents],
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.classification.documentList.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.documentList.description")}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sortedDocuments.map((document) => (
          <DocumentStatusCard
            key={document.document_request_id}
            assessmentId={assessmentId}
            documentRequestId={document.document_request_id}
            documentType={document.document_type}
            initialStatus={document.status}
            initialBlockedReason={document.blocked_reason}
            initialDownloadUrl={document.download_url}
            initialDownloadExpiresAt={document.download_url_expires_at}
            initialRequestedAt={document.requested_at}
            canDownload={
              document.document_type !== DOCUMENT_TYPES.finalReport || canDownloadFinalReport
            }
          />
        ))}
      </div>
    </div>
  );
}
