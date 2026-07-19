export const EVIDENCE_ERROR_CODES = {
  notFound: "EVIDENCE_NOT_FOUND",
} as const;

export type EvidenceErrorCode =
  (typeof EVIDENCE_ERROR_CODES)[keyof typeof EVIDENCE_ERROR_CODES];
