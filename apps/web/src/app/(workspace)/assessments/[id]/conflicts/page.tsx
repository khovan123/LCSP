import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { ConflictResolutionPage } from "@/features/reconciliation/components/organisms/conflict-resolution-page";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.reconciliation.metadataTitle"),
  description: resolveMessage(
    appLocale,
    "pages.reconciliation.metadataDescription",
  ),
};

export default async function AssessmentConflictsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConflictResolutionPage assessmentId={id} />;
}
