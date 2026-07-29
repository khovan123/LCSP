"use client";

import { resolveMessage } from "@lcsp/i18n";
import { useEffect, useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAssessments } from "@/lib/api/workspace-client";
import { appLocale } from "@/lib/locale";

import type { AssessmentSummary } from "../../types/workspace.types";
import { AssessmentList } from "./assessment-list";

export function AssessmentsDirectory() {
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let active = true;
    void getAssessments().then((outcome) => {
      if (!active) return;
      if (outcome.kind === "error") setHasError(true);
      else setAssessments(outcome.assessments);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      {hasError ? (
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.errors.assessmentsUnavailableTitle",
            )}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.errors.assessmentsUnavailableDetail",
            )}
          </AlertDescription>
        </Alert>
      ) : null}
      <AssessmentList
        assessments={assessments}
        isLoading={isLoading}
        title={resolveMessage(appLocale, "pages.workspace.assessmentsTitle")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.assessmentsDescription",
        )}
        emptyTitle={resolveMessage(appLocale, "pages.workspace.emptyTitle")}
        emptyDescription={resolveMessage(
          appLocale,
          "pages.workspace.emptyDescription",
        )}
        loadingLabel={resolveMessage(
          appLocale,
          "pages.workspace.loadingAssessments",
        )}
        statusLabel={resolveMessage(appLocale, "pages.workspace.statusLabel")}
        wizardStatusLabel={resolveMessage(
          appLocale,
          "pages.workspace.wizardStatusLabel",
        )}
        createdAtLabel={resolveMessage(
          appLocale,
          "pages.workspace.createdAtLabel",
        )}
        getAssessmentHref={(assessment) => `/assessments/${assessment.id}`}
        openAssessmentLabel={resolveMessage(
          appLocale,
          "pages.assessment.openOverview",
        )}
      />
    </main>
  );
}
