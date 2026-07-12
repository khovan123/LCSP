import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { WorkspaceDashboard } from "@/features/workspace/components/organisms/workspace-dashboard";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.workspace.metadataTitle"),
  description: resolveMessage(appLocale, "pages.workspace.metadataDescription"),
};

export default function WorkspacePage() {
  return <WorkspaceDashboard />;
}
