"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  canCreateAssessment,
  getAssessmentStatusLabelKey,
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

export function WorkspaceDashboard() {
  const router = useRouter();
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
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
        return;
      }

      setWorkspace(workspaceOutcome.workspace);
      const assessmentsOutcome = await getAssessments();
      if (!isActive) return;
      if (assessmentsOutcome.kind === "error") {
        setError(assessmentsOutcome);
        return;
      }
      setAssessments(assessmentsOutcome.assessments);
    }

    void loadWorkspace();

    return () => {
      isActive = false;
    };
  }, [router]);

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
            onCreateAssessment={() => router.push("/assessments/new")}
          />
        ) : null}

        <WorkspaceOverview assessments={assessments} />
      </div>
    </main>
  );
}

function WorkspaceOverview({
  assessments,
}: {
  assessments: AssessmentSummary[];
}) {
  const attention = assessments.filter(
    (assessment) => assessment.status !== "READY_FOR_REVIEW",
  ).length;
  const ready = assessments.filter(
    (assessment) => assessment.status === "READY_FOR_REVIEW",
  ).length;
  const recent = [...assessments]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  return (
    <>
      <section
        className="grid gap-4 sm:grid-cols-3"
        aria-label={resolveMessage(appLocale, "pages.workspace.insightsTitle")}
      >
        <OverviewMetric
          labelKey="pages.workspace.totalAssessments"
          value={assessments.length}
        />
        <OverviewMetric
          labelKey="pages.workspace.needsAttention"
          value={attention}
        />
        <OverviewMetric
          labelKey="pages.workspace.readyForReview"
          value={ready}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.recentAssessmentsTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.recentAssessmentsDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            className={buttonVariants({ variant: "outline" })}
            href="/assessments"
          >
            {resolveMessage(appLocale, "pages.workspace.openAssessments")}
          </Link>
          {recent.length ? (
            recent.map((assessment) => (
              <Link
                key={assessment.id}
                href={`/assessments/${assessment.id}`}
                className="flex items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <span className="font-medium">{assessment.name}</span>
                <Badge variant="outline">
                  {resolveMessage(
                    appLocale,
                    getAssessmentStatusLabelKey(assessment.status),
                  )}
                </Badge>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {resolveMessage(appLocale, "pages.workspace.emptyDescription")}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

function OverviewMetric({
  labelKey,
  value,
}: {
  labelKey: Parameters<typeof resolveMessage>[1];
  value: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{resolveMessage(appLocale, labelKey)}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
