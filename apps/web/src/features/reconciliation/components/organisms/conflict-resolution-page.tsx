"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CONFLICT_RECORD_STATUSES } from "@lcsp/contracts/scan";
import { resolveMessage } from "@lcsp/i18n";
import { ScaleIcon } from "lucide-react";

import { SectionHeading } from "@/components/molecules/section-heading";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import type {
  ConflictListOutcome,
  ConflictSummary,
} from "@/lib/api/conflict-client";
import {
  usePendingConflictsQuery,
  useResolveConflictMutation,
} from "@/lib/api/assessment-queries";
import { API_OUTCOME_KINDS } from "@/lib/api/outcome-kinds";
import { useWorkspaceQuery } from "@/lib/api/workspace-queries";
import { appLocale } from "@/lib/locale";

import { ConflictCard } from "../molecules/conflict-card";
import {
  CONFLICT_RESOLUTION_VIEW_STATES,
  type ConflictResolutionDraftMap,
  type ConflictResolutionErrorMap,
  type ConflictResolutionNoteMap,
  type ConflictResolutionPageProps,
  type ConflictResolutionStatusMap,
  type ConflictResolutionViewState,
} from "../../types/conflict.types";

export function ConflictResolutionPage({
  assessmentId,
}: ConflictResolutionPageProps) {
  const router = useRouter();
  const [viewStateOverride, setViewStateOverride] =
    useState<ConflictResolutionViewState | null>(null);
  const [submittingIds, setSubmittingIds] = useState<ConflictResolutionDraftMap>({});
  const [resolutions, setResolutions] = useState<ConflictResolutionStatusMap>({});
  const [resolutionNotes, setResolutionNotes] = useState<ConflictResolutionNoteMap>({});
  const [formErrors, setFormErrors] = useState<ConflictResolutionErrorMap>({});
  const conflictsQuery = usePendingConflictsQuery(assessmentId);
  const resolveConflictMutation = useResolveConflictMutation(assessmentId);
  const workspaceQuery = useWorkspaceQuery();
  const nextStepHref =
    workspaceQuery.data?.kind === API_OUTCOME_KINDS.loaded
      ? "/workspace#assessments"
      : null;

  const clearConflictDraft = useCallback((conflictId: string) => {
    setSubmittingIds((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
    setResolutions((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
    setResolutionNotes((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[conflictId];
      return next;
    });
  }, []);

  const loadConflicts = useCallback(async () => {
    await conflictsQuery.refetch();
  }, [conflictsQuery]);

  useEffect(() => {
    if (conflictsQuery.data?.kind === API_OUTCOME_KINDS.redirect) {
      router.replace(conflictsQuery.data.location);
    }
  }, [conflictsQuery.data, router]);

  const conflictOutcome: ConflictListOutcome | undefined = conflictsQuery.data;
  const conflicts =
    conflictOutcome?.kind === API_OUTCOME_KINDS.loaded
      ? conflictOutcome.data.conflicts
      : [];
  const queryViewState: ConflictResolutionViewState = conflictsQuery.isLoading
    ? CONFLICT_RESOLUTION_VIEW_STATES.loading
    : conflictOutcome?.kind === API_OUTCOME_KINDS.accessRevoked
      ? CONFLICT_RESOLUTION_VIEW_STATES.accessRevoked
      : conflictOutcome?.kind === API_OUTCOME_KINDS.error
        ? CONFLICT_RESOLUTION_VIEW_STATES.error
        : conflictOutcome?.kind === API_OUTCOME_KINDS.empty
          ? CONFLICT_RESOLUTION_VIEW_STATES.empty
          : conflictOutcome?.kind === API_OUTCOME_KINDS.loaded
            ? CONFLICT_RESOLUTION_VIEW_STATES.loaded
            : CONFLICT_RESOLUTION_VIEW_STATES.error;
  const viewState = viewStateOverride ?? queryViewState;

  const headingDescription = useMemo(
    () => resolveMessage(appLocale, "pages.reconciliation.pageDescription"),
    [],
  );

  async function handleResolve(conflict: ConflictSummary) {
    const conflictId = conflict.conflict_id;
    const resolution =
      resolutions[conflictId] ?? CONFLICT_RECORD_STATUSES.resolved;
    const note = resolutionNotes[conflictId] ?? "";

    setSubmittingIds((prev) => ({ ...prev, [conflictId]: true }));
    setFormErrors((prev) => ({ ...prev, [conflictId]: null }));

    const outcome = await resolveConflictMutation.mutateAsync({
      conflictId,
      request: {
        resolution,
        resolution_note: note,
      },
    });

    if (outcome.kind === API_OUTCOME_KINDS.validationError) {
      setSubmittingIds((prev) => ({ ...prev, [conflictId]: false }));
      setFormErrors((prev) => ({
        ...prev,
        [conflictId]: resolveMessage(
          appLocale,
          "pages.reconciliation.errors.dismissReasonRequired",
        ),
      }));
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.redirect) {
      router.replace(outcome.location);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.accessRevoked) {
      setViewStateOverride(CONFLICT_RESOLUTION_VIEW_STATES.accessRevoked);
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.alreadyResolved) {
      setSubmittingIds((prev) => ({ ...prev, [conflictId]: false }));
      setFormErrors((prev) => ({
        ...prev,
        [conflictId]: resolveMessage(
          appLocale,
          "pages.reconciliation.errors.alreadyResolved",
        ),
      }));
      await loadConflicts();
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.notFound) {
      setSubmittingIds((prev) => ({ ...prev, [conflictId]: false }));
      setFormErrors((prev) => ({
        ...prev,
        [conflictId]: resolveMessage(
          appLocale,
          "pages.reconciliation.errors.conflictNotFound",
        ),
      }));
      await loadConflicts();
      return;
    }

    if (outcome.kind === API_OUTCOME_KINDS.error) {
      setSubmittingIds((prev) => ({ ...prev, [conflictId]: false }));
      setFormErrors((prev) => ({
        ...prev,
        [conflictId]: resolveMessage(
          appLocale,
          "pages.reconciliation.errors.resolveFailed",
        ),
      }));
      return;
    }

    clearConflictDraft(conflictId);
    await loadConflicts();
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.reconciliation.pageTitle")}
        description={headingDescription}
        icon={<ScaleIcon className="size-4" />}
      />

      {conflictsQuery.isLoading ||
      viewState === CONFLICT_RESOLUTION_VIEW_STATES.loading ? (
        <p className="text-sm text-muted-foreground" role="status">
          {resolveMessage(appLocale, "pages.reconciliation.loading")}
        </p>
      ) : null}

      {viewState === CONFLICT_RESOLUTION_VIEW_STATES.accessRevoked ? (
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(appLocale, "pages.reconciliation.accessRevokedTitle")}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(appLocale, "pages.reconciliation.accessRevokedDetail")}
          </AlertDescription>
        </Alert>
      ) : null}

      {viewState === CONFLICT_RESOLUTION_VIEW_STATES.error ? (
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(appLocale, "pages.reconciliation.errorTitle")}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(appLocale, "pages.reconciliation.errorDetail")}
          </AlertDescription>
        </Alert>
      ) : null}

      {viewState === CONFLICT_RESOLUTION_VIEW_STATES.empty ? (
        <Empty className="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyTitle>
              {resolveMessage(appLocale, "pages.reconciliation.allResolvedTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {resolveMessage(appLocale, "pages.reconciliation.allResolvedDetail")}
            </EmptyDescription>
          </EmptyHeader>
          {nextStepHref ? (
            <EmptyContent>
              <p className="text-sm text-muted-foreground">
                {resolveMessage(appLocale, "pages.reconciliation.nextStepHint")}
              </p>
              <Link
                href={nextStepHref}
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {resolveMessage(appLocale, "pages.reconciliation.nextStepAction")}
              </Link>
            </EmptyContent>
          ) : null}
        </Empty>
      ) : null}

      {viewState === CONFLICT_RESOLUTION_VIEW_STATES.loaded ? (
        <section className="grid gap-4" aria-label={resolveMessage(appLocale, "pages.reconciliation.pendingSectionLabel")}>
          {conflicts.map((conflict) => {
            const conflictId = conflict.conflict_id;
            return (
              <ConflictCard
                key={conflictId}
                conflict={conflict}
                resolution={
                  resolutions[conflictId] ?? CONFLICT_RECORD_STATUSES.resolved
                }
                resolutionNote={resolutionNotes[conflictId] ?? ""}
                isSubmitting={Boolean(submittingIds[conflictId])}
                formError={formErrors[conflictId] ?? null}
                onResolutionChange={(value) =>
                  setResolutions((prev) => ({ ...prev, [conflictId]: value }))
                }
                onResolutionNoteChange={(value) =>
                  setResolutionNotes((prev) => ({ ...prev, [conflictId]: value }))
                }
                onSubmit={() => {
                  void handleResolve(conflict);
                }}
              />
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
