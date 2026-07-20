"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListChecksIcon } from "lucide-react";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { AssessmentList } from "@/features/workspace/components/organisms/assessment-list";
import { WorkspaceSidebar } from "@/features/workspace/components/organisms/workspace-sidebar";
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

  const navigationLabel = resolveMessage(
    appLocale,
    "pages.developerTask.navigationLabel",
  );

  return (
    <SidebarProvider>
      <WorkspaceSidebar
        productName="LCSP"
        navigationLabel={navigationLabel}
        mobileTitle={resolveMessage(appLocale, "pages.developerTask.sidebarTitle")}
        mobileDescription={resolveMessage(
          appLocale,
          "pages.developerTask.sidebarDescription",
        )}
        items={[
          {
            href: "/developer/assessments",
            label: resolveMessage(appLocale, "pages.developerTask.taskNav"),
            icon: ListChecksIcon,
          },
        ]}
      />
      <SidebarInset>
        <main className="flex min-h-dvh flex-col gap-6 bg-background px-6 py-8 text-foreground">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
            <SidebarTrigger
              label={resolveMessage(appLocale, "pages.developerTask.sidebarToggle")}
            />
            <span className="text-sm text-muted-foreground">{navigationLabel}</span>
          </div>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
            <header>
              <h1 className="text-3xl font-semibold tracking-tight">
                {resolveMessage(appLocale, "pages.developerTask.selectionTitle")}
              </h1>
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
                statusLabel={resolveMessage(appLocale, "pages.workspace.statusLabel")}
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
      </SidebarInset>
    </SidebarProvider>
  );
}
