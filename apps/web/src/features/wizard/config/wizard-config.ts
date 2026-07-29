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
  ] as const,
  decisionRole: [
    {
      value: "NO_AUTONOMOUS_DECISION",
      labelKey: "pages.wizard.options.decisionRoleNoAutonomousDecision",
    },
    {
      value: "SUPPORTS_DECISION",
      labelKey: "pages.wizard.options.decisionRoleSupportsDecision",
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
    {
      value: "NOT_APPLICABLE",
      labelKey: "pages.wizard.options.humanOversightNotApplicable",
    },
  ] as const,
  externalProvider: [
    { value: "yes", labelKey: "pages.wizard.options.yes" },
    { value: "no", labelKey: "pages.wizard.options.no" },
  ] as const,
};

export const wizardSteps = [
  {
    id: "purpose",
    titleKey: "pages.wizard.sections.purpose",
    fields: ["purpose", "sector"] as const,
  },
  {
    id: "data-users",
    titleKey: "pages.wizard.sections.dataUsers",
    fields: ["data_type", "user_group", "user_impact"] as const,
  },
  {
    id: "decision",
    titleKey: "pages.wizard.sections.decision",
    fields: ["decision_role", "human_oversight"] as const,
  },
  {
    id: "provider",
    titleKey: "pages.wizard.sections.provider",
    fields: ["external_llm_usage"] as const,
  },
  {
    id: "risk",
    titleKey: "pages.wizard.sections.risk",
    fields: ["biometric_indicator", "high_impact_indicator"] as const,
  },
] as const;
