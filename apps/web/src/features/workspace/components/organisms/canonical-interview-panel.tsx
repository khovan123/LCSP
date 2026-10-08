"use client";

import {
  ASSESSMENT_INTERVIEW_CONTROLS,
  type AssessmentInterviewQuestion,
} from "@lcsp/contracts/evidence";
import { resolveMessage, type MessageKey } from "@lcsp/i18n";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resolveAppMessage } from "@/lib/i18n";
import { appLocale } from "@/lib/locale";
import { useAssessmentInterviewStateQuery } from "@/lib/api/assessment-queries";
import { useAssessmentRuntimeViewModel } from "../../hooks/use-assessment-runtime-view-model";
import {
  CANONICAL_INTERVIEW_PRESENTATION_STATES,
  selectCanonicalInterviewPresentation,
} from "../../utils/canonical-interview-presentation";
import type { NormalizedAssessmentRuntime } from "../../types/assessment-runtime-adapter.types";

type CanonicalInterviewPanelProps = {
  assessmentId: string;
  lifecycleState: Parameters<
    typeof selectCanonicalInterviewPresentation
  >[0]["lifecycleState"];
  canonicalAvailable: boolean;
};

export function CanonicalInterviewPanel({
  assessmentId,
  lifecycleState,
  canonicalAvailable,
}: CanonicalInterviewPanelProps) {
  const interviewQuery = useAssessmentInterviewStateQuery(assessmentId);
  const runtime = useAssessmentRuntimeViewModel(assessmentId);
  const presentation = selectCanonicalInterviewPresentation({
    lifecycleState,
    interview: runtime.interview,
    customerActions: runtime.customerActions,
    queryPending: interviewQuery.isPending,
    queryError: interviewQuery.isError,
    canonicalAvailable,
  });

  if (interviewQuery.isPending && !interviewQuery.data) {
    return (
      <section data-slot="canonical-interview-panel" aria-busy="true">
        <p className="text-sm text-muted-foreground" role="status">
          {t("pages.assessment.loadingInterviewState")}
        </p>
      </section>
    );
  }

  if (interviewQuery.isError && !interviewQuery.data) {
    return (
      <section data-slot="canonical-interview-panel">
        <Alert variant="destructive">
          <AlertDescription>
            {resolveAppMessage("pages.agenticAssessment.requestFailed")} {" "}
            <Button
              variant="outline"
              onClick={() => void interviewQuery.refetch()}
            >
              {resolveAppMessage("pages.agenticAssessment.retry")}
            </Button>
          </AlertDescription>
        </Alert>
      </section>
    );
  }

  if (presentation.state === CANONICAL_INTERVIEW_PRESENTATION_STATES.hidden) {
    return null;
  }

  return (
    <section
      data-slot="canonical-interview-panel"
      data-presentation-state={presentation.state}
      data-interview-outcome={presentation.interviewOutcome ?? undefined}
      className="flex flex-col gap-4 rounded-lg border p-4"
    >
      {presentation.activeQuestion ? (
        <ReadOnlyQuestion question={presentation.activeQuestion} />
      ) : null}
      {presentation.answerHistory.length > 0 ? (
        <InterviewHistory items={presentation.answerHistory} />
      ) : null}
    </section>
  );
}

function ReadOnlyQuestion({
  question,
}: {
  question: AssessmentInterviewQuestion;
}) {
  const choices =
    question.choices && question.choices.length > 0
      ? question.choices
      : question.control === ASSESSMENT_INTERVIEW_CONTROLS.boolean
        ? [
            { id: "yes", label: t("pages.assessment.booleanYes") },
            { id: "no", label: t("pages.assessment.booleanNo") },
          ]
        : [];

  return (
    <article data-slot="canonical-interview-question" data-question-id={question.id}>
      <p className="text-sm leading-6 text-foreground">{question.prompt}</p>
      {choices.length > 0 ? (
        <ul className="mt-3 space-y-2" aria-label={question.prompt}>
          {choices.map((choice) => (
            <li
              key={choice.id}
              className="rounded-md border px-3 py-2 text-sm text-muted-foreground"
            >
              {choice.label}
            </li>
          ))}
        </ul>
      ) : null}
      {question.proposedInterpretation ? (
        <p className="mt-3 rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          {question.proposedInterpretation}
        </p>
      ) : null}
    </article>
  );
}

function InterviewHistory({
  items,
}: {
  items: NormalizedAssessmentRuntime["interview"]["answerHistory"];
}) {
  return (
    <div data-slot="canonical-interview-history" className="space-y-3">
      {items.map((item) => (
        <article
          key={`${item.questionId}:${item.answeredAt}`}
          data-history-question-id={item.questionId}
          className="rounded-md bg-muted/40 px-3 py-3"
        >
          {item.question?.prompt ? (
            <p className="text-sm text-foreground">{item.question.prompt}</p>
          ) : null}
          <p className="mt-1 text-sm text-muted-foreground">{item.summary}</p>
          {item.comment ? (
            <p className="mt-1 text-sm text-muted-foreground">{item.comment}</p>
          ) : null}
          <time
            className="mt-2 block text-xs text-muted-foreground"
            dateTime={item.answeredAt}
          >
            {item.answeredAt}
          </time>
        </article>
      ))}
    </div>
  );
}

function t(key: MessageKey) {
  return resolveMessage(appLocale, key);
}
