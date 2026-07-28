export const DOCUMENT_ACTIONS = {
  generate: "document:generate",
  read: "document:read",
  readRedacted: "document:read:redacted",
} as const;

export type DocumentAction =
  (typeof DOCUMENT_ACTIONS)[keyof typeof DOCUMENT_ACTIONS];
