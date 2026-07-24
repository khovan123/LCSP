import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { DocumentRequestPanel } from "@/features/document/components/organisms/document-request-panel";
import { appLocale } from "@/lib/locale";

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

  return <DocumentRequestPanel assessmentId={id} />;
}
