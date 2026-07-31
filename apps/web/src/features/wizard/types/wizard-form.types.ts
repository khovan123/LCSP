export const WIZARD_HELPER_KEYS = {
  decision: "decision",
  oversight: "oversight",
  provider: "provider",
  biometric: "biometric",
  specialCategory: "specialCategory",
  highImpact: "highImpact",
  prohibited: "prohibited",
  transparency: "transparency",
  deployment: "deployment",
} as const;

export type WizardHelperKey =
  | (typeof WIZARD_HELPER_KEYS)[keyof typeof WIZARD_HELPER_KEYS]
  | null;

export type WizardFieldErrors = Record<string, string>;
