import {
  WIZARD_CHECKBOX_OPTIONS,
  WIZARD_EXPORT_SECTIONS,
  WIZARD_FIELD_CONTROLS,
  WIZARD_SELECT_OPTIONS,
  type WizardFieldControl,
} from "@lcsp/contracts/wizard";
import { enPages, viPages } from "@lcsp/i18n";

import type {
  ReadinessExportContent,
  ReadinessExportWizardAnswer,
} from "../../contracts/wizard/readiness-export.contract.js";

export type WizardCatalogLocale = "en" | "vi";

export interface ResolvedWizardOption {
  value: string;
  labelKey: string;
  label: string;
  aliases: string[];
}

export interface ResolvedWizardField {
  questionId: string;
  labelKey: string;
  label: string;
  control: WizardFieldControl;
  options: ResolvedWizardOption[];
}

export interface ResolvedWizardSection {
  id: string;
  titleKey: string;
  title: string;
  fields: ResolvedWizardField[];
}

type SelectOption = { value: string; labelKey: string };

const PAGE_MESSAGES = {
  en: enPages,
  vi: viPages,
} as const;

const LEGACY_SELECT_LABELS: Record<string, string[]> = {
  yes: ["Yes"],
  no: ["No"],
  unknown: ["Unknown"],
  UNKNOWN: ["Unknown"],
  UNCLEAR: ["Unclear", "Unknown"],
  GENERAL_BUSINESS: ["General business"],
  EMPLOYMENT_HR: ["Employment and HR"],
  FINANCE_CREDIT: ["Finance and credit"],
  EDUCATION: ["Education"],
  HEALTHCARE: ["Healthcare"],
  PUBLIC_SERVICES: ["Public services"],
  LOW: ["Limited impact", "Low impact"],
  MODERATE: ["Moderate impact"],
  SIGNIFICANT: ["Significant impact"],
  NO_DECISION_SUPPORT: ["No decision support"],
  ASSISTS_DECISION: ["Assists a decision"],
  INFORMS_DECISION: ["Informs a decision"],
  RECOMMENDS_OUTCOME: ["Recommends an outcome"],
  DIRECTLY_DRIVES_OUTCOME: ["Directly drives an outcome"],
  PRESENT: ["Present"],
  LIMITED: ["Limited"],
  ABSENT: ["Absent"],
  NOT_APPLICABLE: ["Not applicable"],
  NONE: ["None"],
  POSSIBLE: ["Possible"],
  CONFIRMED: ["Confirmed"],
};

export function resolveWizardSections(
  locale: WizardCatalogLocale,
): ResolvedWizardSection[] {
  return WIZARD_EXPORT_SECTIONS.map((section) => ({
    id: section.id,
    titleKey: section.titleKey,
    title: wizardMessage(locale, section.titleKey),
    fields: section.fields.map((field) =>
      resolveWizardField(
        field.questionId,
        field.labelKey,
        field.control,
        field.optionSet,
        locale,
      ),
    ),
  }));
}

export function findWizardAnswer(
  content: ReadinessExportContent,
  questionId: string,
): ReadinessExportWizardAnswer | undefined {
  for (const section of content.wizard_profile.sections) {
    const answer = section.answers.find(
      (candidate) => candidate.question_id === questionId,
    );
    if (answer) return answer;
  }
  return undefined;
}

export function isWizardOptionSelected(
  answer: ReadinessExportWizardAnswer | undefined,
  option: ResolvedWizardOption,
): boolean {
  if (!answer) return false;
  const selected = selectedAnswerValues(answer);
  return option.aliases.some((alias) => selected.has(normalize(alias)));
}

export function unmatchedWizardAnswerValues(
  answer: ReadinessExportWizardAnswer | undefined,
  options: ResolvedWizardOption[],
): string[] {
  if (!answer) return [];
  const optionAliases = new Set(
    options.flatMap((option) => option.aliases.map(normalize)),
  );
  return rawAnswerValues(answer).filter(
    (value) => value.length > 0 && !optionAliases.has(normalize(value)),
  );
}

export function wizardMessage(
  locale: WizardCatalogLocale,
  key: string,
): string {
  const path = key.replace(/^pages\./, "").split(".");
  let current: unknown = PAGE_MESSAGES[locale];

  for (const segment of path) {
    if (!isRecord(current) || !(segment in current)) {
      throw new Error(`Missing i18n key: ${key}`);
    }
    current = current[segment];
  }

  if (typeof current !== "string") {
    throw new Error(`i18n key is not a string: ${key}`);
  }
  return current;
}

function resolveWizardField(
  questionId: string,
  labelKey: string,
  control: WizardFieldControl,
  optionSet: string | undefined,
  locale: WizardCatalogLocale,
): ResolvedWizardField {
  return {
    questionId,
    labelKey,
    label: wizardMessage(locale, labelKey),
    control,
    options: resolveOptions(control, optionSet, locale),
  };
}

function resolveOptions(
  control: WizardFieldControl,
  optionSet: string | undefined,
  locale: WizardCatalogLocale,
): ResolvedWizardOption[] {
  if (!optionSet || control === WIZARD_FIELD_CONTROLS.textarea) return [];

  if (control === WIZARD_FIELD_CONTROLS.select) {
    const sets = WIZARD_SELECT_OPTIONS as unknown as Record<
      string,
      readonly SelectOption[]
    >;
    const options = sets[optionSet];
    if (!options)
      throw new Error(`Unknown Wizard select option set: ${optionSet}`);
    return options.map((option) => {
      const enLabel = wizardMessage("en", option.labelKey);
      const viLabel = wizardMessage("vi", option.labelKey);
      return {
        value: option.value,
        labelKey: option.labelKey,
        label: locale === "vi" ? viLabel : enLabel,
        aliases: unique([
          option.value,
          enLabel,
          viLabel,
          ...(LEGACY_SELECT_LABELS[option.value] ?? []),
        ]),
      };
    });
  }

  const sets = WIZARD_CHECKBOX_OPTIONS as unknown as Record<
    string,
    readonly string[]
  >;
  const optionKeys = sets[optionSet];
  if (!optionKeys) {
    throw new Error(`Unknown Wizard checkbox option set: ${optionSet}`);
  }
  return optionKeys.map((labelKey) => {
    const enLabel = wizardMessage("en", labelKey);
    const viLabel = wizardMessage("vi", labelKey);
    return {
      value: labelKey,
      labelKey,
      label: locale === "vi" ? viLabel : enLabel,
      aliases: unique([labelKey, enLabel, viLabel]),
    };
  });
}

function selectedAnswerValues(
  answer: ReadinessExportWizardAnswer,
): Set<string> {
  return new Set(rawAnswerValues(answer).map(normalize));
}

function rawAnswerValues(answer: ReadinessExportWizardAnswer): string[] {
  const values = answer.selected_values?.length
    ? answer.selected_values
    : answer.value
      ? [answer.value]
      : [];
  return unique(
    values.flatMap((value) =>
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).filter(
    (value) =>
      normalize(value) !== "not answered" &&
      normalize(value) !== "chưa trả lời",
  );
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
