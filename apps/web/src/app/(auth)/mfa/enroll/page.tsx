import { resolveMessage } from "@lcsp/i18n";
import type { Metadata } from "next";

import { AuthShell } from "@/features/auth/components/organisms/auth-shell";
import { MfaEnrollForm } from "@/features/auth/components/organisms/mfa-enroll-form";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.mfaEnroll.metadataTitle"),
  description: resolveMessage(appLocale, "pages.mfaEnroll.metadataDescription"),
};

export default function MfaEnrollPage() {
  return (
    <AuthShell
      homeLabel={resolveMessage(appLocale, "pages.mfaEnroll.homeAriaLabel")}
    >
      <MfaEnrollForm />
    </AuthShell>
  );
}
