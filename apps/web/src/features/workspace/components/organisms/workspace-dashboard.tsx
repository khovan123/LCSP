"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  canCreateAssessment,
  getAssessments,
  getWorkspace,
} from "@/lib/api/workspace-client";

import { appLocale } from "@/lib/locale";
import type {
  AssessmentSummary,
  WorkspaceContext,
  WorkspaceErrorOutcome,
} from "../../types/workspace.types";
import { WorkspaceHeader } from "../molecules/workspace-header";
import { AssessmentList } from "./assessment-list";

export function WorkspaceDashboard() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [isLoadingAssessments, setIsLoadingAssessments] = useState(true);
  const [error, setError] = useState<WorkspaceErrorOutcome | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadWorkspace() {
      const workspaceOutcome = await getWorkspace();
      if (!isActive) {
        return;
      }

      if (workspaceOutcome.kind === "redirect") {
        router.replace(workspaceOutcome.location);
        return;
      }

      if (workspaceOutcome.kind === "error") {
        setError(workspaceOutcome);
        setIsLoadingAssessments(false);
        return;
      }

      setWorkspace(workspaceOutcome.workspace);
      const assessmentsOutcome = await getAssessments();
      if (!isActive) {
        return;
      }

      if (assessmentsOutcome.kind === "error") {
        setError(assessmentsOutcome);
        setIsLoadingAssessments(false);
        return;
      }

      setAssessments(assessmentsOutcome.assessments);
      setIsLoadingAssessments(false);
    }

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [router]);

  const openWizardLabel = resolveMessage(
    appLocale,
    "pages.workspace.openWizard" as Parameters<typeof resolveMessage>[1],
  );

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 text-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        {error ? (
          <Alert variant="destructive">
            <AlertTitle>{resolveMessage(appLocale, error.titleKey)}</AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, error.detailKey)}
            </AlertDescription>
          </Alert>
        ) : null}

        {workspace ? (
          <WorkspaceHeader
            title={resolveMessage(appLocale, "pages.workspace.pageTitle")}
            description={resolveMessage(
              appLocale,
              "pages.workspace.pageDescription",
            )}
            organizationLabel={resolveMessage(
              appLocale,
              "pages.workspace.organizationLabel",
            )}
            organizationName={workspace.organization.name}
            membershipRoleLabel={resolveMessage(
              appLocale,
              "pages.workspace.membershipRoleLabel",
            )}
            membershipRole={workspace.membership.role}
            createAssessmentLabel={resolveMessage(
              appLocale,
              "pages.workspace.createAssessment",
            )}
            showCreateAssessment={canCreateAssessment(
              workspace.granted_actions,
            )}
          />
        ) : null}

        <AssessmentList
          assessments={assessments}
          isLoading={isLoadingAssessments}
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
          getAssessmentHref={(assessment) =>
            `/assessments/${assessment.id}/wizard`
          }
          openAssessmentLabel={openWizardLabel}
        />
      </div>
    </main>
  );
}
