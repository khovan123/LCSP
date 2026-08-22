import { WIZARD_FIELD_CONTROLS } from "./catalog.ts";
import type { WizardFieldControl } from "./catalog.ts";

export const WIZARD_CLARIFICATION_SCOPES = {
  preScan: "PRE_SCAN",
  postGraph: "POST_GRAPH",
} as const;

export type WizardClarificationScope =
  (typeof WIZARD_CLARIFICATION_SCOPES)[keyof typeof WIZARD_CLARIFICATION_SCOPES];

export const WIZARD_CLARIFICATION_REQUEST_KIND = "WIZARD_CONTEXT_REQUEST";

export const WIZARD_CLARIFICATION_REQUESTERS = {
  wizard: "WIZARD",
  scanner: "SCANNER",
  planner: "PLANNER",
} as const;

export type WizardClarificationRequester =
  (typeof WIZARD_CLARIFICATION_REQUESTERS)[keyof typeof WIZARD_CLARIFICATION_REQUESTERS];

export const WIZARD_CLARIFICATION_QUESTION_IDS = {
  businessProcess: "BUSINESS_PROCESS",
  useCase: "USE_CASE",
  primaryActors: "PRIMARY_ACTORS",
  businessTrigger: "BUSINESS_TRIGGER",
  expectedOutcome: "EXPECTED_OUTCOME",
  autonomyLevel: "AUTONOMY_LEVEL",
  aiPurpose: "AI_PURPOSE",
  sector: "SECTOR",
  missingGraphContext: "MISSING_GRAPH_CONTEXT",
  missingRuleScope: "MISSING_RULE_SCOPE",
  missingHumanReviewBoundary: "MISSING_HUMAN_REVIEW_BOUNDARY",
} as const;

export type WizardClarificationQuestionId =
  (typeof WIZARD_CLARIFICATION_QUESTION_IDS)[keyof typeof WIZARD_CLARIFICATION_QUESTION_IDS];

export type WizardClarificationQuestion = {
  id: WizardClarificationQuestionId;
  scope: WizardClarificationScope;
  fieldName: string;
  control: WizardFieldControl;
  labelKey: string;
  detailKey: string;
  placeholderKey?: string;
  optionSet?: string;
  required: boolean;
  collectionRuleKey: string;
};

export const WIZARD_CLARIFICATION_QUESTIONS = [
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.businessProcess,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "businessProcess",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.businessProcessLabel",
    detailKey: "pages.wizard.fields.businessProcessDescription",
    placeholderKey: "pages.wizard.fields.businessProcessPlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.businessProcess",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.useCase,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "useCase",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.useCaseLabel",
    detailKey: "pages.wizard.clarification.useCaseDetail",
    placeholderKey: "pages.wizard.fields.useCasePlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.useCase",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.primaryActors,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "primaryActors",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.primaryActorsLabel",
    detailKey: "pages.wizard.clarification.primaryActorsDetail",
    placeholderKey: "pages.wizard.fields.primaryActorsPlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.primaryActors",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.businessTrigger,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "businessTrigger",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.businessTriggerLabel",
    detailKey: "pages.wizard.clarification.businessTriggerDetail",
    placeholderKey: "pages.wizard.fields.businessTriggerPlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.businessTrigger",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.expectedOutcome,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "expectedOutcome",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.expectedOutcomeLabel",
    detailKey: "pages.wizard.clarification.expectedOutcomeDetail",
    placeholderKey: "pages.wizard.fields.expectedOutcomePlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.expectedOutcome",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.autonomyLevel,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "autonomyLevel",
    control: WIZARD_FIELD_CONTROLS.select,
    labelKey: "pages.wizard.fields.autonomyLevelLabel",
    detailKey: "pages.wizard.clarification.autonomyLevelDetail",
    optionSet: "autonomyLevel",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.autonomyLevel",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.aiPurpose,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "aiPurpose",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.fields.aiPurposeLabel",
    detailKey: "pages.wizard.fields.aiPurposeDescription",
    placeholderKey: "pages.wizard.fields.aiPurposePlaceholder",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.aiPurpose",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.sector,
    scope: WIZARD_CLARIFICATION_SCOPES.preScan,
    fieldName: "sector",
    control: WIZARD_FIELD_CONTROLS.select,
    labelKey: "pages.wizard.fields.sectorLabel",
    detailKey: "pages.wizard.fields.sectorDescription",
    optionSet: "sector",
    required: true,
    collectionRuleKey: "pages.wizard.clarification.rules.sector",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.missingGraphContext,
    scope: WIZARD_CLARIFICATION_SCOPES.postGraph,
    fieldName: "postGraphContext",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.clarification.postGraphContextQuestion",
    detailKey: "pages.wizard.clarification.postGraphContextDetail",
    placeholderKey: "pages.wizard.clarification.postGraphContextPlaceholder",
    required: false,
    collectionRuleKey: "pages.wizard.clarification.rules.postGraphContext",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.missingRuleScope,
    scope: WIZARD_CLARIFICATION_SCOPES.postGraph,
    fieldName: "postGraphRuleScope",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.clarification.postGraphRuleScopeQuestion",
    detailKey: "pages.wizard.clarification.postGraphRuleScopeDetail",
    placeholderKey: "pages.wizard.clarification.postGraphRuleScopePlaceholder",
    required: false,
    collectionRuleKey: "pages.wizard.clarification.rules.postGraphRuleScope",
  },
  {
    id: WIZARD_CLARIFICATION_QUESTION_IDS.missingHumanReviewBoundary,
    scope: WIZARD_CLARIFICATION_SCOPES.postGraph,
    fieldName: "postGraphHumanReviewBoundary",
    control: WIZARD_FIELD_CONTROLS.textarea,
    labelKey: "pages.wizard.clarification.postGraphHumanReviewQuestion",
    detailKey: "pages.wizard.clarification.postGraphHumanReviewDetail",
    placeholderKey:
      "pages.wizard.clarification.postGraphHumanReviewPlaceholder",
    required: false,
    collectionRuleKey: "pages.wizard.clarification.rules.postGraphHumanReview",
  },
] as const satisfies ReadonlyArray<WizardClarificationQuestion>;

export type WizardClarificationRequest = {
  kind: typeof WIZARD_CLARIFICATION_REQUEST_KIND;
  scope: WizardClarificationScope;
  requestedBy: WizardClarificationRequester;
  reasonCode: string;
  questionIds: WizardClarificationQuestionId[];
};
