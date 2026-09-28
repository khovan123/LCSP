import type { ReactNode } from "react";
import { headers } from "next/headers";
import type { Locale } from "@lcsp/contracts/shared";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";

/**
 * Isolated Admin Route Layout.
 * Encloses all /admin/* pages inside the dedicated AdminShell (sidebar + container).
 * Network-level authorization and route guarding is handled upstream by proxy.ts.
 */
export default async function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const headerLocale = (await headers()).get("x-lcsp-locale");
  const initialLocale: Locale = headerLocale === "en" ? "en" : "vi";

  return <AdminShell initialLocale={initialLocale}>{children}</AdminShell>;
}


