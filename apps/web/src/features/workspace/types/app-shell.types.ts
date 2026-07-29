import type { LucideIcon } from "lucide-react";

export type AppShellNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
  disabled?: boolean;
  disabledReason?: string;
};

export type AppShellNavigationSection = {
  label: string;
  kind?: "workspace" | "assessment" | "developer";
  assessmentId?: string;
  items: AppShellNavigationItem[];
};
