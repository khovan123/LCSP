"use client";

import { BadgeCheck, CircleX, LoaderCircle } from "lucide-react";

import { t } from "@/features/wizard/lib/wizard-i18n";

type WizardDraftStatusBadgeProps = {
  statusKey: string;
  isDraftComplete: boolean;
};

export function WizardDraftStatusBadge({
  statusKey,
  isDraftComplete,
}: WizardDraftStatusBadgeProps) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm ${
        statusKey === "pages.wizard.draftSaved"
          ? isDraftComplete
            ? "justify-between bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400"
            : "bg-muted text-muted-foreground"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {statusKey === "pages.wizard.draftSaved" && !isDraftComplete ? (
        <BadgeCheck className="size-4 shrink-0" />
      ) : null}
      {statusKey === "pages.wizard.draftSaving" ? (
        <LoaderCircle className="size-4 animate-spin" />
      ) : null}
      {statusKey === "pages.wizard.draftDirty" ? (
        <CircleX className="size-4 shrink-0" />
      ) : null}
      <span>{t(statusKey)}</span>
      {statusKey === "pages.wizard.draftSaved" && isDraftComplete ? (
        <BadgeCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      ) : null}
    </div>
  );
}
