"use client";

import { useEffect, useState } from "react";
import type { DocumentStatusDto } from "@lcsp/contracts/document";
import { DocumentListView } from "@/features/document/components/organisms/document-list-view";

export function DocumentsPageClient({ assessmentId }: { assessmentId: string }) {
  const [documents, setDocuments] = useState<DocumentStatusDto[] | null>(null);

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
          setDocuments(body as DocumentStatusDto[]);
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
