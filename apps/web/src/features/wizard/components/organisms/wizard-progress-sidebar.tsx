"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WizardDraftStatusBadge } from "@/features/wizard/components/molecules/wizard-draft-status-badge";
import { WizardStatusRow } from "@/features/wizard/components/molecules/wizard-status-row";
import { wizardSteps } from "@/features/wizard/config/wizard-config";
import {
  isDetailedPhaseReady,
  isStepComplete,
  sectionCardClassName,
} from "@/features/wizard/lib/wizard-form";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";

type WizardProgressSidebarProps = {
  assessmentName: string | null;
  answers: WizardAnswers;
  currentStep: number;
  effectiveIsReadOnly: boolean;
  effectiveStatusKey: string | null;
  isDraftComplete: boolean;
  onSetCurrentStep: (step: number) => void;
  onClearForm: () => void;
};

export function WizardProgressSidebar({
  assessmentName,
  answers,
  currentStep,
  effectiveIsReadOnly,
  effectiveStatusKey,
  isDraftComplete,
  onSetCurrentStep,
  onClearForm,
}: WizardProgressSidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-4 lg:max-w-xs">
      <Card className={sectionCardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="secondary">{t("pages.wizard.progressLabel")}</Badge>
            {effectiveIsReadOnly ? (
              <Badge>{t("pages.wizard.readOnlyBadge")}</Badge>
            ) : null}
          </div>
          <CardTitle>{t("pages.wizard.pageTitle")}</CardTitle>
          <CardDescription>
            {assessmentName ?? t("pages.wizard.pageDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {effectiveIsReadOnly ? (
            <WizardStatusRow
              label={t("pages.wizard.summaryTitle")}
              active={currentStep === -1}
              complete={true}
              onClick={() => onSetCurrentStep(-1)}
            />
          ) : null}
          <WizardStatusRow
            label={t("pages.wizard.preScreenBadge")}
            active={currentStep === 0}
            complete={isDetailedPhaseReady(answers)}
            onClick={() => onSetCurrentStep(0)}
          />
          {wizardSteps.map((step, index) => {
            const stepNumber = index + 1;

            return (
              <WizardStatusRow
                key={step.id}
                label={t(step.titleKey)}
                active={currentStep === stepNumber}
                complete={isStepComplete(index, answers)}
                onClick={() => onSetCurrentStep(stepNumber)}
              />
            );
          })}
          {effectiveStatusKey ? (
            <WizardDraftStatusBadge
              statusKey={effectiveStatusKey}
              isDraftComplete={isDraftComplete}
            />
          ) : null}
          {!effectiveIsReadOnly ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground hover:text-destructive"
              onClick={onClearForm}
            >
              {t("pages.wizard.clearForm")}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className={sectionCardClassName}>
        <CardHeader>
          <CardTitle>{t("pages.wizard.landingTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.landingDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>{t("pages.wizard.timeEstimate")}</p>
          <p>{t("pages.wizard.readinessOnlyHint")}</p>
        </CardContent>
      </Card>
    </aside>
  );
}
