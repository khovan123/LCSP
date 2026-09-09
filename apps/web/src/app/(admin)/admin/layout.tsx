import type { ReactNode } from "react";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";

export default function AdminRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <AdminShell>{children}</AdminShell>;
}
