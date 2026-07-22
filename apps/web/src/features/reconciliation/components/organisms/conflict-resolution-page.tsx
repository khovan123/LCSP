"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import {
  getPendingConflicts,
  resolveConflict,
  type ConflictSummary,
} from "@/lib/api/conflict-client";
import { appLocale } from "@/lib/locale";

import { ConflictCard } from "../molecules/conflict-card";
import type { ConflictResolutionViewState } from "../../types/conflict.types";

export function ConflictResolutionPage({ assessmentId }: { assessmentId: string }) {
  const router = useRouter();
  const isMountedRef = useRef(true);
  const [viewState, setViewState] = useState<ConflictResolutionViewState>("loading");
  const [conflicts, setConflicts] = useState<ConflictSummary[]>([]);
  const [submittingIds, setSubmittingIds] = useState<Record<string, boolean>>({});
  const [resolutions, setResolutions] = useState<Record<string, "RESOLVED" | "DISMISSED">>({});
  const [resolutionNotes, setResolutionNotes] = useState<Record<string, string>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});

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

  const syncConflictDrafts = useCallback((items: ConflictSummary[]) => {
    const idSet = new Set(items.map((item) => item.conflict_id));
    setResolutions((prev) => {
      const next: Record<string, "RESOLVED" | "DISMISSED"> = {};
      for (const item of items) {
        next[item.conflict_id] = prev[item.conflict_id] ?? "RESOLVED";
      }
      return next;
    });
    setResolutionNotes((prev) => {
      const next: Record<string, string> = {};
      for (const item of items) {
        next[item.conflict_id] = prev[item.conflict_id] ?? "";
      }
      return next;
    });
    setFormErrors((prev) => {
      const next: Record<string, string | null> = {};
      for (const item of items) {
        next[item.conflict_id] = prev[item.conflict_id] ?? null;
      }
      return next;
    });
    setSubmittingIds((prev) => {
      const next: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(prev)) {
        if (idSet.has(key)) {
          next[key] = value;
        }
      }
      return next;
    });
  }, []);

  const applyConflictListOutcome = useCallback(
    (
      outcome: Awaited<ReturnType<typeof getPendingConflicts>>,
      options?: { allowRedirect?: boolean },
    ) => {
      if (!isMountedRef.current) {
        return;
      }

      if (outcome.kind === "redirect") {
        if (options?.allowRedirect !== false) {
          router.replace(outcome.location);
        }
        return;
      }

      if (outcome.kind === "access_revoked") {
        setViewState("access_revoked");
        setConflicts([]);
        return;
      }

      if (outcome.kind === "error") {
        setViewState("error");
        setConflicts([]);
        return;
      }

      if (outcome.kind === "empty") {
        setViewState("empty");
        setConflicts([]);
        return;
      }

      setConflicts(outcome.data.conflicts);
      syncConflictDrafts(outcome.data.conflicts);
      setViewState(outcome.data.conflicts.length === 0 ? "empty" : "loaded");
    },
    [router, syncConflictDrafts],
  );

  const loadConflicts = useCallback(async () => {
    const outcome = await getPendingConflicts(assessmentId);
    applyConflictListOutcome(outcome);
  }, [applyConflictListOutcome, assessmentId]);

  useEffect(() => {
    isMountedRef.current = true;
    let active = true;

    void (async () => {
      if (!active) {
        return;
      }
      setViewState("loading");
      const outcome = await getPendingConflicts(assessmentId);
      if (!active) {
        return;
      }
      applyConflictListOutcome(outcome);
    })();

    return () => {
      active = false;
      isMountedRef.current = false;
    };
  }, [applyConflictListOutcome, assessmentId]);

  const headingDescription = useMemo(
    () => resolveMessage(appLocale, "pages.reconciliation.pageDescription"),
    [],
  );

  async function handleResolve(conflict: ConflictSummary) {
    const conflictId = conflict.conflict_id;
    const resolution = resolutions[conflictId] ?? "RESOLVED";
    const note = resolutionNotes[conflictId] ?? "";

    setSubmittingIds((prev) => ({ ...prev, [conflictId]: true }));
    setFormErrors((prev) => ({ ...prev, [conflictId]: null }));

    const outcome = await resolveConflict(assessmentId, conflictId, {
      resolution,
      resolution_note: note,
    });

    if (outcome.kind === "validation_error") {
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

    if (outcome.kind === "redirect") {
      router.replace(outcome.location);
      return;
    }

    if (outcome.kind === "access_revoked") {
      setViewState("access_revoked");
      setConflicts([]);
      return;
    }

    if (outcome.kind === "already_resolved") {
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

    if (outcome.kind === "not_found") {
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

    if (outcome.kind === "error") {
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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {resolveMessage(appLocale, "pages.reconciliation.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{headingDescription}</p>
      </header>

      {viewState === "loading" ? (
        <p className="text-sm text-muted-foreground" role="status">
          {resolveMessage(appLocale, "pages.reconciliation.loading")}
        </p>
      ) : null}

      {viewState === "access_revoked" ? (
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(appLocale, "pages.reconciliation.accessRevokedTitle")}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(appLocale, "pages.reconciliation.accessRevokedDetail")}
          </AlertDescription>
        </Alert>
      ) : null}

      {viewState === "error" ? (
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(appLocale, "pages.reconciliation.errorTitle")}
          </AlertTitle>
          <AlertDescription>
            {resolveMessage(appLocale, "pages.reconciliation.errorDetail")}
          </AlertDescription>
        </Alert>
      ) : null}

      {viewState === "empty" ? (
        <Empty className="rounded-xl border bg-card">
          <EmptyHeader>
            <EmptyTitle>
              {resolveMessage(appLocale, "pages.reconciliation.allResolvedTitle")}
            </EmptyTitle>
            <EmptyDescription>
              {resolveMessage(appLocale, "pages.reconciliation.allResolvedDetail")}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {viewState === "loaded" ? (
        <section className="grid gap-4" aria-label={resolveMessage(appLocale, "pages.reconciliation.pendingSectionLabel")}>
          {conflicts.map((conflict) => {
            const conflictId = conflict.conflict_id;
            return (
              <ConflictCard
                key={conflictId}
                conflict={conflict}
                resolution={resolutions[conflictId] ?? "RESOLVED"}
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
