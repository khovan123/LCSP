"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AssessmentList } from "@/features/workspace/components/organisms/assessment-list";
import { getDeveloperTaskContext } from "@/lib/api/developer-task-client";
import { getAssessments } from "@/lib/api/workspace-client";
import { appLocale } from "@/lib/locale";

import type { AssessmentSummary } from "../../../workspace/types/workspace.types";

type SelectionState = "loading" | "loaded" | "access_revoked" | "error";

export function DeveloperTaskSelection() {
  const router = useRouter();
  const [state, setState] = useState<SelectionState>("loading");
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);

  useEffect(() => {
    let isActive = true;

    async function loadSelection() {
      const contextOutcome = await getDeveloperTaskContext();
      if (!isActive) return;
      if (contextOutcome.kind === "redirect") {
        router.replace(contextOutcome.location);
        return;
      }
      if (contextOutcome.kind === "access_revoked") {
        setAssessments([]);
        setState("access_revoked");
        return;
      }
      if (contextOutcome.kind !== "loaded") {
        setAssessments([]);
        setState("error");
        return;
      }
      if (contextOutcome.context.scope.type === "assessment") {
        router.replace(
          `/developer/assessments/${encodeURIComponent(contextOutcome.context.scope.assessment.id)}`,
        );
        return;
      }

      const assessmentsOutcome = await getAssessments();
      if (!isActive) return;
      if (assessmentsOutcome.kind !== "loaded") {
        setAssessments([]);
        setState("error");
        return;
      }
      setAssessments(assessmentsOutcome.assessments);
      setState("loaded");
    }

    void loadSelection().catch(() => {
      if (isActive) {
        setAssessments([]);
        setState("error");
      }
    });
    return () => {
      isActive = false;
    };
  }, [router]);

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

        {state === "access_revoked" ? (
          <Alert variant="destructive" data-component="blocked-banner">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
            </AlertDescription>
          </Alert>
        ) : null}
        {state === "error" ? (
          <Alert variant="destructive">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.errorTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.errorDetail")}
            </AlertDescription>
          </Alert>
        ) : null}

        {state === "loading" || state === "loaded" ? (
          <AssessmentList
            assessments={assessments}
            isLoading={state === "loading"}
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
