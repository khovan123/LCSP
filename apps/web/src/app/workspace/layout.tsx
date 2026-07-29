import type { ReactNode } from "react";

import { AppShell } from "@/features/workspace/components/organisms/app-shell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
