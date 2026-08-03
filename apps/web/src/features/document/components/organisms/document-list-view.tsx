"use client";

import { useMemo } from "react";
import { DOCUMENT_TYPES } from "@lcsp/contracts/document";
import { resolveMessage } from "@lcsp/i18n";
import { FileTextIcon } from "lucide-react";

import { SectionHeading } from "@/components/molecules/section-heading";
import { appLocale } from "@/lib/locale";
import type { DocumentListViewProps } from "../../types/document-list-view.types";
import { DocumentStatusCard } from "../molecules/document-status-card";

export function DocumentListView({
  assessmentId,
  documents,
  canDownloadFinalReport,
}: DocumentListViewProps) {
  const sortedDocuments = useMemo(
    () =>
      [...documents].sort((left, right) =>
        left.document_type.localeCompare(right.document_type),
      ),
    [documents],
  );

  return (
    <div className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(
          appLocale,
          "pages.classification.documentList.title",
        )}
        description={resolveMessage(
          appLocale,
          "pages.classification.documentList.description",
        )}
        icon={<FileTextIcon className="size-4" />}
      />

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
              document.document_type !== DOCUMENT_TYPES.finalReport ||
              canDownloadFinalReport
            }
          />
        ))}
      </div>
    </div>
  );
}
