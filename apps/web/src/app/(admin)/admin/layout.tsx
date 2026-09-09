import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";

import { SESSION_COOKIE_NAME } from "@/lib/session/session-store";
import { upstreamRequest } from "@/lib/server/upstream-request";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";

/**
 * Isolated Admin Route Layout (LCSP-295).
 * Server-side gate that executes BEFORE rendering any HTML or client components.
 * Non-admins are immediately redirected to /workspace, and unauthenticated users to /sign-in.
 */
export default async function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    redirect("/sign-in?next=%2Fadmin%2Fusers");
  }

  const verification = await upstreamRequest("/auth/profile", {
    bearerToken: sessionToken,
  });

  const userRole = verification.result?.ok
    ? (verification.result.data as { role?: string })?.role
    : undefined;

  if (userRole !== AUTH_USER_ROLES.admin) {
    redirect("/workspace");
  }

  const adminName = verification.result?.ok
    ? (verification.result.data as { display_name?: string })?.display_name
    : undefined;
  const adminEmail = verification.result?.ok
    ? (verification.result.data as { email?: string })?.email
    : undefined;

  return (
    <AdminShell adminName={adminName} adminEmail={adminEmail}>
      {children}
    </AdminShell>
  );
}


