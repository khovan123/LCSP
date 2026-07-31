import { resolveMessage } from "@lcsp/i18n";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/organisms/auth-shell";
import { RecoveryRequestForm } from "@/features/auth/components/organisms/recovery-request-form";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.recoveryRequest.metadataTitle"),
  description: resolveMessage(
    appLocale,
    "pages.recoveryRequest.metadataDescription",
  ),
};

export default function RecoveryRequestPage() {
  return (
    <AuthShell
      homeLabel={resolveMessage(
        appLocale,
        "pages.recoveryRequest.homeAriaLabel",
      )}
    >
      <RecoveryRequestForm />
    </AuthShell>
  );
}
