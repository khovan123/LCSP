export const DOCUMENT_ACTIONS = {
  generate: "document:generate",
} as const;

export type DocumentAction =
  (typeof DOCUMENT_ACTIONS)[keyof typeof DOCUMENT_ACTIONS];
