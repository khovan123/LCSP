import type { AssessmentInterviewAnswerHistoryItem } from "@lcsp/contracts/evidence";
import type { ReactNode } from "react";

import type { InterviewCycle } from "../utils/agent-stream-stages";

export type InterviewCycleTurnProps =
  | {
      cycle: InterviewCycle;
      activity?: ReactNode;
    }
  | {
      answer: AssessmentInterviewAnswerHistoryItem;
      activity?: ReactNode;
    };
