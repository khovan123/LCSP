export const ANSWER_STATES = {
  answered: "ANSWERED",
  explicitUnknown: "EXPLICIT_UNKNOWN",
} as const;

export type AnswerState = (typeof ANSWER_STATES)[keyof typeof ANSWER_STATES];

export type WizardAnswer = {
  questionId: string;
  value: unknown;
  answerState: AnswerState;
  updatedAt: string;
};
