"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssessmentList } from "@/features/workspace/components/organisms/assessment-list";
import { useDeveloperTaskContextQuery } from "@/lib/api/developer-task-queries";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";
import { useAssessmentsQuery } from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";
import { DEVELOPER_TASK_SCOPE_TYPES } from "../../types/developer-task.types";

const DEVELOPER_TASK_SELECTION_STATES = {
  loading: "loading",
  loaded: API_OUTCOME_KINDS.loaded,
  accessRevoked: API_OUTCOME_KINDS.accessRevoked,
  error: API_OUTCOME_KINDS.error,
} as const;

type SelectionState =
  (typeof DEVELOPER_TASK_SELECTION_STATES)[keyof typeof DEVELOPER_TASK_SELECTION_STATES];

export function DeveloperTaskSelection() {
  const router = useRouter();
  const contextQuery = useDeveloperTaskContextQuery();
  const assessmentsQuery = useAssessmentsQuery();

  useEffect(() => {
    const contextOutcome = contextQuery.data;
    if (!contextOutcome) {
      return;
    }
    if (contextOutcome.kind === API_OUTCOME_KINDS.redirect) {
      router.replace(contextOutcome.location);
      return;
    }
    if (
      contextOutcome.kind === API_OUTCOME_KINDS.loaded &&
      contextOutcome.context.scope.type === DEVELOPER_TASK_SCOPE_TYPES.assessment
    ) {
      router.replace(
        `/developer/assessments/${encodeURIComponent(contextOutcome.context.scope.assessment.id)}`,
      );
    }
  }, [contextQuery.data, router]);

  const contextOutcome = contextQuery.data;
  const assessmentsOutcome = assessmentsQuery.data;
  const assessments =
    assessmentsOutcome?.kind === "loaded" ? assessmentsOutcome.assessments : [];
  const state: SelectionState = contextQuery.isLoading
    ? DEVELOPER_TASK_SELECTION_STATES.loading
    : contextOutcome?.kind === API_OUTCOME_KINDS.accessRevoked
      ? DEVELOPER_TASK_SELECTION_STATES.accessRevoked
      : contextOutcome?.kind !== API_OUTCOME_KINDS.loaded ||
          assessmentsOutcome?.kind === API_OUTCOME_KINDS.error
        ? DEVELOPER_TASK_SELECTION_STATES.error
        : assessmentsQuery.isLoading
          ? DEVELOPER_TASK_SELECTION_STATES.loading
          : DEVELOPER_TASK_SELECTION_STATES.loaded;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 text-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="max-w-3xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.developerTask.selectionTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {resolveMessage(appLocale, "pages.developerTask.selectionDescription")}
          </p>
        </header>

        {state === DEVELOPER_TASK_SELECTION_STATES.accessRevoked ? (
          <Alert variant="destructive" data-component="blocked-banner">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
            </AlertDescription>
          </Alert>
        ) : null}
        {state === DEVELOPER_TASK_SELECTION_STATES.error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.errorTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.errorDetail")}
            </AlertDescription>
          </Alert>
        ) : null}

        {state === DEVELOPER_TASK_SELECTION_STATES.loading ||
        state === DEVELOPER_TASK_SELECTION_STATES.loaded ? (
          <AssessmentList
            assessments={assessments}
            isLoading={state === DEVELOPER_TASK_SELECTION_STATES.loading}
            title={resolveMessage(appLocale, "pages.workspace.assessmentsTitle")}
            description={resolveMessage(
              appLocale,
              "pages.developerTask.selectionDescription",
            )}
            emptyTitle={resolveMessage(appLocale, "pages.workspace.emptyTitle")}
            emptyDescription={resolveMessage(
              appLocale,
              "pages.developerTask.emptyDescription",
            )}
            loadingLabel={resolveMessage(
              appLocale,
              "pages.workspace.loadingAssessments",
            )}
            statusLabel={resolveMessage(
              appLocale,
              "pages.workspace.statusLabel",
            )}
            wizardStatusLabel={resolveMessage(
              appLocale,
              "pages.workspace.wizardStatusLabel",
            )}
            createdAtLabel={resolveMessage(
              appLocale,
              "pages.workspace.createdAtLabel",
            )}
            getAssessmentHref={(assessment) =>
              `/developer/assessments/${encodeURIComponent(assessment.id)}`
            }
            openAssessmentLabel={resolveMessage(
              appLocale,
              "pages.developerTask.openAssessment",
            )}
          />
        ) : null}
      </div>
    </main>
  );
}
