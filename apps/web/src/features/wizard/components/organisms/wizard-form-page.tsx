"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { WIZARD_STATUS_CODES } from "@lcsp/contracts/assessment";
import type { WizardAnswer } from "@lcsp/contracts/wizard";
import { FormProvider, useForm, useWatch } from "react-hook-form";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WizardActiveStepCard } from "@/features/wizard/components/organisms/wizard-active-step-card";
import { WizardHelperSheet } from "@/features/wizard/components/organisms/wizard-helper-sheet";
import { WizardNavigationActions } from "@/features/wizard/components/organisms/wizard-navigation-actions";
import { WizardProgressSidebar } from "@/features/wizard/components/organisms/wizard-progress-sidebar";
import { WizardReadOnlySummary } from "@/features/wizard/components/organisms/wizard-read-only-summary";
import { wizardSteps } from "@/features/wizard/config/wizard-config";
import {
  clearLocalDraft,
  isDetailedPhaseReady,
  isStepComplete,
  normalizeAnswers,
  readLocalDraft,
  serializeAnswers,
  validateAllSteps,
  validatePreScreen,
  validateStep,
  writeLocalDraft,
} from "@/features/wizard/lib/wizard-form";
import {
  getWizardAgentClarificationPrompts,
  toWizardAgentClarificationPrompts,
} from "@/features/wizard/lib/wizard-agent-clarification";
import type { WizardAgentClarificationPrompt } from "@/features/wizard/lib/wizard-agent-clarification";
import { t } from "@/features/wizard/lib/wizard-i18n";
import { useWorkspaceRuntime } from "@/features/workspace/components/organisms/workspace-runtime-provider";
import { wizardDraftSchema } from "@/features/wizard/schemas/wizard-form.schema";
import type { WizardFormValues } from "@/features/wizard/schemas/wizard-form.schema";
import type { WizardHelperKey } from "@/features/wizard/types/wizard-form.types";
import type { WizardFormPageProps } from "@/features/wizard/types/component-props.types";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";
import {
  useSaveWizardDraftMutation,
  useSubmitWizardMutation,
  useGenerateWizardClarificationQuestionsMutation,
  useWizardAssessmentQuery,
  useReadinessStatusQuery,
} from "@/lib/api/assessment-queries";

export function WizardFormPage({ assessmentId }: WizardFormPageProps) {
  const router = useRouter();
  const runtime = useWorkspaceRuntime();
  const assessmentQuery = useWizardAssessmentQuery(assessmentId);
  const readinessQuery = useReadinessStatusQuery(assessmentId);
  const saveDraftMutation = useSaveWizardDraftMutation(assessmentId);
  const submitWizardMutation = useSubmitWizardMutation(assessmentId);
  const generateClarificationMutation =
    useGenerateWizardClarificationQuestionsMutation(assessmentId);
  const [initialAnswers] = useState<WizardFormValues>(() =>
    normalizeAnswers(readLocalDraft(assessmentId)),
  );
  const form = useForm<WizardFormValues>({
    resolver: zodResolver(wizardDraftSchema),
    defaultValues: initialAnswers,
  });
  const answers = normalizeAnswers(
    useWatch({ control: form.control }) ?? initialAnswers,
  );
  const runtimeAgentClarificationPrompts = getWizardAgentClarificationPrompts(
    runtime.getAssessmentRuntime(assessmentId).recentActivity,
  );
  const [liveAgentClarificationPrompts, setLiveAgentClarificationPrompts] =
    useState<WizardAgentClarificationPrompt[]>([]);
  const agentClarificationPrompts = mergeAgentClarificationPrompts(
    liveAgentClarificationPrompts,
    runtimeAgentClarificationPrompts,
  );
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusKey, setStatusKey] = useState<string | null>(null);
  const [rootErrorKey, setRootErrorKey] = useState<string | null>(null);
  const [helperKey, setHelperKey] = useState<WizardHelperKey>(null);

  const lastSavedAnswersRef = useRef<string>(
    JSON.stringify(serializeAnswers(initialAnswers)),
  );
  const latestAnswersRef = useRef<WizardAnswers>(initialAnswers);

  async function saveDraftEvent(draftAnswers: WizardAnswer[]) {
    const serialized = JSON.stringify(draftAnswers);
    if (serialized === lastSavedAnswersRef.current) {
      return;
    }

    setStatusKey("pages.wizard.draftSaving");
    const outcome = await saveDraftMutation.mutateAsync(draftAnswers);

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

    lastSavedAnswersRef.current = serialized;
    setRootErrorKey(null);
    setStatusKey("pages.wizard.draftSaved");
  }

  const assessment =
    assessmentQuery.data?.kind === "loaded"
      ? assessmentQuery.data.assessment
      : null;
  const readinessViewModel =
    readinessQuery.data?.kind === "loaded" ? readinessQuery.data.data : null;
  const isRepoConnected = readinessViewModel
    ? !readinessViewModel.missingEvidence.some(
        (e) => e.type === "repository_connection",
      )
    : true;

  const queryErrorKey =
    assessmentQuery.data?.kind === "error"
      ? assessmentQuery.data.detailKey
      : null;
  const effectiveIsReadOnly =
    isReadOnly ||
    (assessment?.wizardStatus === WIZARD_STATUS_CODES.submitted &&
      isRepoConnected);
  const effectiveStatusKey =
    statusKey ??
    (assessment && !effectiveIsReadOnly ? "pages.wizard.draftSaved" : null);
  const effectiveRootErrorKey = queryErrorKey ?? rootErrorKey;
  const isDraftComplete =
    isDetailedPhaseReady(answers) &&
    wizardSteps.every((_, index) => isStepComplete(index, answers));

  const currentStep = selectedStep ?? (effectiveIsReadOnly ? -1 : 0);

  function setCurrentStep(stepOrUpdater: number | ((prev: number) => number)) {
    if (typeof stepOrUpdater === "function") {
      setSelectedStep((prev) =>
        stepOrUpdater(prev ?? (effectiveIsReadOnly ? -1 : 0)),
      );
      return;
    }

    setSelectedStep(stepOrUpdater);
  }

  useEffect(() => {
    if (assessmentQuery.data?.kind === "redirect") {
      router.replace(assessmentQuery.data.location);
    }
  }, [assessmentQuery.data, router]);

  useEffect(() => {
    latestAnswersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    writeLocalDraft(assessmentId, answers);
  }, [answers, assessmentId]);

  useEffect(() => {
    if (
      answers.decisionRole === "NO_DECISION_SUPPORT" &&
      answers.humanReview !== "NOT_APPLICABLE"
    ) {
      form.setValue("humanReview", "NOT_APPLICABLE", {
        shouldDirty: true,
      });
      form.clearErrors("humanReview");
    }
  }, [answers.decisionRole, answers.humanReview, form]);

  function handleFieldBlur() {
    if (!assessment || effectiveIsReadOnly) {
      return;
    }

    void saveDraftEvent(serializeAnswers(latestAnswersRef.current));
  }

  function handleClearForm() {
    const empty = normalizeAnswers({});
    latestAnswersRef.current = empty;
    lastSavedAnswersRef.current = JSON.stringify(serializeAnswers(empty));
    form.reset(empty);
    form.clearErrors();
    setStatusKey(null);
    setRootErrorKey(null);
    clearLocalDraft(assessmentId);
  }

  function applyFieldErrors(errors: Record<string, string>) {
    Object.entries(errors).forEach(([fieldName, message]) => {
      form.setError(fieldName as keyof WizardFormValues, {
        type: "manual",
        message,
      });
    });
  }

  function handleFieldChange(name: keyof WizardAnswers) {
    setRootErrorKey(null);
    setStatusKey("pages.wizard.draftDirty");
    form.clearErrors(name);
  }

  async function handleAskClarification() {
    if (!assessment || effectiveIsReadOnly) {
      return;
    }

    setRootErrorKey(null);
    await saveDraftEvent(serializeAnswers(latestAnswersRef.current));
    const outcome = await generateClarificationMutation.mutateAsync(
      serializeAnswers(latestAnswersRef.current),
    );

    if (outcome.kind === "redirect") {
      router.replace(outcome.location);
      return;
    }

    if (outcome.kind === "error") {
      setRootErrorKey(outcome.detailKey);
      return;
    }

    setLiveAgentClarificationPrompts(
      toWizardAgentClarificationPrompts(outcome.questions),
    );
    setStatusKey("pages.wizard.clarification.askReady");
  }

  function handleContinueToDetailed() {
    const errors = validatePreScreen(answers);
    if (Object.keys(errors).length > 0) {
      form.clearErrors([
        "ps_001_ai_scope",
        "ps_002_affected_people",
        "ps_003_personal_or_sensitive_data",
        "ps_004_decision_importance",
      ]);
      applyFieldErrors(errors);
      return;
    }

    form.clearErrors([
      "ps_001_ai_scope",
      "ps_002_affected_people",
      "ps_003_personal_or_sensitive_data",
      "ps_004_decision_importance",
    ]);
    setCurrentStep(1);
  }

  async function handleSaveAndContinue() {
    const detailedStepIndex = currentStep - 1;
    const errors = validateStep(detailedStepIndex, answers);
    if (Object.keys(errors).length > 0) {
      form.clearErrors(wizardSteps[detailedStepIndex].fields);
      applyFieldErrors(errors);
      return;
    }

    form.clearErrors(wizardSteps[detailedStepIndex].fields);
    await saveDraftEvent(serializeAnswers(answers));
    setCurrentStep((step) => Math.min(step + 1, wizardSteps.length));
  }

  async function handleSubmit() {
    const errors = validateAllSteps(answers);
    if (Object.keys(errors).length > 0) {
      form.clearErrors();
      applyFieldErrors(errors);
      setRootErrorKey("pages.wizard.errors.submitFailed");
      return;
    }

    form.clearErrors();
    setIsSubmitting(true);
    const outcome = await submitWizardMutation.mutateAsync(
      serializeAnswers(answers),
    );
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

  if (assessmentQuery.isLoading || readinessQuery.isLoading) {
    return (
      <div className="mx-auto flex min-h-72 w-full max-w-6xl items-center justify-center px-4 py-10 lg:px-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>{t("pages.wizard.loading")}</CardTitle>
            <CardDescription>{t("pages.wizard.loadingDetail")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <FormProvider {...form}>
      <div className="px-4 py-6 text-foreground lg:px-6">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:flex-row">
          <WizardProgressSidebar
            assessmentName={assessment?.name ?? null}
            answers={answers}
            currentStep={currentStep}
            effectiveIsReadOnly={effectiveIsReadOnly}
            effectiveStatusKey={effectiveStatusKey}
            isDraftComplete={isDraftComplete}
            onSetCurrentStep={setCurrentStep}
            onClearForm={handleClearForm}
          />

          <main className="flex min-w-0 flex-1 flex-col gap-6">
            {effectiveRootErrorKey ? (
              <Alert variant="destructive">
                <AlertTitle>{t("pages.wizard.errors.loadTitle")}</AlertTitle>
                <AlertDescription>{t(effectiveRootErrorKey)}</AlertDescription>
              </Alert>
            ) : null}

            {effectiveIsReadOnly && currentStep === -1 ? (
              <WizardReadOnlySummary
                answers={answers}
                onBack={() => router.replace("/workspace")}
                onNext={() =>
                  router.replace(`/assessments/${assessmentId}/classification`)
                }
              />
            ) : (
              <>
                <WizardActiveStepCard
                  currentStep={currentStep}
                  effectiveIsReadOnly={effectiveIsReadOnly}
                  answers={answers}
                  agentClarificationPrompts={agentClarificationPrompts}
                  isAskingClarification={
                    generateClarificationMutation.isPending
                  }
                  onFieldBlur={handleFieldBlur}
                  onFieldChange={handleFieldChange}
                  onHelperOpen={(nextHelperKey) => setHelperKey(nextHelperKey)}
                  onAskClarification={() => void handleAskClarification()}
                />
                <WizardNavigationActions
                  currentStep={currentStep}
                  effectiveIsReadOnly={effectiveIsReadOnly}
                  isSubmitting={isSubmitting}
                  onBack={() =>
                    currentStep <= 0
                      ? router.replace("/workspace")
                      : setCurrentStep((step) =>
                          Math.max(step - 1, effectiveIsReadOnly ? -1 : 0),
                        )
                  }
                  onContinueToDetailed={handleContinueToDetailed}
                  onSaveAndContinue={() => void handleSaveAndContinue()}
                  onSubmit={() => void handleSubmit()}
                  onOpenSummary={() => setCurrentStep(-1)}
                  onOpenClassification={() =>
                    router.replace(
                      `/assessments/${assessmentId}/classification`,
                    )
                  }
                />
              </>
            )}
          </main>
        </div>

        <WizardHelperSheet
          helperKey={helperKey}
          onOpenChange={(open) => !open && setHelperKey(null)}
        />
      </div>
    </FormProvider>
  );
}

function mergeAgentClarificationPrompts(
  primary: WizardAgentClarificationPrompt[],
  secondary: WizardAgentClarificationPrompt[],
): WizardAgentClarificationPrompt[] {
  const seen = new Set<string>();
  const merged: WizardAgentClarificationPrompt[] = [];
  for (const prompt of [...primary, ...secondary]) {
    const key = `${prompt.targetFieldName}:${prompt.text}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(prompt);
  }
  return merged;
}
