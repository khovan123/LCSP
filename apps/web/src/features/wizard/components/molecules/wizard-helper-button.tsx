"use client";

import { CircleHelp } from "lucide-react";

import { Button } from "@/components/ui/button";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardHelperButtonProps } from "../../types/component-props.types";

export function WizardHelperButton({ onClick }: WizardHelperButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="w-fit px-0 text-teal-700"
      onClick={onClick}
    >
      <CircleHelp className="size-4" />
      {t("pages.wizard.helperButton")}
    </Button>
  );
}
