"use client";

import { DocumentListView } from "@/features/document/components/organisms/document-list-view";
import { useDocumentsQuery } from "@/lib/api/assessment-queries";

export function DocumentsPageClient({ assessmentId }: { assessmentId: string }) {
  const documentsQuery = useDocumentsQuery(assessmentId);
  const documents = documentsQuery.data ?? [];

  if (documentsQuery.isLoading) {
    return <DocumentListView assessmentId={assessmentId} documents={[]} canDownloadFinalReport={false} />;
  }

  const canDownloadFinalReport = documents.some((d) => d.document_type === "FinalReport");

  return <DocumentListView assessmentId={assessmentId} documents={documents} canDownloadFinalReport={canDownloadFinalReport} />;
}
