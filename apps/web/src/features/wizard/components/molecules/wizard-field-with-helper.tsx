"use client";

import { WizardHelperButton } from "./wizard-helper-button";
import type { WizardFieldWithHelperProps } from "../../types/component-props.types";

export function WizardFieldWithHelper({
  children,
  onHelperClick,
}: WizardFieldWithHelperProps) {
  return (
    <div className="flex flex-col gap-3">
      {children}
      <WizardHelperButton onClick={onHelperClick} />
    </div>
  );
}
