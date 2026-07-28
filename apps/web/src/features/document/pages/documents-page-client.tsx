"use client";

import { useEffect, useState } from "react";
import type { DocumentRequestStatus, DocumentType } from "@lcsp/contracts/document";
import { DocumentListView } from "@/features/document/components/organisms/document-list-view";

type DocumentStatusItem = {
  document_request_id: string;
  document_type: DocumentType;
  status: DocumentRequestStatus;
  blocked_reason: string | null;
  guardrail_status: string | null;
  download_url: string | null;
  download_url_expires_at: string | null;
  requested_at: string;
  completed_at: string | null;
  correlation_id: string;
};

export function DocumentsPageClient({ assessmentId }: { assessmentId: string }) {
  const [documents, setDocuments] = useState<DocumentStatusItem[] | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch(`/api/assessments/${encodeURIComponent(assessmentId)}/documents`, {
          cache: "no-store",
        });
        if (!mounted) return;
        if (res.ok) {
          const body = await res.json();
          setDocuments(body as DocumentStatusItem[]);
          return;
        }
        setDocuments([]);
      } catch (e) {
        setDocuments([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [assessmentId]);

  if (documents === null) {
    // Loading: render DocumentListView with empty list to show placeholders
    return <DocumentListView assessmentId={assessmentId} documents={[]} canDownloadFinalReport={false} />;
  }

  const canDownloadFinalReport = documents.some((d) => d.document_type === "FinalReport");

  return <DocumentListView assessmentId={assessmentId} documents={documents} canDownloadFinalReport={canDownloadFinalReport} />;
}
