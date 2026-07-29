"use client";

import {
  startTransition,
  useEffect,
  useEffectEvent,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";
import { BadgeCheck, CircleHelp, LoaderCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { appLocale } from "@/lib/locale";
import {
  getWizardAssessment,
  saveWizardDraft,
  submitWizard,
} from "@/lib/api/wizard-client";
import {
  checkboxOptions,
  selectOptions,
  wizardSteps,
  WIZARD_LOCAL_STORAGE_PREFIX,
} from "@/features/wizard/config/wizard-config";
import type {
  WizardAnswers,
  WizardAssessment,
} from "@/features/wizard/types/wizard.types";

const controlClassName =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30";
const sectionCardClassName = "border-border bg-card shadow-sm";

export function WizardFormPage({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<WizardAssessment | null>(null);
  const [answers, setAnswers] = useState<WizardAnswers>({});
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusKey, setStatusKey] = useState<string | null>(null);
  const [rootErrorKey, setRootErrorKey] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [helperKey, setHelperKey] = useState<
    "decision" | "oversight" | "provider" | null
  >(null);

  const saveDraftEvent = useEffectEvent(async (draftAnswers: WizardAnswers) => {
    setIsSaving(true);
    setStatusKey("pages.wizard.draftSaving");
    const outcome = await saveWizardDraft(assessmentId, draftAnswers);
    setIsSaving(false);

    if (outcome.kind === "redirect") {
      router.replace(outcome.location);
      return;
    }

    if (outcome.kind === "already_submitted") {
      setIsReadOnly(true);
      setRootErrorKey("pages.wizard.errors.alreadySubmitted");
      return;
    }

    if (outcome.kind === "error") {
      setRootErrorKey(outcome.detailKey);
      setStatusKey("pages.wizard.draftDirty");
      return;
    }

    setRootErrorKey(null);
    setStatusKey("pages.wizard.draftSaved");
  });

  useEffect(() => {
    let isActive = true;

    async function loadAssessment() {
      const outcome = await getWizardAssessment(assessmentId);
      if (!isActive) {
        return;
      }

      if (outcome.kind === "redirect") {
        router.replace(outcome.location);
        return;
      }

      if (outcome.kind === "error") {
        setRootErrorKey(outcome.detailKey);
        setIsLoading(false);
        return;
      }

      const localDraft = readLocalDraft(assessmentId);
      setAssessment(outcome.assessment);
      setAnswers(normalizeAnswers(localDraft));
      setIsReadOnly(outcome.assessment.wizardStatus === "SUBMITTED");
      setIsHydrated(true);
      setIsLoading(false);
      setStatusKey(
        outcome.assessment.wizardStatus === "SUBMITTED"
          ? null
          : "pages.wizard.draftSaved",
      );
    }

    void loadAssessment();
    return () => {
      isActive = false;
    };
  }, [assessmentId, router]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    writeLocalDraft(assessmentId, answers);
  }, [answers, assessmentId, isHydrated]);

  useEffect(() => {
    if (!isHydrated || isReadOnly) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void saveDraftEvent(serializeAnswers(answers));
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [answers, isHydrated, isReadOnly, saveDraftEvent]);

  function updateAnswer<K extends keyof WizardAnswers>(
    key: K,
    value: WizardAnswers[K],
  ) {
    setRootErrorKey(null);
    setStatusKey("pages.wizard.draftDirty");
    setFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[key];
      return nextErrors;
    });

    startTransition(() => {
      setAnswers((current) => {
        const next = { ...current, [key]: value };

        if (
          key === "decision_role" &&
          value === "NO_AUTONOMOUS_DECISION"
        ) {
          next.human_oversight = "NOT_APPLICABLE";
        }

        return next;
      });
    });
  }

  function toggleCheckboxValue(
    key: "ps_002_affected_people" | "data_type",
    value: string,
  ) {
    const currentValues = answers[key] ?? [];
    const nextValues = currentValues.includes(value)
      ? currentValues.filter((entry) => entry !== value)
      : [...currentValues, value];
    updateAnswer(key, nextValues);
  }

  async function handleSaveAndContinue() {
    const errors = validateStep(currentStep, answers);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    await saveDraftEvent(serializeAnswers(answers));
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length - 1));
  }

  async function handleSubmit() {
    const errors = validateAllSteps(answers);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setRootErrorKey("pages.wizard.errors.submitFailed");
      return;
    }

    setIsSubmitting(true);
    const outcome = await submitWizard(assessmentId, serializeAnswers(answers));
    setIsSubmitting(false);

    if (outcome.kind === "redirect") {
      router.replace(outcome.location);
      return;
    }

    if (outcome.kind === "already_submitted") {
      setIsReadOnly(true);
      setRootErrorKey("pages.wizard.errors.alreadySubmitted");
      return;
    }

    if (outcome.kind === "error") {
      setRootErrorKey(outcome.detailKey);
      return;
    }

    setIsReadOnly(true);
    setStatusKey(null);
    router.replace(`/assessments/${assessmentId}/readiness`);
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-72 w-full max-w-6xl items-center justify-center px-4 py-10 lg:px-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("pages.wizard.loading")}</CardTitle>
            <CardDescription>
              {t("pages.wizard.loadingDetail")}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const helperCopy = getHelperCopy(helperKey);

  return (
    <div className="px-4 py-6 text-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
        <aside className="flex w-full flex-col gap-4 lg:max-w-xs">
          <Card className={sectionCardClassName}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <Badge variant="secondary">
                  {t("pages.wizard.progressLabel")}
                </Badge>
                {isReadOnly ? (
                  <Badge>{t("pages.wizard.readOnlyBadge")}</Badge>
                ) : null}
              </div>
              <CardTitle>{t("pages.wizard.pageTitle")}</CardTitle>
              <CardDescription>
                {assessment?.name ?? t("pages.wizard.pageDescription")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <StatusRow
                label={t("pages.wizard.preScreenBadge")}
                active={currentStep === 0}
                complete={isDetailedPhaseReady(answers)}
              />
              {wizardSteps.map((step, index) => (
                <StatusRow
                  key={step.id}
                  label={t(step.titleKey)}
                  active={currentStep === index}
                  complete={isStepComplete(index, answers)}
                />
              ))}
              {statusKey ? (
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}
                  <span>{t(statusKey)}</span>
                </div>
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

        <main className="flex min-w-0 flex-1 flex-col gap-6">
          {rootErrorKey ? (
            <Alert variant="destructive">
              <AlertTitle>{t("pages.wizard.errors.loadTitle")}</AlertTitle>
              <AlertDescription>{t(rootErrorKey)}</AlertDescription>
            </Alert>
          ) : null}

          {isReadOnly ? (
            <ReadOnlySummary
              answers={answers}
              onBack={() => router.replace("/workspace")}
              onNext={() => router.replace(`/assessments/${assessmentId}/classification`)}
            />
          ) : (
            <>
              {currentStep === 0 ? (
                <Card className={sectionCardClassName}>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <Badge variant="outline">
                        {t("pages.wizard.preScreenBadge")}
                      </Badge>
                    </div>
                    <CardTitle>{t("pages.wizard.preScreenTitle")}</CardTitle>
                    <CardDescription>
                      {t("pages.wizard.preScreenDescription")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-6">
                    <SelectField
                      labelKey="pages.wizard.fields.preAiScopeLabel"
                      descriptionKey="pages.wizard.fields.preAiScopeDescription"
                      value={answers.ps_001_ai_scope ?? ""}
                      onChange={(value) => updateAnswer("ps_001_ai_scope", value)}
                      options={selectOptions.yesNoUnknown}
                    />
                    <CheckboxField
                      labelKey="pages.wizard.fields.preAffectedPeopleLabel"
                      descriptionKey="pages.wizard.fields.preAffectedPeopleDescription"
                      selected={answers.ps_002_affected_people ?? []}
                      options={checkboxOptions.affectedPeople}
                      onToggle={(value) =>
                        toggleCheckboxValue("ps_002_affected_people", value)
                      }
                    />
                    <SelectField
                      labelKey="pages.wizard.fields.prePersonalDataLabel"
                      descriptionKey="pages.wizard.fields.prePersonalDataDescription"
                      value={answers.ps_003_personal_or_sensitive_data ?? ""}
                      onChange={(value) =>
                        updateAnswer("ps_003_personal_or_sensitive_data", value)
                      }
                      options={selectOptions.yesNoUnknown}
                    />
                    <SelectField
                      labelKey="pages.wizard.fields.preDecisionImportanceLabel"
                      descriptionKey="pages.wizard.fields.preDecisionImportanceDescription"
                      value={answers.ps_004_decision_importance ?? ""}
                      onChange={(value) =>
                        updateAnswer("ps_004_decision_importance", value)
                      }
                      options={selectOptions.yesNoUnknown}
                    />
                  </CardContent>
                </Card>
              ) : null}

              <Card className={sectionCardClassName}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <Badge variant="secondary">
                      {t("pages.wizard.detailedBadge")}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {currentStep + 1}/{wizardSteps.length}
                    </span>
                  </div>
                  <CardTitle>
                    {t(wizardSteps[currentStep].titleKey)}
                  </CardTitle>
                  <CardDescription>
                    {t("pages.wizard.pageDescription")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-6">
                  {currentStep === 0 ? (
                    <>
                      <TextAreaField
                        labelKey="pages.wizard.fields.purposeLabel"
                        descriptionKey="pages.wizard.fields.purposeDescription"
                        placeholderKey="pages.wizard.fields.purposePlaceholder"
                        value={answers.purpose ?? ""}
                        errorKey={fieldErrors.purpose}
                        onChange={(value) => updateAnswer("purpose", value)}
                      />
                      <SelectField
                        labelKey="pages.wizard.fields.sectorLabel"
                        descriptionKey="pages.wizard.fields.sectorDescription"
                        value={answers.sector ?? ""}
                        errorKey={fieldErrors.sector}
                        onChange={(value) => updateAnswer("sector", value)}
                        options={selectOptions.sector}
                      />
                    </>
                  ) : null}

                  {currentStep === 1 ? (
                    <>
                      <CheckboxField
                        labelKey="pages.wizard.fields.dataTypeLabel"
                        descriptionKey="pages.wizard.fields.dataTypeDescription"
                        selected={answers.data_type ?? []}
                        errorKey={fieldErrors.data_type}
                        options={checkboxOptions.dataType}
                        onToggle={(value) => toggleCheckboxValue("data_type", value)}
                      />
                      <SelectField
                        labelKey="pages.wizard.fields.userGroupLabel"
                        descriptionKey="pages.wizard.fields.userGroupDescription"
                        value={answers.user_group ?? ""}
                        errorKey={fieldErrors.user_group}
                        onChange={(value) => updateAnswer("user_group", value)}
                        options={selectOptions.userGroup}
                      />
                      <SelectField
                        labelKey="pages.wizard.fields.userImpactLabel"
                        descriptionKey="pages.wizard.fields.userImpactDescription"
                        value={answers.user_impact ?? ""}
                        errorKey={fieldErrors.user_impact}
                        onChange={(value) => updateAnswer("user_impact", value)}
                        options={selectOptions.userImpact}
                      />
                    </>
                  ) : null}

                  {currentStep === 2 ? (
                    <>
                      <div className="space-y-3">
                        <SelectField
                          labelKey="pages.wizard.fields.decisionRoleLabel"
                          descriptionKey="pages.wizard.fields.decisionRoleDescription"
                          extraDescriptionKey="pages.wizard.fields.decisionRoleExamples"
                          value={answers.decision_role ?? ""}
                          errorKey={fieldErrors.decision_role}
                          onChange={(value) => updateAnswer("decision_role", value)}
                          options={selectOptions.decisionRole}
                        />
                        <HelperButton onClick={() => setHelperKey("decision")} />
                      </div>
                      {answers.decision_role !== "NO_AUTONOMOUS_DECISION" ? (
                        <div className="space-y-3">
                          <SelectField
                            labelKey="pages.wizard.fields.humanOversightLabel"
                            descriptionKey="pages.wizard.fields.humanOversightDescription"
                            value={answers.human_oversight ?? ""}
                            errorKey={fieldErrors.human_oversight}
                            onChange={(value) =>
                              updateAnswer("human_oversight", value)
                            }
                            options={selectOptions.humanOversight}
                          />
                          <HelperButton onClick={() => setHelperKey("oversight")} />
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  {currentStep === 3 ? (
                    <div className="space-y-3">
                      <SelectField
                        labelKey="pages.wizard.fields.externalLlmUsageLabel"
                        descriptionKey="pages.wizard.fields.externalLlmUsageDescription"
                        value={toBooleanSelectValue(answers.external_llm_usage)}
                        errorKey={fieldErrors.external_llm_usage}
                        onChange={(value) =>
                          updateAnswer("external_llm_usage", value === "yes")
                        }
                        options={selectOptions.externalProvider}
                      />
                      <HelperButton onClick={() => setHelperKey("provider")} />
                    </div>
                  ) : null}

                  {currentStep === 4 ? (
                    <>
                      <SelectField
                        labelKey="pages.wizard.fields.biometricIndicatorLabel"
                        descriptionKey="pages.wizard.fields.biometricIndicatorDescription"
                        value={answers.biometric_indicator ?? ""}
                        onChange={(value) =>
                          updateAnswer("biometric_indicator", value)
                        }
                        options={selectOptions.yesNoUnknown}
                      />
                      <SelectField
                        labelKey="pages.wizard.fields.highImpactIndicatorLabel"
                        descriptionKey="pages.wizard.fields.highImpactIndicatorDescription"
                        value={answers.high_impact_indicator ?? ""}
                        onChange={(value) =>
                          updateAnswer("high_impact_indicator", value)
                        }
                        options={selectOptions.yesNoUnknown}
                      />
                    </>
                  ) : null}
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    currentStep === 0
                      ? router.replace("/workspace")
                      : setCurrentStep((step) => Math.max(step - 1, 0))
                  }
                >
                  {currentStep === 0
                    ? t("pages.wizard.actions.backToWorkspace")
                    : t("pages.wizard.actions.previous")}
                </Button>
                <div className="flex flex-col gap-3 sm:flex-row">
                  {currentStep === 0 ? (
                    <Button onClick={() => setCurrentStep(1)}>
                      {t("pages.wizard.actions.continueToDetailed")}
                    </Button>
                  ) : currentStep < wizardSteps.length - 1 ? (
                    <Button onClick={() => void handleSaveAndContinue()}>
                      {t("pages.wizard.actions.saveAndContinue")}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => void handleSubmit()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      {t("pages.wizard.actions.submit")}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <Sheet open={helperKey !== null} onOpenChange={(open) => !open && setHelperKey(null)}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>{t(helperCopy.titleKey)}</SheetTitle>
            <SheetDescription>
              {t(helperCopy.bodyKey)}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SelectField({
  labelKey,
  descriptionKey,
  extraDescriptionKey,
  value,
  errorKey,
  onChange,
  options,
}: {
  labelKey: string;
  descriptionKey: string;
  extraDescriptionKey?: string;
  value: string;
  errorKey?: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; labelKey: string }>;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {t(labelKey)}
      </label>
      <p className="text-sm text-muted-foreground">
        {t(descriptionKey)}
      </p>
      {extraDescriptionKey ? (
        <p className="text-sm text-muted-foreground">
          {t(extraDescriptionKey)}
        </p>
      ) : null}
      <select
        className={controlClassName}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {t(option.labelKey)}
          </option>
        ))}
      </select>
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey)}</p> : null}
    </div>
  );
}

function CheckboxField({
  labelKey,
  descriptionKey,
  selected,
  errorKey,
  options,
  onToggle,
}: {
  labelKey: string;
  descriptionKey: string;
  selected: string[];
  errorKey?: string;
  options: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {t(labelKey)}
        </p>
        <p className="text-sm text-muted-foreground">
          {t(descriptionKey)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {options.map((optionKey) => {
          const optionLabel = t(optionKey);
          const checked = selected.includes(optionLabel);

          return (
            <label
              key={optionKey}
              className="flex items-start gap-3 rounded-lg border bg-muted/35 px-3 py-3 text-sm"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(optionLabel)}
                className="mt-1"
              />
              <span>{optionLabel}</span>
            </label>
          );
        })}
      </div>
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey)}</p> : null}
    </div>
  );
}

function TextAreaField({
  labelKey,
  descriptionKey,
  placeholderKey,
  value,
  errorKey,
  onChange,
}: {
  labelKey: string;
  descriptionKey: string;
  placeholderKey: string;
  value: string;
  errorKey?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        {t(labelKey)}
      </label>
      <p className="text-sm text-muted-foreground">
        {t(descriptionKey)}
      </p>
      <textarea
        className={`${controlClassName} min-h-32 resize-y`}
        value={value}
        placeholder={t(placeholderKey)}
        onChange={(event) => onChange(event.target.value)}
      />
      {errorKey ? <p className="text-sm text-destructive">{t(errorKey)}</p> : null}
    </div>
  );
}

function HelperButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="w-fit px-0 text-teal-700" onClick={onClick}>
      <CircleHelp className="size-4" />
      {t("pages.wizard.helperButton")}
    </Button>
  );
}

function StatusRow({
  label,
  active,
  complete,
}: {
  label: string;
  active: boolean;
  complete: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
        active
          ? "bg-teal-50 text-teal-800"
          : complete
            ? "bg-emerald-50 text-emerald-700"
            : "bg-muted text-muted-foreground"
      }`}
    >
      <span>{label}</span>
      {complete ? <BadgeCheck className="size-4" /> : null}
    </div>
  );
}

function ReadOnlySummary({
  answers,
  onBack,
  onNext,
}: {
  answers: WizardAnswers;
  onBack: () => void;
  onNext: () => void;
}) {
  const summaryItems = getSummaryItems(answers);

  return (
    <>
      <Card className={sectionCardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge>{t("pages.wizard.readOnlyBadge")}</Badge>
          </div>
          <CardTitle>{t("pages.wizard.readOnlyTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.readOnlyDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className={sectionCardClassName}>
        <CardHeader>
          <CardTitle>{t("pages.wizard.summaryTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.summaryDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {summaryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pages.wizard.readOnlyEmpty")}
            </p>
          ) : (
            summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border px-4 py-3">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.value}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("pages.wizard.actions.backToWorkspace")}
        </Button>
        <Button onClick={onNext}>
          {t("pages.wizard.actions.openClassification")}
        </Button>
      </div>
    </>
  );
}

function getHelperCopy(helperKey: "decision" | "oversight" | "provider" | null) {
  switch (helperKey) {
    case "decision":
      return {
        titleKey: "pages.wizard.helpers.decisionTitle" as const,
        bodyKey: "pages.wizard.helpers.decisionBody" as const,
      };
    case "oversight":
      return {
        titleKey: "pages.wizard.helpers.humanOversightTitle" as const,
        bodyKey: "pages.wizard.helpers.humanOversightBody" as const,
      };
    case "provider":
      return {
        titleKey: "pages.wizard.helpers.providerTitle" as const,
        bodyKey: "pages.wizard.helpers.providerBody" as const,
      };
    default:
      return {
        titleKey: "pages.wizard.helperTitle" as const,
        bodyKey: "pages.wizard.helperDescription" as const,
      };
  }
}

function validateStep(stepIndex: number, answers: WizardAnswers) {
  const errors: Record<string, string> = {};

  if (stepIndex === 0) {
    if (!hasTextValue(answers.purpose)) {
      errors.purpose = "pages.wizard.errors.purposeRequired";
    }
    if (!hasTextValue(answers.sector)) {
      errors.sector = "pages.wizard.errors.sectorRequired";
    }
  }

  if (stepIndex === 1) {
    if (!hasArrayValue(answers.data_type)) {
      errors.data_type = "pages.wizard.errors.dataTypeRequired";
    }
    if (!hasTextValue(answers.user_group)) {
      errors.user_group = "pages.wizard.errors.userGroupRequired";
    }
    if (!hasTextValue(answers.user_impact)) {
      errors.user_impact = "pages.wizard.errors.userImpactRequired";
    }
  }

  if (stepIndex === 2) {
    if (!hasTextValue(answers.decision_role)) {
      errors.decision_role = "pages.wizard.errors.decisionRoleRequired";
    }
    if (
      answers.decision_role !== "NO_AUTONOMOUS_DECISION" &&
      !hasTextValue(answers.human_oversight)
    ) {
      errors.human_oversight = "pages.wizard.errors.humanOversightRequired";
    }
  }

  if (stepIndex === 3 && typeof answers.external_llm_usage !== "boolean") {
    errors.external_llm_usage = "pages.wizard.errors.externalProviderRequired";
  }

  return errors;
}

function validateAllSteps(answers: WizardAnswers) {
  return wizardSteps.reduce<Record<string, string>>((allErrors, _, index) => {
    Object.assign(allErrors, validateStep(index, answers));
    return allErrors;
  }, {});
}

function isDetailedPhaseReady(answers: WizardAnswers) {
  return (
    hasTextValue(answers.ps_001_ai_scope) &&
    hasArrayValue(answers.ps_002_affected_people) &&
    hasTextValue(answers.ps_003_personal_or_sensitive_data) &&
    hasTextValue(answers.ps_004_decision_importance)
  );
}

function isStepComplete(stepIndex: number, answers: WizardAnswers) {
  return Object.keys(validateStep(stepIndex, answers)).length === 0;
}

function hasTextValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArrayValue(value: string[] | undefined) {
  return Array.isArray(value) && value.length > 0;
}

function readLocalDraft(assessmentId: string): WizardAnswers {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(
      `${WIZARD_LOCAL_STORAGE_PREFIX}:${assessmentId}`,
    );

    if (!raw) {
      return {};
    }

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) {
      return {};
    }

    return parsed as WizardAnswers;
  } catch {
    return {};
  }
}

function writeLocalDraft(assessmentId: string, answers: WizardAnswers) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${WIZARD_LOCAL_STORAGE_PREFIX}:${assessmentId}`,
    JSON.stringify(answers),
  );
}

function normalizeAnswers(answers: WizardAnswers): WizardAnswers {
  return {
    ...answers,
    data_type: Array.isArray(answers.data_type) ? answers.data_type : [],
    ps_002_affected_people: Array.isArray(answers.ps_002_affected_people)
      ? answers.ps_002_affected_people
      : [],
  };
}

function serializeAnswers(answers: WizardAnswers): WizardAnswers {
  return {
    ...answers,
    human_oversight:
      answers.decision_role === "NO_AUTONOMOUS_DECISION"
        ? "NOT_APPLICABLE"
        : answers.human_oversight,
  };
}

function toBooleanSelectValue(value: boolean | undefined) {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  return "";
}

function getSummaryItems(answers: WizardAnswers) {
  const items: Array<{ label: string; value: string }> = [];

  if (answers.purpose) {
    items.push({
      label: t("pages.wizard.fields.purposeLabel"),
      value: answers.purpose,
    });
  }
  if (answers.sector) {
    items.push({
      label: t("pages.wizard.fields.sectorLabel"),
      value: answers.sector,
    });
  }
  if (answers.data_type?.length) {
    items.push({
      label: t("pages.wizard.fields.dataTypeLabel"),
      value: answers.data_type.join(", "),
    });
  }
  if (answers.user_group) {
    items.push({
      label: t("pages.wizard.fields.userGroupLabel"),
      value: answers.user_group,
    });
  }
  if (answers.user_impact) {
    items.push({
      label: t("pages.wizard.fields.userImpactLabel"),
      value: answers.user_impact,
    });
  }
  if (answers.decision_role) {
    items.push({
      label: t("pages.wizard.fields.decisionRoleLabel"),
      value: answers.decision_role,
    });
  }
  if (answers.human_oversight) {
    items.push({
      label: t("pages.wizard.fields.humanOversightLabel"),
      value: answers.human_oversight,
    });
  }

  return items;
}

function t(key: string) {
  return t(key as Parameters<typeof resolveMessage>[1]);
}
