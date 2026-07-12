import { resolveMessage } from "@lcsp/i18n";
import type { Metadata } from "next";

import { BrandMark } from "@/components/atoms/brand-mark";
import { authLocale } from "@/features/auth/config/locale";
import { MfaVerifyForm } from "@/features/auth/components/organisms/mfa-verify-form";

export const metadata: Metadata = {
  title: resolveMessage(authLocale, "pages.mfaVerify.metadataTitle"),
  description: resolveMessage(
    authLocale,
    "pages.mfaVerify.metadataDescription",
  ),
};

export default function MfaVerifyPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-foreground">
      <BrandMark
        homeLabel={resolveMessage(authLocale, "pages.mfaVerify.homeAriaLabel")}
      />
      <MfaVerifyForm />
    </main>
  );
}
