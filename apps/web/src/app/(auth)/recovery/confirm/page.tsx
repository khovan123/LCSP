import { resolveMessage } from "@lcsp/i18n";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/organisms/auth-shell";
import { RecoveryConfirmForm } from "@/features/auth/components/organisms/recovery-confirm-form";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.recoveryConfirm.metadataTitle"),
  description: resolveMessage(
    appLocale,
    "pages.recoveryConfirm.metadataDescription",
  ),
};

export default async function RecoveryConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      homeLabel={resolveMessage(
        appLocale,
        "pages.recoveryConfirm.homeAriaLabel",
      )}
    >
      <RecoveryConfirmForm token={params.token ?? ""} />
    </AuthShell>
  );
}
