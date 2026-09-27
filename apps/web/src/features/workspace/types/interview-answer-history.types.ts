import type { AssessmentInterviewAnswerHistoryItem } from "@lcsp/contracts/evidence";
import type { ReactNode } from "react";

export type InterviewAnswerHistoryProps = {
  answer: AssessmentInterviewAnswerHistoryItem;
  activity?: ReactNode;
};
