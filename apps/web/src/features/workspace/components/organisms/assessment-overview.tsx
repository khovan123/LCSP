"use client";

import {
  ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS,
  ASSESSMENT_INTERVIEW_OUTCOMES,
  ASSESSMENT_RUNTIME_RUN_STATUSES,
  type AssessmentInterviewBlockedAction,
  type AssessmentInterviewQuestion,
  type AssessmentInterviewRuntimeState,
} from "@lcsp/contracts/evidence";
import { resolveMessage } from "@lcsp/i18n";
import { useEffect, useMemo, useState } from "react";

import { appLocale } from "@/lib/locale";

import type { AssessmentOverviewProps } from "../../types/assessment-overview.types";
import { TOOL_ACTIVITY_STATUSES } from "../../types/assessment-chat.types";
import type {
  WorkspaceRuntimeActivityItem,
  WorkspaceRuntimeSummaryValue,
} from "../../types/workspace-runtime.types";
import { AgentTurn } from "../molecules/agent-turn";
import {
  AssessmentQuestionTurn,
  type AssessmentQuestionAnswerInput,
} from "../molecules/assessment-question-turn";
import { ToolActivityRow } from "../molecules/tool-activity-row";
import { AssessmentComposer } from "./assessment-composer";
import { AssessmentTranscript } from "./assessment-transcript";
import { useWorkspaceRuntime } from "./workspace-runtime-provider";

const DRAFT_STORAGE_PREFIX = "lcsp:assessment-interview-draft:";

export function AssessmentOverview({ assessmentId }: AssessmentOverviewProps) {
  const runtime = useWorkspaceRuntime().getAssessmentRuntime(assessmentId);
  const interviewState = useMemo(
    () => deriveInterviewState(runtime.recentActivity),
    [runtime.recentActivity],
  );
  const [draft, setDraft] = useState("");
  const [lastSavedMessage, setLastSavedMessage] = useState<string | null>(null);

  useEffect(() => {
    setDraft(window.localStorage.getItem(draftStorageKey(assessmentId)) ?? "");
    setLastSavedMessage(null);
  }, [assessmentId]);

  function persistDraft(value: string) {
    setDraft(value);
    window.localStorage.setItem(draftStorageKey(assessmentId), value);
  }

  function handleSubmit() {
    if (!interviewState.activeQuestion || draft.trim().length === 0) {
      return;
    }
    handleQuestionAnswer({
      questionId: interviewState.activeQuestion.id,
      freeText: draft,
    });
  }

  function handleQuestionAnswer(input: AssessmentQuestionAnswerInput) {
    window.localStorage.setItem(
      draftStorageKey(assessmentId),
      JSON.stringify({ questionId: input.questionId, input }),
    );
    setDraft("");
    setLastSavedMessage(t("pages.assessment.answerSavedForRuntime"));
  }

  function handleBlockedAction(action: AssessmentInterviewBlockedAction) {
    if (action === ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS.saveAndExit) {
      window.localStorage.setItem(draftStorageKey(assessmentId), draft);
      setLastSavedMessage(t("pages.assessment.draftSavedForResume"));
      return;
    }
    setLastSavedMessage(t("pages.assessment.blockedActionRecorded"));
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
            {runtime.currentRun?.activeTools.length ? (
              runtime.currentRun.activeTools.map((tool) => (
                <ToolActivityRow
                  key={`${tool.toolName}:${tool.startedAt ?? tool.attempt ?? "active"}`}
                  label={tool.summary || tool.toolName}
                  status={runtimeToolStatus(tool.status)}
                />
              ))
            ) : (
              <ToolActivityRow
                label={t("pages.assessment.runtimeWaitingForAgent")}
                status={TOOL_ACTIVITY_STATUSES.pending}
              />
            )}
          </div>
        </AgentTurn>

        {runtime.recentActivity.slice(0, 4).map((event) => (
          <AgentTurn key={event.eventId}>
            <p className="text-sm text-muted-foreground">{event.summary}</p>
          </AgentTurn>
        ))}

        {interviewState.activeQuestion ? (
          <AgentTurn>
            <AssessmentQuestionTurn
              question={interviewState.activeQuestion}
              blockedActions={interviewState.blockedActions ?? []}
              initialDraft={draft}
              onDraftChange={persistDraft}
              onSubmitAnswer={handleQuestionAnswer}
              onBlockedAction={handleBlockedAction}
            />
          </AgentTurn>
        ) : (
          <AgentTurn>
            <p className="text-sm text-muted-foreground">
              {t("pages.assessment.noActiveInterviewQuestion")}
            </p>
          </AgentTurn>
        )}

        {lastSavedMessage ? (
          <AgentTurn>
            <p className="text-sm text-muted-foreground">{lastSavedMessage}</p>
          </AgentTurn>
        ) : null}
      </AssessmentTranscript>

      <AssessmentComposer
        value={draft}
        onValueChange={persistDraft}
        onSubmit={handleSubmit}
      />
    </main>
  );
}

function deriveInterviewState(
  activity: WorkspaceRuntimeActivityItem[],
): AssessmentInterviewRuntimeState {
  for (const event of activity) {
    const state = findInterviewState(event.outputSummary) ?? findInterviewState(event.inputSummary);
    if (state?.activeQuestion) {
      return state;
    }
    if (state?.outcome === ASSESSMENT_INTERVIEW_OUTCOMES.blockedOrUnresolved) {
      return state;
    }
  }
  return { outcome: ASSESSMENT_INTERVIEW_OUTCOMES.waitingForCustomer };
}

function findInterviewState(
  value: WorkspaceRuntimeSummaryValue | null,
): AssessmentInterviewRuntimeState | null {
  const record = summaryRecord(value);
  if (!record) {
    return null;
  }

  const candidates = [
    record.assessmentInterview,
    record.interview,
    record.interviewRuntime,
    record.assessment_interview,
    record,
  ];

  for (const candidate of candidates) {
    const state = toInterviewState(candidate);
    if (state) {
      return state;
    }
  }
  return null;
}

function toInterviewState(value: unknown): AssessmentInterviewRuntimeState | null {
  const record = summaryRecord(value);
  if (!record || typeof record.outcome !== "string") {
    return null;
  }

  const activeQuestion = toInterviewQuestion(record.activeQuestion ?? record.active_question);
  return {
    outcome: record.outcome as AssessmentInterviewRuntimeState["outcome"],
    activeQuestion: activeQuestion ?? undefined,
    blockedActions: Array.isArray(record.blockedActions)
      ? record.blockedActions.filter(isBlockedAction)
      : Array.isArray(record.blocked_actions)
        ? record.blocked_actions.filter(isBlockedAction)
        : undefined,
  };
}

function toInterviewQuestion(value: unknown): AssessmentInterviewQuestion | null {
  const record = summaryRecord(value);
  if (
    !record ||
    typeof record.id !== "string" ||
    typeof record.intent !== "string" ||
    typeof record.control !== "string" ||
    typeof record.prompt !== "string"
  ) {
    return null;
  }

  return {
    id: record.id,
    intent: record.intent as AssessmentInterviewQuestion["intent"],
    control: record.control as AssessmentInterviewQuestion["control"],
    prompt: record.prompt,
    choices: Array.isArray(record.choices)
      ? record.choices.filter(isQuestionChoice)
      : undefined,
    priorAnswerSummary:
      typeof record.priorAnswerSummary === "string"
        ? record.priorAnswerSummary
        : undefined,
    whyEvidenceRefs: Array.isArray(record.whyEvidenceRefs)
      ? record.whyEvidenceRefs.filter((item): item is string => typeof item === "string")
      : undefined,
  };
}

function isQuestionChoice(
  value: unknown,
): value is NonNullable<AssessmentInterviewQuestion["choices"]>[number] {
  const record = summaryRecord(value);
  return !!record && typeof record.id === "string" && typeof record.label === "string";
}

function isBlockedAction(value: unknown): value is AssessmentInterviewBlockedAction {
  return Object.values(ASSESSMENT_INTERVIEW_BLOCKED_ACTIONS).includes(
    value as AssessmentInterviewBlockedAction,
  );
}

function summaryRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function runtimeToolStatus(status: string) {
  if (status === ASSESSMENT_RUNTIME_RUN_STATUSES.completed) {
    return TOOL_ACTIVITY_STATUSES.completed;
  }
  if (status === ASSESSMENT_RUNTIME_RUN_STATUSES.failed) {
    return TOOL_ACTIVITY_STATUSES.failed;
  }
  if (status === ASSESSMENT_RUNTIME_RUN_STATUSES.running) {
    return TOOL_ACTIVITY_STATUSES.running;
  }
  return TOOL_ACTIVITY_STATUSES.pending;
}

function draftStorageKey(assessmentId: string) {
  return `${DRAFT_STORAGE_PREFIX}${assessmentId}`;
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
