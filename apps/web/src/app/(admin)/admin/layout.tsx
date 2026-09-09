import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";

/**
 * Isolated Admin Route Layout (LCSP-295).
 * Encloses all /admin/* pages inside the dedicated AdminShell (sidebar + container),
 * completely isolated from the customer workspace shell and runtime providers.
 */
export default function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}

