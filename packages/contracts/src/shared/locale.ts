export const LOCALES = ["en", "vi"] as const;

export type Locale = (typeof LOCALES)[number];
