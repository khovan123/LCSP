import type { LucideIcon } from "lucide-react";

export type AppShellNavigationItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

export type AppShellNavigationSection = {
  label: string;
  items: AppShellNavigationItem[];
};
