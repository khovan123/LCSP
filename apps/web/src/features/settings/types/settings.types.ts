export const SETTINGS_SECTION_IDS = {
  account: "account",
  appearance: "appearance",
  notifications: "notifications",
  emails: "emails",
  passwordAndAuthentication: "password-and-authentication",
  sessions: "sessions",
  repositories: "repositories",
} as const;

export type SettingsSectionId =
  (typeof SETTINGS_SECTION_IDS)[keyof typeof SETTINGS_SECTION_IDS];
