"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WizardCheckboxField } from "@/features/wizard/components/molecules/wizard-checkbox-field";
import { WizardHelperButton } from "@/features/wizard/components/molecules/wizard-helper-button";
import { WizardSelectField } from "@/features/wizard/components/molecules/wizard-select-field";
import { WizardTextareaField } from "@/features/wizard/components/molecules/wizard-textarea-field";
import {
  checkboxOptions,
  selectOptions,
  wizardSteps,
} from "@/features/wizard/config/wizard-config";
import {
  sectionCardClassName,
  toBooleanSelectValue,
} from "@/features/wizard/lib/wizard-form";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardHelperKey } from "@/features/wizard/types/wizard-form.types";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardActiveStepCardProps = {
  currentStep: number;
  effectiveIsReadOnly: boolean;
  answers: WizardAnswers;
  onFieldBlur: () => void;
  onFieldChange: (name: keyof WizardAnswers) => void;
  onHelperOpen: (helperKey: Exclude<WizardHelperKey, null>) => void;
};

export function WizardActiveStepCard({
  currentStep,
  effectiveIsReadOnly,
  answers,
  onFieldBlur,
  onFieldChange,
  onHelperOpen,
}: WizardActiveStepCardProps) {
  if (currentStep === 0) {
    return (
      <Card className={sectionCardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="outline">{t("pages.wizard.preScreenBadge")}</Badge>
            {effectiveIsReadOnly ? (
              <Badge variant="secondary">
                {t("pages.wizard.readOnlyBadge")}
              </Badge>
            ) : null}
          </div>
          <CardTitle>{t("pages.wizard.preScreenTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.preScreenDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <WizardSelectField
            name="ps_001_ai_scope"
            disabled={effectiveIsReadOnly}
            labelKey="pages.wizard.fields.preAiScopeLabel"
            descriptionKey="pages.wizard.fields.preAiScopeDescription"
            onBlur={onFieldBlur}
            onValueChange={onFieldChange}
            options={selectOptions.yesNoUnknown}
          />
          <WizardCheckboxField
            name="ps_002_affected_people"
            disabled={effectiveIsReadOnly}
            labelKey="pages.wizard.fields.preAffectedPeopleLabel"
            descriptionKey="pages.wizard.fields.preAffectedPeopleDescription"
            options={checkboxOptions.affectedPeople}
            onBlur={onFieldBlur}
            onValueChange={onFieldChange}
          />
          <WizardSelectField
            name="ps_003_personal_or_sensitive_data"
            disabled={effectiveIsReadOnly}
            labelKey="pages.wizard.fields.prePersonalDataLabel"
            descriptionKey="pages.wizard.fields.prePersonalDataDescription"
            onBlur={onFieldBlur}
            onValueChange={onFieldChange}
            options={selectOptions.yesNoUnknown}
          />
          <WizardSelectField
            name="ps_004_decision_importance"
            disabled={effectiveIsReadOnly}
            labelKey="pages.wizard.fields.preDecisionImportanceLabel"
            descriptionKey="pages.wizard.fields.preDecisionImportanceDescription"
            onBlur={onFieldBlur}
            onValueChange={onFieldChange}
            options={selectOptions.yesNoUnknown}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={sectionCardClassName}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <Badge variant="secondary">{t("pages.wizard.detailedBadge")}</Badge>
          <div className="flex items-center gap-2">
            {effectiveIsReadOnly ? (
              <Badge variant="secondary">
                {t("pages.wizard.readOnlyBadge")}
              </Badge>
            ) : null}
            <span className="text-sm text-muted-foreground">
              {currentStep}/{wizardSteps.length}
            </span>
          </div>
        </div>
        <CardTitle>{t(wizardSteps[currentStep - 1].titleKey)}</CardTitle>
        <CardDescription>{t("pages.wizard.pageDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {currentStep === 1 ? (
          <>
            <WizardTextareaField
              name="purpose"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.purposeLabel"
              descriptionKey="pages.wizard.fields.purposeDescription"
              placeholderKey="pages.wizard.fields.purposePlaceholder"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
            />
            <WizardSelectField
              name="sector"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.sectorLabel"
              descriptionKey="pages.wizard.fields.sectorDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              options={selectOptions.sector}
            />
          </>
        ) : null}

        {currentStep === 2 ? (
          <>
            <WizardCheckboxField
              name="data_type"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.dataTypeLabel"
              descriptionKey="pages.wizard.fields.dataTypeDescription"
              options={checkboxOptions.dataType}
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
            />
            <WizardSelectField
              name="user_group"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.userGroupLabel"
              descriptionKey="pages.wizard.fields.userGroupDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              options={selectOptions.userGroup}
            />
            <WizardSelectField
              name="user_impact"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.userImpactLabel"
              descriptionKey="pages.wizard.fields.userImpactDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              options={selectOptions.userImpact}
            />
          </>
        ) : null}

        {currentStep === 3 ? (
          <>
            <div className="space-y-3">
              <WizardSelectField
                name="decision_role"
                disabled={effectiveIsReadOnly}
                labelKey="pages.wizard.fields.decisionRoleLabel"
                descriptionKey="pages.wizard.fields.decisionRoleDescription"
                extraDescriptionKey="pages.wizard.fields.decisionRoleExamples"
                onBlur={onFieldBlur}
                onValueChange={onFieldChange}
                options={selectOptions.decisionRole}
              />
              <WizardHelperButton onClick={() => onHelperOpen("decision")} />
            </div>
            {answers.decision_role !== "NO_AUTONOMOUS_DECISION" ? (
              <div className="space-y-3">
                <WizardSelectField
                  name="human_oversight"
                  disabled={effectiveIsReadOnly}
                  labelKey="pages.wizard.fields.humanOversightLabel"
                  descriptionKey="pages.wizard.fields.humanOversightDescription"
                  onBlur={onFieldBlur}
                  onValueChange={onFieldChange}
                  options={selectOptions.humanOversight}
                />
                <WizardHelperButton onClick={() => onHelperOpen("oversight")} />
              </div>
            ) : null}
          </>
        ) : null}

        {currentStep === 4 ? (
          <div className="space-y-3">
            <WizardSelectField
              name="external_llm_usage"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.externalLlmUsageLabel"
              descriptionKey="pages.wizard.fields.externalLlmUsageDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              fromInputValue={(value) => value === "yes"}
              toInputValue={(value) =>
                toBooleanSelectValue(
                  typeof value === "boolean" ? value : undefined,
                )
              }
              options={selectOptions.externalProvider}
            />
            <WizardHelperButton onClick={() => onHelperOpen("provider")} />
          </div>
        ) : null}

        {currentStep === 5 ? (
          <>
            <WizardSelectField
              name="biometric_indicator"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.biometricIndicatorLabel"
              descriptionKey="pages.wizard.fields.biometricIndicatorDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              options={selectOptions.yesNoUnknown}
            />
            <WizardSelectField
              name="high_impact_indicator"
              disabled={effectiveIsReadOnly}
              labelKey="pages.wizard.fields.highImpactIndicatorLabel"
              descriptionKey="pages.wizard.fields.highImpactIndicatorDescription"
              onBlur={onFieldBlur}
              onValueChange={onFieldChange}
              options={selectOptions.yesNoUnknown}
            />
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
