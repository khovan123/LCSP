import type { ZodError } from "zod";

import {
  selectOptions,
  WIZARD_LOCAL_STORAGE_PREFIX,
} from "@/features/wizard/config/wizard-config";
import {
  wizardPreScreenSchema,
  wizardStepSchemas,
  wizardSubmitSchema,
} from "@/features/wizard/schemas/wizard-form.schema";
import type { WizardAnswers } from "@/features/wizard/types/wizard.types";
import type { WizardHelperKey } from "@/features/wizard/types/wizard-form.types";

import { t } from "./wizard-i18n";

export const sectionCardClassName = "border-border bg-card shadow-sm";

export function getHelperCopy(helperKey: WizardHelperKey) {
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

export function validateStep(stepIndex: number, answers: WizardAnswers) {
  const result = wizardStepSchemas[stepIndex]?.safeParse(answers);
  if (!result || result.success) {
    return {};
  }

  return getFieldErrors(result.error);
}

export function validatePreScreen(answers: WizardAnswers) {
  const result = wizardPreScreenSchema.safeParse(answers);
  if (result.success) {
    return {};
  }

  return getFieldErrors(result.error);
}

export function validateAllSteps(answers: WizardAnswers) {
  const result = wizardSubmitSchema.safeParse(answers);
  if (result.success) {
    return {};
  }

  return getFieldErrors(result.error);
}

export function isDetailedPhaseReady(answers: WizardAnswers) {
  return (
    hasTextValue(answers.ps_001_ai_scope) &&
    hasArrayValue(answers.ps_002_affected_people) &&
    hasTextValue(answers.ps_003_personal_or_sensitive_data) &&
    hasTextValue(answers.ps_004_decision_importance)
  );
}

export function isStepComplete(stepIndex: number, answers: WizardAnswers) {
  return Object.keys(validateStep(stepIndex, answers)).length === 0;
}

export function readLocalDraft(assessmentId: string): WizardAnswers {
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

export function writeLocalDraft(assessmentId: string, answers: WizardAnswers) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    `${WIZARD_LOCAL_STORAGE_PREFIX}:${assessmentId}`,
    JSON.stringify(answers),
  );
}

export function clearLocalDraft(assessmentId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(
    `${WIZARD_LOCAL_STORAGE_PREFIX}:${assessmentId}`,
  );
}

export function normalizeAnswers(answers: WizardAnswers): WizardAnswers {
  return {
    ...answers,
    data_type: Array.isArray(answers.data_type) ? answers.data_type : [],
    ps_002_affected_people: Array.isArray(answers.ps_002_affected_people)
      ? answers.ps_002_affected_people
      : [],
  };
}

export function serializeAnswers(answers: WizardAnswers): WizardAnswers {
  return {
    ...answers,
    human_oversight:
      answers.decision_role === "NO_AUTONOMOUS_DECISION"
        ? "NOT_APPLICABLE"
        : answers.human_oversight,
  };
}

export function toBooleanSelectValue(value: boolean | undefined) {
  if (value === true) {
    return "yes";
  }

  if (value === false) {
    return "no";
  }

  return "";
}

export function getSummaryItems(answers: WizardAnswers) {
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
      value: getOptionDisplayLabel(selectOptions.sector, answers.sector),
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
      value: getOptionDisplayLabel(selectOptions.userGroup, answers.user_group),
    });
  }
  if (answers.user_impact) {
    items.push({
      label: t("pages.wizard.fields.userImpactLabel"),
      value: getOptionDisplayLabel(
        selectOptions.userImpact,
        answers.user_impact,
      ),
    });
  }
  if (answers.decision_role) {
    items.push({
      label: t("pages.wizard.fields.decisionRoleLabel"),
      value: getOptionDisplayLabel(
        selectOptions.decisionRole,
        answers.decision_role,
      ),
    });
  }
  if (answers.human_oversight) {
    items.push({
      label: t("pages.wizard.fields.humanOversightLabel"),
      value: getOptionDisplayLabel(
        selectOptions.humanOversight,
        answers.human_oversight,
      ),
    });
  }
  if (typeof answers.external_llm_usage === "boolean") {
    items.push({
      label: t("pages.wizard.fields.externalLlmUsageLabel"),
      value: getOptionDisplayLabel(
        selectOptions.externalProvider,
        toBooleanSelectValue(answers.external_llm_usage),
      ),
    });
  }
  if (answers.biometric_indicator) {
    items.push({
      label: t("pages.wizard.fields.biometricIndicatorLabel"),
      value: getOptionDisplayLabel(
        selectOptions.yesNoUnknown,
        answers.biometric_indicator,
      ),
    });
  }
  if (answers.high_impact_indicator) {
    items.push({
      label: t("pages.wizard.fields.highImpactIndicatorLabel"),
      value: getOptionDisplayLabel(
        selectOptions.yesNoUnknown,
        answers.high_impact_indicator,
      ),
    });
  }

  return items;
}

function hasTextValue(value: string | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasArrayValue(value: string[] | undefined) {
  return Array.isArray(value) && value.length > 0;
}

function getFieldErrors(error: ZodError) {
  return error.issues.reduce<Record<string, string>>((allErrors, issue) => {
    const fieldName = issue.path[0];
    if (typeof fieldName === "string" && !(fieldName in allErrors)) {
      allErrors[fieldName] = issue.message;
    }

    return allErrors;
  }, {});
}

function getOptionDisplayLabel(
  options: ReadonlyArray<{ value: string; labelKey: string }>,
  value: string | undefined,
): string {
  if (!value) {
    return "";
  }

  const option = options.find((entry) => entry.value === value);
  return option ? t(option.labelKey) : value;
}
