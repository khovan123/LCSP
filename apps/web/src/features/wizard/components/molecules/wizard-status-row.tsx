"use client";

import { BadgeCheck } from "lucide-react";

type WizardStatusRowProps = {
  label: string;
  active: boolean;
  complete: boolean;
  onClick?: () => void;
};

export function WizardStatusRow({
  label,
  active,
  complete,
  onClick,
}: WizardStatusRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full cursor-pointer items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors ${
        active
          ? "bg-teal-50 font-medium text-teal-800 ring-1 ring-teal-600/30 dark:bg-teal-950/40 dark:text-teal-300"
          : complete
            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100/60 dark:bg-emerald-950/30 dark:text-emerald-400"
            : "bg-muted/60 text-muted-foreground hover:bg-muted"
      }`}
    >
      <span>{label}</span>
      {complete ? (
        <BadgeCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : null}
    </button>
  );
}
