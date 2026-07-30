import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";
import { AuthShell } from "./auth-shell";
import { SignInForm } from "./sign-in-form";

export function SignInPage() {
  return (
    <AuthShell
      homeLabel={resolveMessage(appLocale, "pages.signIn.homeAriaLabel")}
    >
      <SignInForm />
    </AuthShell>
  );
}
