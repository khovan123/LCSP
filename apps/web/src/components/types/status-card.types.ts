import type { ReactNode } from "react";

export type StatusCardProps = {
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant?: "default" | "secondary" | "destructive";
  children?: ReactNode;
};
