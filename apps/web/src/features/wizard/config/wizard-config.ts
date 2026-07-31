export const WIZARD_LOCAL_STORAGE_PREFIX = "lcsp-wizard-draft";

export const checkboxOptions = {
  affectedPeople: [
    "pages.wizard.options.userGroupCustomers",
    "pages.wizard.options.userGroupEmployees",
    "pages.wizard.options.userGroupApplicants",
    "pages.wizard.options.userGroupStudents",
    "pages.wizard.options.userGroupPatients",
  ] as const,
  dataType: [
    "pages.wizard.options.dataTypePersonal",
    "pages.wizard.options.dataTypeSensitive",
    "pages.wizard.options.dataTypeBiometric",
    "pages.wizard.options.dataTypeBehavioral",
    "pages.wizard.options.dataTypeOperational",
  ] as const,
  deploymentContext: [
    "pages.wizard.options.deploymentInternal",
    "pages.wizard.options.deploymentExternal",
  ] as const,
  highImpactIndicators: [
    "pages.wizard.options.highImpactRecruiting",
    "pages.wizard.options.highImpactCredit",
    "pages.wizard.options.highImpactEducation",
    "pages.wizard.options.highImpactHealthcare",
  ] as const,
  transparencyIndicators: [
    "pages.wizard.options.transparencyDirectInteraction",
    "pages.wizard.options.transparencyContentGeneration",
  ] as const,
  prohibitedRiskSignals: [
    "pages.wizard.options.prohibitedTracking",
    "pages.wizard.options.prohibitedManipulation",
    "pages.wizard.options.prohibitedScoring",
    "pages.wizard.options.prohibitedSensitiveInference",
  ] as const,
};

export const selectOptions = {
  yesNoUnknown: [
    { value: "yes", labelKey: "pages.wizard.options.yes" },
    { value: "no", labelKey: "pages.wizard.options.no" },
    { value: "unknown", labelKey: "pages.wizard.options.unknown" },
  ] as const,
  sector: [
    { value: "GENERAL_BUSINESS", labelKey: "pages.wizard.options.sectorGeneral" },
    { value: "EMPLOYMENT_HR", labelKey: "pages.wizard.options.sectorHr" },
    { value: "FINANCE_CREDIT", labelKey: "pages.wizard.options.sectorFinance" },
    { value: "EDUCATION", labelKey: "pages.wizard.options.sectorEducation" },
    { value: "HEALTHCARE", labelKey: "pages.wizard.options.sectorHealthcare" },
    {
      value: "PUBLIC_SERVICES",
      labelKey: "pages.wizard.options.sectorPublicServices",
    },
  ] as const,
  userGroup: [
    { value: "CUSTOMERS", labelKey: "pages.wizard.options.userGroupCustomers" },
    { value: "EMPLOYEES", labelKey: "pages.wizard.options.userGroupEmployees" },
    { value: "APPLICANTS", labelKey: "pages.wizard.options.userGroupApplicants" },
    { value: "STUDENTS", labelKey: "pages.wizard.options.userGroupStudents" },
    { value: "PATIENTS", labelKey: "pages.wizard.options.userGroupPatients" },
  ] as const,
  userImpact: [
    { value: "LOW", labelKey: "pages.wizard.options.userImpactLow" },
    { value: "MODERATE", labelKey: "pages.wizard.options.userImpactModerate" },
    { value: "SIGNIFICANT", labelKey: "pages.wizard.options.userImpactSignificant" },
    { value: "UNKNOWN", labelKey: "pages.wizard.options.unknown" },
  ] as const,
  decisionRole: [
    {
      value: "NO_DECISION_SUPPORT",
      labelKey: "pages.wizard.options.decisionRoleNoAutonomousDecision",
    },
    {
      value: "ASSISTS_DECISION",
      labelKey: "pages.wizard.options.decisionRoleSupportsDecision",
    },
    {
      value: "INFORMS_DECISION",
      labelKey: "pages.wizard.options.decisionRoleInformsDecision",
    },
    {
      value: "RECOMMENDS_OUTCOME",
      labelKey: "pages.wizard.options.decisionRoleRecommendsOutcome",
    },
    {
      value: "DIRECTLY_DRIVES_OUTCOME",
      labelKey: "pages.wizard.options.decisionRoleDirectlyDrivesOutcome",
    },
  ] as const,
  humanOversight: [
    { value: "PRESENT", labelKey: "pages.wizard.options.humanOversightPresent" },
    { value: "LIMITED", labelKey: "pages.wizard.options.humanOversightLimited" },
    { value: "ABSENT", labelKey: "pages.wizard.options.humanOversightAbsent" },
    { value: "UNCLEAR", labelKey: "pages.wizard.options.unknown" },
    {
      value: "NOT_APPLICABLE",
      labelKey: "pages.wizard.options.humanOversightNotApplicable",
    },
  ] as const,
  externalProvider: [
    { value: "NONE", labelKey: "pages.wizard.options.externalNone" },
    { value: "POSSIBLE", labelKey: "pages.wizard.options.externalPossible" },
    { value: "CONFIRMED", labelKey: "pages.wizard.options.externalConfirmed" },
    { value: "UNKNOWN", labelKey: "pages.wizard.options.unknown" },
  ] as const,
};

export const wizardSteps = [
  {
    id: "purpose",
    titleKey: "pages.wizard.sections.purpose",
    fields: ["businessProcess", "aiPurpose", "sector"] as const,
  },
  {
    id: "data-users",
    titleKey: "pages.wizard.sections.dataUsers",
    fields: ["dataTypes", "affectedSubjects", "userImpact"] as const,
  },
  {
    id: "decision",
    titleKey: "pages.wizard.sections.decision",
    fields: ["decisionRole", "humanReview"] as const,
  },
  {
    id: "provider",
    titleKey: "pages.wizard.sections.provider",
    fields: ["externalLlmUsage"] as const,
  },
  {
    id: "deployment",
    titleKey: "pages.wizard.sections.deployment",
    fields: ["deploymentContext"] as const,
  },
  {
    id: "risk",
    titleKey: "pages.wizard.sections.risk",
    fields: ["specialCategoryData", "biometricData", "highImpactIndicators", "transparencyIndicators", "prohibitedRiskSignals"] as const,
  },
] as const;
