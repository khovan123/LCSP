import type { Metadata } from "next";

import { BrandMark } from "@/components/atoms/brand-mark";
import { AcceptInvitationForm } from "@/features/auth/components/organisms/accept-invitation-form";

export const metadata: Metadata = {
  title: "Accept developer invitation | LCSP",
  description: "Review and accept your scoped LCSP developer invitation.",
};

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-6 py-12 text-foreground">
      <BrandMark homeLabel="LCSP home" />
      <AcceptInvitationForm key={token} invitationToken={token} />
    </main>
  );
}
