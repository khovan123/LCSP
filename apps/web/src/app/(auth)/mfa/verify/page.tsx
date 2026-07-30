import { resolveMessage } from "@lcsp/i18n";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/organisms/auth-shell";
import { MfaVerifyForm } from "@/features/auth/components/organisms/mfa-verify-form";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.mfaVerify.metadataTitle"),
  description: resolveMessage(appLocale, "pages.mfaVerify.metadataDescription"),
};

export default function MfaVerifyPage() {
  return (
    <AuthShell
      homeLabel={resolveMessage(appLocale, "pages.mfaVerify.homeAriaLabel")}
    >
      <MfaVerifyForm />
    </AuthShell>
  );
}
