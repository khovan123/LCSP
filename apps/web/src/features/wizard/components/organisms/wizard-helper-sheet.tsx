"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getHelperCopy } from "@/features/wizard/lib/wizard-form";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardHelperKey } from "@/features/wizard/types/wizard-form.types";

type WizardHelperSheetProps = {
  helperKey: WizardHelperKey;
  onOpenChange: (open: boolean) => void;
};

export function WizardHelperSheet({
  helperKey,
  onOpenChange,
}: WizardHelperSheetProps) {
  const helperCopy = getHelperCopy(helperKey);

  return (
    <Sheet open={helperKey !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>{t(helperCopy.titleKey)}</SheetTitle>
          <SheetDescription>{t(helperCopy.bodyKey)}</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}
