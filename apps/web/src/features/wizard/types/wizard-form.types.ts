export const WIZARD_HELPER_KEYS = {
  decision: "decision",
  oversight: "oversight",
  provider: "provider",
} as const;

export type WizardHelperKey =
  | (typeof WIZARD_HELPER_KEYS)[keyof typeof WIZARD_HELPER_KEYS]
  | null;

export type WizardFieldErrors = Record<string, string>;
