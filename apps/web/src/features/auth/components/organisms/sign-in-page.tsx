import { BrandMark } from "@/components/atoms/brand-mark";
import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";
import { SignInForm } from "./sign-in-form";

export function SignInPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-foreground">
      <BrandMark
        homeLabel={resolveMessage(appLocale, "pages.signIn.homeAriaLabel")}
      />
      <SignInForm />
    </main>
  );
}
