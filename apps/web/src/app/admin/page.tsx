import type { Metadata } from "next";
import { AdminShell } from "@/features/admin/components/organisms/admin-shell";

export const metadata: Metadata = {
  title: "Admin Console | LCSP",
  description: "LCSP Admin console for user lifecycle, corpus versions, and audit trail.",
};

export default function AdminPage() {
  return <AdminShell />;
}
