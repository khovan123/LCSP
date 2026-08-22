"use client";

import { WIZARD_FIELD_CONTROLS } from "@lcsp/contracts/wizard";

import { Badge } from "@/components/ui/badge";
import { WizardSelectField } from "@/features/wizard/components/molecules/wizard-select-field";
import { WizardTextareaField } from "@/features/wizard/components/molecules/wizard-textarea-field";
import { selectOptions } from "@/features/wizard/config/wizard-config";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardAgentClarificationPrompt } from "@/features/wizard/lib/wizard-agent-clarification";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardAgentClarificationCardProps = {
  prompts: WizardAgentClarificationPrompt[];
  disabled?: boolean;
  onBlur?: () => void;
  onValueChange?: (name: keyof WizardAnswers) => void;
};

export function WizardAgentClarificationCard({
  prompts,
  disabled,
  onBlur,
  onValueChange,
}: WizardAgentClarificationCardProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-sky-200 bg-sky-50/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-sky-950">
            {t("pages.wizard.clarification.agentTitle")}
          </p>
          <p className="text-sm text-sky-900/80">
            {t("pages.wizard.clarification.agentDescription")}
          </p>
        </div>
        <Badge variant="outline">
          {t("pages.wizard.clarification.agentBadge")}
        </Badge>
      </div>
      <div className="grid gap-3">
        {prompts.map((prompt) => {
          const options =
            prompt.optionSet === undefined
              ? undefined
              : selectOptions[prompt.optionSet as keyof typeof selectOptions];
          return (
            <div
              className="rounded-md border border-sky-200 bg-background px-4 py-3"
              key={prompt.id}
            >
              <p className="mb-2 text-sm font-medium text-foreground">
                {prompt.text}
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("pages.wizard.clarification.agentReasonLabel")}:{" "}
                {prompt.reasonCode}
              </p>
              {prompt.answerControl === WIZARD_FIELD_CONTROLS.select &&
              options ? (
                <WizardSelectField
                  name={prompt.targetFieldName}
                  disabled={disabled}
                  labelKey="pages.wizard.clarification.agentAnswerLabel"
                  descriptionKey="pages.wizard.clarification.agentAnswerDescription"
                  options={options}
                  onBlur={onBlur}
                  onValueChange={onValueChange}
                />
              ) : (
                <WizardTextareaField
                  name={prompt.targetFieldName}
                  disabled={disabled}
                  labelKey="pages.wizard.clarification.agentAnswerLabel"
                  descriptionKey="pages.wizard.clarification.agentAnswerDescription"
                  placeholderKey="pages.wizard.clarification.agentAnswerPlaceholder"
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
