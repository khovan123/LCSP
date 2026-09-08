export type JsonPrimitive = string | number | boolean | null;

export type JsonValue =
  JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type NonEmptyArray<T> = [T, ...T[]];

export const INTERVIEW_TECHNICAL_CONTRACT_VERSION =
  "interview-technical-contract-v1.0.0";

export type InterviewContractVersion =
  typeof INTERVIEW_TECHNICAL_CONTRACT_VERSION;

export const ASSESSMENT_INTERVIEW_OUTCOMES = {
  waitingForCustomer: "WAITING_FOR_CUSTOMER",
  contextReady: "CONTEXT_READY",
  contextResolved: "CONTEXT_RESOLVED",
  blockedOrUnresolved: "BLOCKED_OR_UNRESOLVED",
  failed: "FAILED",
} as const;

export type AssessmentInterviewOutcome =
  (typeof ASSESSMENT_INTERVIEW_OUTCOMES)[keyof typeof ASSESSMENT_INTERVIEW_OUTCOMES];

export type InterviewOutcome = AssessmentInterviewOutcome;

/** Canonical Interview reasoning modes. PRE_PLANNER is input-only compatibility. */
export const ASSESSMENT_INTERVIEW_MODES = {
  initialInterview: "INITIAL_INTERVIEW",
  investigatorResolution: "INVESTIGATOR_RESOLUTION",
} as const;

export type AssessmentInterviewMode =
  (typeof ASSESSMENT_INTERVIEW_MODES)[keyof typeof ASSESSMENT_INTERVIEW_MODES];

export type InterviewMode = AssessmentInterviewMode;
export type CanonicalAssessmentInterviewMode = InterviewMode;

export const LEGACY_ASSESSMENT_INTERVIEW_MODES = {
  prePlanner: "PRE_PLANNER",
} as const;

export type LegacyAssessmentInterviewMode =
  (typeof LEGACY_ASSESSMENT_INTERVIEW_MODES)[keyof typeof LEGACY_ASSESSMENT_INTERVIEW_MODES];

export type LegacyInterviewMode = LegacyAssessmentInterviewMode;

export type AssessmentInterviewModeCompatibilityInput =
  AssessmentInterviewMode | LegacyAssessmentInterviewMode;

export type InterviewModeCompatibilityInput =
  AssessmentInterviewModeCompatibilityInput;

export function normalizeAssessmentInterviewMode(
  value: unknown,
): CanonicalAssessmentInterviewMode | undefined {
  if (
    value === ASSESSMENT_INTERVIEW_MODES.initialInterview ||
    value === LEGACY_ASSESSMENT_INTERVIEW_MODES.prePlanner
  ) {
    return ASSESSMENT_INTERVIEW_MODES.initialInterview;
  }
  if (value === ASSESSMENT_INTERVIEW_MODES.investigatorResolution) {
    return ASSESSMENT_INTERVIEW_MODES.investigatorResolution;
  }
  return undefined;
}

export const ASSESSMENT_INTERVIEW_QUESTION_INTENTS = {
  ask: "ASK",
  clarify: "CLARIFY",
} as const;

export type AssessmentInterviewQuestionIntent =
  (typeof ASSESSMENT_INTERVIEW_QUESTION_INTENTS)[keyof typeof ASSESSMENT_INTERVIEW_QUESTION_INTENTS];

export type QuestionIntent = AssessmentInterviewQuestionIntent;

export const ASSESSMENT_INTERVIEW_CONTROLS = {
  freeText: "FREE_TEXT",
  boolean: "BOOLEAN",
  singleSelect: "SINGLE_SELECT",
  multiSelect: "MULTI_SELECT",
  confirmAdjust: "CONFIRM_ADJUST",
} as const;

export type AssessmentInterviewControl =
  (typeof ASSESSMENT_INTERVIEW_CONTROLS)[keyof typeof ASSESSMENT_INTERVIEW_CONTROLS];

export type QuestionResponseMode = AssessmentInterviewControl;

export const ASSESSMENT_INTERVIEW_ANSWER_ACTIONS = {
  confirm: "CONFIRM",
  adjust: "ADJUST",
} as const;

export type AssessmentInterviewAnswerAction =
  (typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS)[keyof typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS];

export const ASSESSMENT_TECHNICAL_COVERAGE_STATES = {
  ready: "READY",
  partial: "PARTIAL",
  unavailable: "UNAVAILABLE",
} as const;

export type AssessmentTechnicalCoverageState =
  (typeof ASSESSMENT_TECHNICAL_COVERAGE_STATES)[keyof typeof ASSESSMENT_TECHNICAL_COVERAGE_STATES];

export const INTERVIEW_REASONING_TECHNICAL_COVERAGE_STATES = {
  ready: ASSESSMENT_TECHNICAL_COVERAGE_STATES.ready,
  partial: ASSESSMENT_TECHNICAL_COVERAGE_STATES.partial,
} as const;

export type TechnicalCoverageState =
  (typeof INTERVIEW_REASONING_TECHNICAL_COVERAGE_STATES)[keyof typeof INTERVIEW_REASONING_TECHNICAL_COVERAGE_STATES];

export const BUSINESS_CONTEXT_SOURCES = {
  customerStated: "CUSTOMER_STATED",
  customerConfirmed: "CUSTOMER_CONFIRMED",
} as const;

export type BusinessContextSource =
  (typeof BUSINESS_CONTEXT_SOURCES)[keyof typeof BUSINESS_CONTEXT_SOURCES];

export const BUSINESS_CONTEXT_RESOLUTION_STATES = {
  uncertain: "UNCERTAIN",
  conflicted: "CONFLICTED",
  confirmed: "CONFIRMED",
  superseded: "SUPERSEDED",
} as const;

export type BusinessContextResolutionState =
  (typeof BUSINESS_CONTEXT_RESOLUTION_STATES)[keyof typeof BUSINESS_CONTEXT_RESOLUTION_STATES];

export const ASSESSMENT_CONTEXT_AUTHORITY_STATUSES = {
  customerStated: BUSINESS_CONTEXT_SOURCES.customerStated,
  uncertain: BUSINESS_CONTEXT_RESOLUTION_STATES.uncertain,
  conflicted: BUSINESS_CONTEXT_RESOLUTION_STATES.conflicted,
  customerConfirmed: BUSINESS_CONTEXT_SOURCES.customerConfirmed,
  confirmed: BUSINESS_CONTEXT_RESOLUTION_STATES.confirmed,
  superseded: BUSINESS_CONTEXT_RESOLUTION_STATES.superseded,
} as const;

export type AssessmentContextAuthorityStatus =
  (typeof ASSESSMENT_CONTEXT_AUTHORITY_STATUSES)[keyof typeof ASSESSMENT_CONTEXT_AUTHORITY_STATUSES];

export const EVIDENCE_SOURCE_TYPES = {
  technicalEvidence: "TECHNICAL_EVIDENCE",
  documentaryEvidence: "DOCUMENTARY_EVIDENCE",
} as const;

export type EvidenceSourceType =
  (typeof EVIDENCE_SOURCE_TYPES)[keyof typeof EVIDENCE_SOURCE_TYPES];

export const EVIDENCE_RESOLUTION_STATES = {
  observed: "OBSERVED",
  corroborated: "CORROBORATED",
  inferred: "INFERRED",
  unresolved: "UNRESOLVED",
  stale: "STALE",
} as const;

export type EvidenceResolutionState =
  (typeof EVIDENCE_RESOLUTION_STATES)[keyof typeof EVIDENCE_RESOLUTION_STATES];

export const CONFIRMED_STRUCTURED_BUSINESS_CONTEXT_AUTHORITIES = {
  customerConfirmedConfirmedOnly: "CUSTOMER_CONFIRMED_CONFIRMED_ONLY",
} as const;

export type ConfirmedStructuredBusinessContextAuthority =
  (typeof CONFIRMED_STRUCTURED_BUSINESS_CONTEXT_AUTHORITIES)[keyof typeof CONFIRMED_STRUCTURED_BUSINESS_CONTEXT_AUTHORITIES];

export const ASSESSMENT_CONTEXT_UPDATE_SOURCES = {
  customer: "CUSTOMER",
  runtime: "RUNTIME",
} as const;

export type AssessmentContextUpdateSource =
  (typeof ASSESSMENT_CONTEXT_UPDATE_SOURCES)[keyof typeof ASSESSMENT_CONTEXT_UPDATE_SOURCES];

export const ASSESSMENT_INTERVIEW_FLAGS = {
  downstreamImpact: "DOWNSTREAM_IMPACT",
} as const;

export type AssessmentInterviewFlag =
  (typeof ASSESSMENT_INTERVIEW_FLAGS)[keyof typeof ASSESSMENT_INTERVIEW_FLAGS];

export type InterviewFlag = AssessmentInterviewFlag;

export const ASSESSMENT_INTERVIEW_ORCHESTRATOR_ACTIONS = {
  waitForCustomer: "WAIT_FOR_CUSTOMER",
  continueToEngineeringRule: "CONTINUE_TO_ENGINEERING_RULE",
  keepBusinessContextBlocked: "KEEP_BUSINESS_CONTEXT_BLOCKED",
  routeRuntimeRecovery: "ROUTE_RUNTIME_RECOVERY",
  resumeExactInvestigator: "RESUME_EXACT_INVESTIGATOR",
  selectiveRerunRescope: "SELECTIVE_RERUN_RESCOPE",
} as const;

export type AssessmentInterviewOrchestratorAction =
  (typeof ASSESSMENT_INTERVIEW_ORCHESTRATOR_ACTIONS)[keyof typeof ASSESSMENT_INTERVIEW_ORCHESTRATOR_ACTIONS];

export const ASSESSMENT_INTERVIEW_WORKFLOW_EVENTS = {
  interviewStarted: "INTERVIEW_STARTED",
  interviewWaitingForCustomer: "INTERVIEW_WAITING_FOR_CUSTOMER",
  interviewContextUpdated: "INTERVIEW_CONTEXT_UPDATED",
  interviewContextReady: "INTERVIEW_CONTEXT_READY",
  interviewContextResolved: "INTERVIEW_CONTEXT_RESOLVED",
  interviewBlockedOrUnresolved: "INTERVIEW_BLOCKED_OR_UNRESOLVED",
  interviewFailed: "INTERVIEW_FAILED",
  downstreamReevaluationStarted: "DOWNSTREAM_REEVALUATION_STARTED",
  investigationResumed: "INVESTIGATION_RESUMED",
} as const;

export type AssessmentInterviewWorkflowEvent =
  (typeof ASSESSMENT_INTERVIEW_WORKFLOW_EVENTS)[keyof typeof ASSESSMENT_INTERVIEW_WORKFLOW_EVENTS];

export const ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS = {
  provideMoreContext: "PROVIDE_MORE_CONTEXT",
  checkInternally: "CHECK_INTERNALLY",
  saveAndExit: "SAVE_AND_EXIT",
} as const;

export type AssessmentInterviewBlockedAction =
  (typeof ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS)[keyof typeof ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS];

export const INTERVIEW_FRONTIER_OWNERS = {
  customer: "CUSTOMER",
  technical: "TECHNICAL",
  system: "SYSTEM",
} as const;

export type InterviewFrontierOwner =
  (typeof INTERVIEW_FRONTIER_OWNERS)[keyof typeof INTERVIEW_FRONTIER_OWNERS];

export const INTERVIEW_FRONTIER_MATERIALITIES = {
  material: "MATERIAL",
  nonMaterial: "NON_MATERIAL",
} as const;

export type InterviewFrontierMateriality =
  (typeof INTERVIEW_FRONTIER_MATERIALITIES)[keyof typeof INTERVIEW_FRONTIER_MATERIALITIES];

export type AssessmentInterviewFrontierCandidate = {
  owner: InterviewFrontierOwner;
  materiality: InterviewFrontierMateriality;
  description: string;
  evidenceRefs?: string[];
};

export type PersistedCustomerQuestionFrontier = {
  owner: typeof INTERVIEW_FRONTIER_OWNERS.customer;
  materiality: typeof INTERVIEW_FRONTIER_MATERIALITIES.material;
  description: string;
  evidenceRefs?: string[];
};

export type AssessmentInterviewFrontier =
  PersistedCustomerQuestionFrontier | AssessmentInterviewFrontierCandidate;

export type ScopeExtension = {
  namespace: string;
  key: string;
  values: NonEmptyArray<string>;
};

export type BusinessContextScope = {
  systemRefs: NonEmptyArray<string>;
  componentRefs?: string[];
  workflowRefs?: string[];
  actorGroupRefs?: string[];
  environmentRefs?: string[];
  operatingRegionRefs?: string[];
  extensions?: ScopeExtension[];
};

export type BusinessContextStatementBase = {
  statementId: string;
  assessmentId: string;
  topic: string;
  statement: string;
  normalizedValue?: JsonValue;
  scope: BusinessContextScope;
  evidenceRefs: string[];
  respondentRef: string;
  createdAt: string;
  supersedesStatementId?: string;
};

export type CustomerStatedContextStatement = BusinessContextStatementBase & {
  source: typeof BUSINESS_CONTEXT_SOURCES.customerStated;
  resolutionState:
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.uncertain
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.conflicted
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.superseded;
};

export type CustomerConfirmedContextStatement = BusinessContextStatementBase & {
  source: typeof BUSINESS_CONTEXT_SOURCES.customerConfirmed;
  resolutionState:
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.confirmed
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.conflicted
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.superseded;
};

export type BusinessContextStatement =
  CustomerStatedContextStatement | CustomerConfirmedContextStatement;

export type ConfirmedBusinessContextStatement =
  CustomerConfirmedContextStatement & {
    resolutionState: typeof BUSINESS_CONTEXT_RESOLUTION_STATES.confirmed;
  };

export type BusinessContextUpdateBase = {
  topic: string;
  statement: string;
  normalizedValue?: JsonValue;
  scope: BusinessContextScope;
  evidenceRefs: string[];
  supersedesStatementId?: string;
};

export type CustomerStatedContextUpdate = BusinessContextUpdateBase & {
  source: typeof BUSINESS_CONTEXT_SOURCES.customerStated;
  resolutionState:
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.uncertain
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.conflicted
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.superseded;
};

export type CustomerConfirmedContextUpdate = BusinessContextUpdateBase & {
  source: typeof BUSINESS_CONTEXT_SOURCES.customerConfirmed;
  resolutionState:
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.confirmed
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.conflicted
    | typeof BUSINESS_CONTEXT_RESOLUTION_STATES.superseded;
};

export type BusinessContextUpdate =
  CustomerStatedContextUpdate | CustomerConfirmedContextUpdate;

export type GovernedEvidenceItem = {
  evidenceRef: string;
  sourceType: EvidenceSourceType;
  resolutionState: EvidenceResolutionState;
  observation: string;
  sourceVersionRef: string;
  scope: BusinessContextScope;
  customerSafeSummary?: string;
};

export type SafeEvidenceContext = {
  items: GovernedEvidenceItem[];
};

export type ChoiceOption = {
  value: string;
  label: string;
};

export type ProposedInterpretation = {
  topic: string;
  statement: string;
  normalizedValue?: JsonValue;
  scope: BusinessContextScope;
  evidenceRefs: string[];
};

export type QuestionBase = {
  intent: QuestionIntent;
  text: string;
  reasonSummary: string;
  evidenceRefs: string[];
};

export type FreeTextQuestion = QuestionBase & {
  responseMode: typeof ASSESSMENT_INTERVIEW_CONTROLS.freeText;
};

export type SingleSelectQuestion = QuestionBase & {
  responseMode: typeof ASSESSMENT_INTERVIEW_CONTROLS.singleSelect;
  choices: NonEmptyArray<ChoiceOption>;
};

export type MultiSelectQuestion = QuestionBase & {
  responseMode: typeof ASSESSMENT_INTERVIEW_CONTROLS.multiSelect;
  choices: NonEmptyArray<ChoiceOption>;
};

export type BooleanQuestion = QuestionBase & {
  responseMode: typeof ASSESSMENT_INTERVIEW_CONTROLS.boolean;
};

export type ConfirmAdjustQuestion = QuestionBase & {
  intent: typeof ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify;
  responseMode: typeof ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust;
  proposedInterpretation: NonEmptyArray<ProposedInterpretation>;
  choices: [
    {
      value: typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS.confirm;
      label: string;
    },
    { value: typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS.adjust; label: string },
  ];
};

export type InterviewQuestionDraft =
  | FreeTextQuestion
  | SingleSelectQuestion
  | MultiSelectQuestion
  | BooleanQuestion
  | ConfirmAdjustQuestion;

export type InterviewQuestion = InterviewQuestionDraft & {
  questionRef: string;
  sessionId: string;
  sequence: number;
  createdAt: string;
};

export type AssessmentInterviewQuestionChoice = {
  id: string;
  label: string;
  description?: string;
  requiresFreeText?: boolean;
};

export type AssessmentInterviewQuestion = {
  id: string;
  needId?: string;
  intent: AssessmentInterviewQuestionIntent;
  control: AssessmentInterviewControl;
  prompt: string;
  choices?: AssessmentInterviewQuestionChoice[];
  priorAnswerSummary?: string;
  proposedInterpretation?: string;
  whyEvidenceRefs?: string[];
  whyAreWeAsking?: string;
  hasSupportingEvidence?: boolean;
  frontier?: PersistedCustomerQuestionFrontier;
};

export type ConfirmedStructuredBusinessStatement = {
  statementId: string;
  assessmentId: string;
  topic: string;
  statement: string;
  normalizedValue?: JsonValue;
  scope?: BusinessContextScope;
  respondentRef: string;
  createdAt: string;
  source: typeof BUSINESS_CONTEXT_SOURCES.customerConfirmed;
  resolutionState: typeof BUSINESS_CONTEXT_RESOLUTION_STATES.confirmed;
  evidenceRefs: string[];
};

export type ConfirmedStructuredBusinessContext = {
  assessmentId: string;
  contextRevision: number;
  authority: typeof CONFIRMED_STRUCTURED_BUSINESS_CONTEXT_AUTHORITIES.customerConfirmedConfirmedOnly;
  statements: ConfirmedStructuredBusinessStatement[];
  createdByActorRef?: string;
};

export type AssessmentInterviewAuditRef = {
  authenticatedActorId: string;
  timestamp: string;
  assessmentId: string;
  sourceVersion: string;
  pgeVersion: string;
  guidanceVersion?: string;
  sessionId: string;
  turnId: string;
  contextRevision: number;
  priorRevision?: number;
  newRevision?: number;
  relatedQuestionId?: string;
  governedEvidenceRefs?: string[];
};

export type AssessmentInterviewAnswerHistoryItem = {
  questionId: string;
  answeredAt: string;
  /** Internal history stores actorId; Customer projections omit it. */
  actorId?: string;
  summary: string;
};

export type AssessmentInterviewRuntimeState = {
  outcome: AssessmentInterviewOutcome;
  activeQuestion?: AssessmentInterviewQuestion;
  flags?: AssessmentInterviewFlag[];
  contextAuthority?: AssessmentContextAuthorityStatus;
  /** Worker-only authoritative context; public runtime surfaces redact this field. */
  confirmedContext?: Record<string, unknown>;
  blockedActions?: AssessmentInterviewBlockedAction[];
  audit?: AssessmentInterviewAuditRef;
  threadId?: string;
  contextRevision?: number;
  orchestrationRequested?: boolean;
  pendingDraft?: string;
  answerHistory?: AssessmentInterviewAnswerHistoryItem[];
};

export type PartialCoveragePolicyDecision = {
  policyDecisionRef: string;
  policyVersion: string;
  permittedForInterview: boolean;
  limitations: string[];
};

/** Session-local, non-authoritative hints used to improve the next Interview turn. */
export type InterviewWorkingStrategy = {
  terminologyMap: Record<string, string>;
  avoidReaskingTopics: string[];
  effectiveQuestionPatterns: string[];
  observedAmbiguities: string[];
  interactionNotes: string[];
};

export const EMPTY_INTERVIEW_WORKING_STRATEGY: InterviewWorkingStrategy = {
  terminologyMap: {},
  avoidReaskingTopics: [],
  effectiveQuestionPatterns: [],
  observedAmbiguities: [],
  interactionNotes: [],
};

export type AssessmentInterviewAnswerInput = {
  questionId: string;
  freeText?: string;
  selectedChoiceIds?: string[];
  otherText?: string;
  comment?: string;
  confirmed?: boolean;
  adjusted?: boolean;
};

export type CustomerFreeTextAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.freeText;
  text: string;
};

export type CustomerSingleSelectAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.singleSelect;
  value: string;
  comment?: string;
};

export type CustomerMultiSelectAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.multiSelect;
  values: NonEmptyArray<string>;
  comment?: string;
};

export type CustomerBooleanAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.boolean;
  value: boolean;
  comment?: string;
};

export type CustomerConfirmAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust;
  action: typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS.confirm;
  comment?: string;
};

export type CustomerAdjustAnswer = {
  kind: typeof ASSESSMENT_INTERVIEW_CONTROLS.confirmAdjust;
  action: typeof ASSESSMENT_INTERVIEW_ANSWER_ACTIONS.adjust;
  adjustmentText: string;
};

export type CustomerAnswer =
  | CustomerFreeTextAnswer
  | CustomerSingleSelectAnswer
  | CustomerMultiSelectAnswer
  | CustomerBooleanAnswer
  | CustomerConfirmAnswer
  | CustomerAdjustAnswer;

export type SubmitInterviewAnswerCommand = {
  contractVersion: InterviewContractVersion;
  assessmentId: string;
  sessionId: string;
  questionRef: string;
  expectedSessionRevision: number;
  clientRequestId: string;
  answer: CustomerAnswer;
};

export type InvestigatorNeed = {
  businessContextNeed: string;
  resolutionCriteria: string;
  whyNeeded?: string;
  relatedEvidenceRefs?: string[];
  originatingInvestigationReference: string;
};

export type InterviewTurnSnapshot = {
  turnRef: string;
  sequence: number;
  question: InterviewQuestion;
  answer?: CustomerAnswer;
  respondentRef?: string;
  contextStatementRefs: string[];
  unresolvedTopics: string[];
};

export type IncomingCustomerTurn = {
  questionRef: string;
  answer: CustomerAnswer;
  respondentRef: string;
};

export type SubjectSystemIdentity = {
  systemRef: string;
  displayName: string;
  workspaceRef: string;
  projectRef?: string;
};

export type ArtifactVersions = {
  sourceVersionRef: string;
  scannerRunRef: string;
  programEvidenceGraphVersion: string;
};

export type CoverageLimitation = {
  code: string;
  summary: string;
  affectedScopeRefs?: string[];
};

export type ReadyTechnicalCoverage = {
  state: typeof INTERVIEW_REASONING_TECHNICAL_COVERAGE_STATES.ready;
  limitations: [];
  policyDecisionRef: string;
};

export type PartialTechnicalCoverage = {
  state: typeof INTERVIEW_REASONING_TECHNICAL_COVERAGE_STATES.partial;
  limitations: NonEmptyArray<CoverageLimitation>;
  policyDecisionRef: string;
};

export type TechnicalCoverage =
  ReadyTechnicalCoverage | PartialTechnicalCoverage;

export type LocaleTag = string;

export const INTERVIEW_HOST_PLATFORMS = {
  lcsp: "LCSP",
} as const;

export type InterviewHostPlatform =
  (typeof INTERVIEW_HOST_PLATFORMS)[keyof typeof INTERVIEW_HOST_PLATFORMS];

export type InterviewAgentInputCommon = {
  contractVersion: InterviewContractVersion;
  hostPlatform: InterviewHostPlatform;
  assessmentId: string;
  sessionId: string;
  sessionRevision: number;
  subjectSystemIdentity: SubjectSystemIdentity;
  guidanceVersion: string;
  locale: LocaleTag;
  artifactVersions: ArtifactVersions;
  technicalCoverage: TechnicalCoverage;
  currentConfirmedBusinessContext: ConfirmedBusinessContextStatement[];
  safeEvidenceContext: SafeEvidenceContext;
  interviewHistory: InterviewTurnSnapshot[];
  incomingCustomerTurn?: IncomingCustomerTurn;
  workingStrategy?: InterviewWorkingStrategy;
};

export type InitialInterviewAgentInput = InterviewAgentInputCommon & {
  mode: typeof ASSESSMENT_INTERVIEW_MODES.initialInterview;
  investigatorNeed?: never;
};

export type InvestigatorResolutionAgentInput = InterviewAgentInputCommon & {
  mode: typeof ASSESSMENT_INTERVIEW_MODES.investigatorResolution;
  investigatorNeed: InvestigatorNeed;
};

export type InterviewAgentInput =
  InitialInterviewAgentInput | InvestigatorResolutionAgentInput;

export type UnresolvedBusinessContext = {
  topic: string;
  reason: string;
  scope?: BusinessContextScope;
};

export type InterviewLimitation = {
  code: string;
  summary: string;
};

export type WaitingForCustomerResult = {
  outcome: typeof ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer;
  question: InterviewQuestionDraft;
  contextUpdates: BusinessContextUpdate[];
  unresolved: UnresolvedBusinessContext[];
  flags: InterviewFlag[];
  limitations: InterviewLimitation[];
};

export type ContextReadyResult = {
  outcome: typeof ASSESSMENT_INTERVIEW_OUTCOMES.contextReady;
  question?: never;
  contextUpdates: BusinessContextUpdate[];
  unresolved: [];
  flags: InterviewFlag[];
  limitations: InterviewLimitation[];
};

export type ContextResolvedResult = {
  outcome: typeof ASSESSMENT_INTERVIEW_OUTCOMES.contextResolved;
  question?: never;
  contextUpdates: BusinessContextUpdate[];
  unresolved: [];
  flags: InterviewFlag[];
  limitations: InterviewLimitation[];
};

export type BlockedOrUnresolvedResult = {
  outcome: typeof ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved;
  question?: never;
  contextUpdates: BusinessContextUpdate[];
  unresolved: NonEmptyArray<UnresolvedBusinessContext>;
  flags: InterviewFlag[];
  limitations: InterviewLimitation[];
};

export type FailedResult = {
  outcome: typeof ASSESSMENT_INTERVIEW_OUTCOMES.failed;
  question?: never;
  contextUpdates: [];
  unresolved: [];
  flags: [];
  limitations: NonEmptyArray<InterviewLimitation>;
};

export type InterviewAgentResult =
  | WaitingForCustomerResult
  | ContextReadyResult
  | ContextResolvedResult
  | BlockedOrUnresolvedResult
  | FailedResult;

export type InterviewRuntimeResult = {
  contractVersion: InterviewContractVersion;
  assessmentId: string;
  sessionId: string;
  invocationRef: string;
  mode: InterviewMode;
  guidanceVersion: string;
  modelId?: string;
  artifactVersions: ArtifactVersions;
  contextRevisionBefore: string;
  contextRevisionAfter?: string;
  sessionRevisionBefore: number;
  sessionRevisionAfter: number;
  persistedQuestionRef?: string;
  generatedAt: string;
  agentResult: InterviewAgentResult;
};

export type ContextRevision = {
  contextRevisionRef: string;
  assessmentId: string;
  parentRevisionRef?: string;
  confirmedStatementRefs: string[];
  createdAt: string;
  createdByActorRef: string;
};

export type AssessmentInterviewBlockedInput = {
  action: AssessmentInterviewBlockedAction;
  draft?: string;
};

const INTERVIEW_OUTCOME_SET = new Set<string>(
  Object.values(ASSESSMENT_INTERVIEW_OUTCOMES),
);
const INTERVIEW_QUESTION_INTENT_SET = new Set<string>(
  Object.values(ASSESSMENT_INTERVIEW_QUESTION_INTENTS),
);
const AUTHORITATIVE_CONTEXT_STATUSES = new Set<string>([
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.customerConfirmed,
  ASSESSMENT_CONTEXT_AUTHORITY_STATUSES.confirmed,
]);

export function isAssessmentInterviewOutcome(
  value: unknown,
): value is AssessmentInterviewOutcome {
  return typeof value === "string" && INTERVIEW_OUTCOME_SET.has(value);
}

export function isAssessmentInterviewQuestionIntent(
  value: unknown,
): value is AssessmentInterviewQuestionIntent {
  return typeof value === "string" && INTERVIEW_QUESTION_INTENT_SET.has(value);
}

export function isAuthoritativeAssessmentContextStatus(
  value: unknown,
): value is AssessmentContextAuthorityStatus {
  return typeof value === "string" && AUTHORITATIVE_CONTEXT_STATUSES.has(value);
}

export function hasValidInterviewWaitingInvariant(
  state: Pick<AssessmentInterviewRuntimeState, "activeQuestion" | "outcome">,
): boolean {
  return (
    state.activeQuestion === undefined ||
    state.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer
  );
}
