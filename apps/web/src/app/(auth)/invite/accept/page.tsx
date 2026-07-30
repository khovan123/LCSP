import type { Metadata } from "next";
import { resolveMessage } from "@lcsp/i18n";

import { AcceptInvitationForm } from "@/features/auth/components/organisms/accept-invitation-form";
import { AuthShell } from "@/features/auth/components/organisms/auth-shell";
import { appLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: resolveMessage(appLocale, "pages.acceptInvitation.metadataTitle"),
  description: resolveMessage(
    appLocale,
    "pages.acceptInvitation.metadataDescription",
  ),
};

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <AuthShell
      homeLabel={resolveMessage(appLocale, "pages.signIn.homeAriaLabel")}
    >
      <AcceptInvitationForm key={token} invitationToken={token} />
    </AuthShell>
  );
}
