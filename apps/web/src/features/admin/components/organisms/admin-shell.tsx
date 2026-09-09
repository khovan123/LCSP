"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AUTH_USER_ROLES } from "@lcsp/contracts/auth";
import { AdminSidebar } from "@/features/admin/components/organisms/admin-sidebar";
import { useAuthSettingsProfileQuery } from "@/lib/api/auth-queries";

type AdminShellProps = {
  children: ReactNode;
  adminName?: string;
  adminEmail?: string;
};

export function AdminShell({
  children,
  adminName,
  adminEmail,
}: AdminShellProps) {
  const router = useRouter();
  const { data: profile } = useAuthSettingsProfileQuery();

  const isNonAdmin = profile?.role && profile.role !== AUTH_USER_ROLES.admin;

  useEffect(() => {
    if (isNonAdmin) {
      router.replace("/workspace");
    }
  }, [isNonAdmin, router]);

  if (isNonAdmin) {
    return null;
  }

  const resolvedName =
    adminName ??
    profile?.display_name ??
    (profile?.email ? profile.email.split("@")[0] : undefined) ??
    "Administrator";
  const resolvedEmail =
    adminEmail ?? profile?.email ?? "admin@lcsp.internal";

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground antialiased selection:bg-primary/20">
      {/* 248px Desktop Admin Sidebar */}
      <AdminSidebar adminName={resolvedName} adminEmail={resolvedEmail} />

      {/* Main Content Surface (1192px at 1440px desktop viewport) */}
      <main className="flex min-h-screen flex-1 min-w-0 flex-col overflow-y-auto px-10 py-8">
        <div className="mx-auto w-full max-w-[1192px]">{children}</div>
      </main>
    </div>
  );
}

