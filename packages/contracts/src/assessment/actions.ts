export const ASSESSMENT_ACTIONS = {
  create: "assessment:create",
} as const;

export type AssessmentAction =
  (typeof ASSESSMENT_ACTIONS)[keyof typeof ASSESSMENT_ACTIONS];
