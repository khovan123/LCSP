import type { ReactNode } from "react";

export type FormCardProps = {
  eyebrow?: string;
  title: string;
  description: string;
  leading?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
};
