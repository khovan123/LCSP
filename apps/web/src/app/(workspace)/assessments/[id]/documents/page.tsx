import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";
import { DocumentsPageClient } from "@/features/document/pages/documents-page-client";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.classification.metadataTitle"),
  description: resolveMessage(appLocale, "pages.classification.metadataDescription"),
};

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
