import { Suspense } from "react";

import { SettingsPage } from "@/features/settings/components/organisms/settings-page";

export default function WorkspaceSettingsPage() {
  return (
    <Suspense fallback={null}>
      <SettingsPage />
    </Suspense>
  );
}
