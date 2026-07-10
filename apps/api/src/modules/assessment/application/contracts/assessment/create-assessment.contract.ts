export const ASSESSMENT_ERROR_CODES = {
  invalidRequest: "INVALID_REQUEST",
} as const;

export type AssessmentErrorCode =
  (typeof ASSESSMENT_ERROR_CODES)[keyof typeof ASSESSMENT_ERROR_CODES];

export interface CreateAssessmentPayload {
  name?: string;
  description?: string;
}

export interface CreateAssessmentDto {
  assessment_id: string;
  name: string;
  status: string;
  owner_id: string;
  organization_id: string;
  created_at: string;
  correlation_id: string;
}
