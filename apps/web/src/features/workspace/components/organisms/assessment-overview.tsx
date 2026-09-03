"use client";

import {
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_CONTROLS,
  ASSESSMENT_INTERVIEW_QUESTION_INTENTS,
  type AssessmentInterviewQuestion,
} from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";
import { useState } from "react";

import { appLocale } from "@/lib/locale";

import type { AssessmentOverviewProps } from "../../types/assessment-overview.types";
import { TOOL_ACTIVITY_STATUSES } from "../../types/assessment-chat.types";
import { AgentTurn } from "../molecules/agent-turn";
import { AssessmentQuestionTurn } from "../molecules/assessment-question-turn";
import { ToolActivityRow } from "../molecules/tool-activity-row";
import { AssessmentComposer } from "./assessment-composer";
import { AssessmentTranscript } from "./assessment-transcript";

const initialInterviewQuestion = {
  id: "initial-interview-project-context",
  intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.ask,
  control: ASSESSMENT_INTERVIEW_CONTROLS.freeText,
  prompt: t("pages.assessment.interviewPrompt"),
  whyEvidenceRefs: ["pge:coverage:partial"],
} as const satisfies AssessmentInterviewQuestion;

const targetedClarificationQuestion = {
  id: "targeted-clarification-human-review",
  intent: ASSESSMENT_INTERVIEW_QUESTION_INTENTS.clarify,
  control: ASSESSMENT_INTERVIEW_CONTROLS.multiSelect,
  prompt: t("pages.assessment.interviewPrompt"),
  priorAnswerSummary: t("pages.assessment.targetedClarificationPriorAnswer"),
  choices: [
    {
      id: "before_decision",
      label: t("pages.assessment.targetedClarificationBeforeDecision"),
    },
    {
      id: "after_decision",
      label: t("pages.assessment.targetedClarificationAfterDecision"),
    },
    {
      id: "other",
      label: t("pages.assessment.otherDescribe"),
      requiresFreeText: true,
    },
  ],
  whyEvidenceRefs: ["investigation:need:human-review-timing"],
} as const satisfies AssessmentInterviewQuestion;

export function AssessmentOverview({ assessmentId }: AssessmentOverviewProps) {
  const [draft, setDraft] = useState("");

  function handleSubmit() {
    setDraft("");
  }

  return (
    <main
      className="flex h-full min-h-0 flex-col"
      data-assessment-id={assessmentId}
      data-surface="workflow-run"
    >
      <AssessmentTranscript autoScrollKey={assessmentId}>
        <AgentTurn
          content={
            <>
              <p className="font-medium">
                {t("pages.assessment.workflowRunTitle")}
              </p>
              <p className="mt-1 text-muted-foreground">
                {t("pages.assessment.workflowRunDescription")}
              </p>
            </>
          }
        />

        <AgentTurn>
          <div className="space-y-2">
            <ToolActivityRow
              label={t("pages.assessment.repositoryConnected")}
              status={TOOL_ACTIVITY_STATUSES.completed}
            />
            <ToolActivityRow
              label={t("pages.assessment.scannerComplete")}
              status={TOOL_ACTIVITY_STATUSES.completed}
            />
          </div>
        </AgentTurn>

        <AgentTurn>
          <AssessmentQuestionTurn question={initialInterviewQuestion} />
        </AgentTurn>

        <AgentTurn>
          <AssessmentQuestionTurn
            question={targetedClarificationQuestion}
            blockedActions={[
              ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.provideMoreContext,
              ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.checkInternally,
              ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit,
            ]}
          />
        </AgentTurn>
      </AssessmentTranscript>

      <AssessmentComposer
        value={draft}
        onValueChange={setDraft}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
