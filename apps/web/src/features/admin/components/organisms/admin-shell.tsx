"use client";

import type { ReactNode } from "react";
import { AdminSidebar } from "./admin-sidebar";

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
  return (
    <div className="flex min-h-screen w-full bg-[#181818] text-foreground antialiased selection:bg-primary/20">
      {/* 248px Desktop Admin Sidebar */}
      <AdminSidebar adminName={adminName} adminEmail={adminEmail} />

      {/* Main Content Surface (1192px at 1440px desktop viewport) */}
      <main className="flex min-h-screen flex-1 min-w-0 flex-col overflow-y-auto px-10 py-8">
        <div className="mx-auto w-full max-w-[1192px]">{children}</div>
      </main>
    </div>
  );
}
