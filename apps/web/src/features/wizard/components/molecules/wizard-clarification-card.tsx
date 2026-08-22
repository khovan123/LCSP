"use client";

import { WIZARD_FIELD_CONTROLS } from "@lcsp/contracts/wizard";

import { Badge } from "@/components/ui/badge";
import { WizardSelectField } from "@/features/wizard/components/molecules/wizard-select-field";
import { WizardTextareaField } from "@/features/wizard/components/molecules/wizard-textarea-field";
import { selectOptions } from "@/features/wizard/config/wizard-config";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardClarificationPrompt } from "@/features/wizard/lib/wizard-form";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardClarificationCardProps = {
  prompts: WizardClarificationPrompt[];
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange?: (name: keyof WizardAnswers) => void;
};

export function WizardClarificationCard({
  prompts,
  disabled,
  onBlur,
  onValueChange,
}: WizardClarificationCardProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">
            {t("pages.wizard.clarification.title")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("pages.wizard.clarification.description")}
          </p>
        </div>
        <Badge variant="outline">{t("pages.wizard.clarification.badge")}</Badge>
      </div>
      <div className="flex flex-col gap-3">
        {prompts.map((prompt) => {
          const options =
            prompt.optionSet === undefined
              ? undefined
              : selectOptions[prompt.optionSet];
          return (
            <div
              key={prompt.id}
              className="max-w-3xl rounded-md border bg-background px-4 py-3"
            >
              {prompt.control === WIZARD_FIELD_CONTROLS.select && options ? (
                <WizardSelectField
                  name={prompt.fieldName}
                  disabled={disabled}
                  labelKey={prompt.questionKey}
                  descriptionKey={prompt.detailKey}
                  options={options}
                  onBlur={onBlur}
                  onValueChange={onValueChange}
                />
              ) : (
                <WizardTextareaField
                  name={prompt.fieldName}
                  disabled={disabled}
                  labelKey={prompt.questionKey}
                  descriptionKey={prompt.detailKey}
                  placeholderKey={
                    prompt.placeholderKey ??
                    "pages.wizard.fields.businessProcessPlaceholder"
                  }
                  onBlur={onBlur}
                  onValueChange={onValueChange}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
