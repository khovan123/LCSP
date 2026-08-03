"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useTechnicalEvidenceQuery } from "@/lib/api/assessment-queries";
import { useDeveloperTaskContextQuery } from "@/lib/api/developer-task-queries";
import { appLocale } from "@/lib/locale";
import {
  API_OUTCOME_KINDS,
} from "@/lib/api/outcome-kinds";

import { RedactedFindingsList } from "./redacted-findings-list";
import { ScopeSummaryCard } from "./scope-summary-card";
import type { DeveloperTaskWorkspaceProps } from "../../types/component-props.types";
import { DEVELOPER_TASK_SCOPE_TYPES } from "../../types/developer-task.types";

const DEVELOPER_TASK_PAGE_STATES = {
  loading: "loading",
  loaded: API_OUTCOME_KINDS.loaded,
  empty: API_OUTCOME_KINDS.empty,
  accessRevoked: API_OUTCOME_KINDS.accessRevoked,
  error: API_OUTCOME_KINDS.error,
} as const;

type PageState =
  (typeof DEVELOPER_TASK_PAGE_STATES)[keyof typeof DEVELOPER_TASK_PAGE_STATES];

export function DeveloperTaskWorkspace({
  assessmentId,
}: DeveloperTaskWorkspaceProps) {
  const router = useRouter();
  const contextQuery = useDeveloperTaskContextQuery();
  const evidenceQuery = useTechnicalEvidenceQuery(assessmentId);

  useEffect(() => {
    const contextOutcome = contextQuery.data;
    const evidenceOutcome = evidenceQuery.data;
    if (contextOutcome?.kind === API_OUTCOME_KINDS.redirect) {
      router.replace(contextOutcome.location);
      return;
    }
    if (evidenceOutcome?.kind === API_OUTCOME_KINDS.redirect) {
      router.replace(evidenceOutcome.location);
    }
  }, [contextQuery.data, evidenceQuery.data, router]);

  const contextOutcome = contextQuery.data;
  const evidenceOutcome = evidenceQuery.data;
  const context =
    contextOutcome?.kind === API_OUTCOME_KINDS.loaded
      ? contextOutcome.context
      : null;
  const findings =
    evidenceOutcome?.kind === API_OUTCOME_KINDS.loaded
      ? evidenceOutcome.findings
      : [];
  const scopeMismatch =
    context?.scope.type === DEVELOPER_TASK_SCOPE_TYPES.assessment &&
    context.scope.assessment.id !== assessmentId;
  const pageState: PageState =
    contextQuery.isLoading || evidenceQuery.isLoading
      ? DEVELOPER_TASK_PAGE_STATES.loading
      : contextOutcome?.kind === API_OUTCOME_KINDS.accessRevoked ||
          evidenceOutcome?.kind === API_OUTCOME_KINDS.accessRevoked ||
          scopeMismatch
        ? DEVELOPER_TASK_PAGE_STATES.accessRevoked
        : contextOutcome?.kind !== API_OUTCOME_KINDS.loaded ||
            evidenceOutcome?.kind === API_OUTCOME_KINDS.error
          ? DEVELOPER_TASK_PAGE_STATES.error
          : evidenceOutcome?.kind === API_OUTCOME_KINDS.empty ||
              findings.length === 0
            ? DEVELOPER_TASK_PAGE_STATES.empty
            : DEVELOPER_TASK_PAGE_STATES.loaded;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 text-foreground lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="max-w-3xl">
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.developerTask.pageTitle")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {resolveMessage(appLocale, "pages.developerTask.pageDescription")}
          </p>
        </header>

        {pageState === DEVELOPER_TASK_PAGE_STATES.loading ? (
          <p role="status" className="text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.developerTask.loading")}
          </p>
        ) : null}

        {pageState === DEVELOPER_TASK_PAGE_STATES.accessRevoked ? (
          <Alert variant="destructive" data-component="blocked-banner">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.revokedTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.revokedDetail")}
            </AlertDescription>
          </Alert>
        ) : null}

        {pageState === DEVELOPER_TASK_PAGE_STATES.error ? (
          <Alert variant="destructive">
            <AlertTitle>
              {resolveMessage(appLocale, "pages.developerTask.errorTitle")}
            </AlertTitle>
            <AlertDescription>
              {resolveMessage(appLocale, "pages.developerTask.errorDetail")}
            </AlertDescription>
          </Alert>
        ) : null}

        {context &&
        (pageState === DEVELOPER_TASK_PAGE_STATES.loaded ||
          pageState === DEVELOPER_TASK_PAGE_STATES.empty) ? (
          <>
            <ScopeSummaryCard context={context} />
            <RedactedFindingsList findings={findings} />
          </>
        ) : null}
      </div>
    </main>
  );
}
