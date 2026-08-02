"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";
import { READINESS_EXPORT_DOWNLOAD_STATES } from "@lcsp/contracts/wizard";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ClassificationStatusCard } from "@/components/ui/classification-status-card";
import { appLocale } from "@/lib/locale";
import { cn } from "@/lib/utils";
import {
  useGenerateReadinessExportMutation,
  useReadinessExportHistoryQuery,
  useReadinessStatusQuery,
} from "@/lib/api/assessment-queries";

export function ReadinessStatusPage({
  assessmentId,
}: {
  assessmentId: string;
}) {
  const router = useRouter();
  const readinessQuery = useReadinessStatusQuery(assessmentId);
  const exportHistory = useReadinessExportHistoryQuery(assessmentId);
  const generateExport = useGenerateReadinessExportMutation(assessmentId);

  useEffect(() => {
    if (readinessQuery.data?.kind === "redirect") {
      router.replace(readinessQuery.data.location);
    }
    if (generateExport.data?.kind === "redirect") {
      router.replace(generateExport.data.location);
    }
  }, [generateExport.data, readinessQuery.data, router]);

  const headingDescription = useMemo(
    () => t("pages.readiness.pageDescription"),
    [],
  );

  if (readinessQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("pages.readiness.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{headingDescription}</p>
        </header>
        <ClassificationStatusCard
          title={t("pages.readiness.pageTitle")}
          description={t("pages.readiness.loadingDetail")}
          badgeLabel={t("pages.readiness.badgeReadinessOnly")}
          badgeVariant="secondary"
        >
          <div className="py-2 text-sm text-muted-foreground">
            {t("pages.readiness.loading")}
          </div>
        </ClassificationStatusCard>
      </div>
    );
  }

  const viewModel =
    readinessQuery.data?.kind === "loaded" ? readinessQuery.data.data : null;
  const error =
    readinessQuery.data?.kind === "error"
      ? t(readinessQuery.data.titleKey)
      : null;

  if (error || !viewModel) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="space-y-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t("pages.readiness.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{headingDescription}</p>
        </header>
        <Alert variant="destructive">
          <AlertTitle>{t("pages.readiness.errorTitle")}</AlertTitle>
          <AlertDescription>
            {error ?? t("pages.readiness.errorDetail")}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="space-y-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {t("pages.readiness.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{headingDescription}</p>
      </header>

      <ClassificationStatusCard
        title={t("pages.readiness.summaryTitle")}
        description={t("pages.readiness.summaryDescription")}
        badgeLabel={
          viewModel.classificationLocked
            ? t("pages.readiness.badgeLocked")
            : t("pages.readiness.badgeReady")
        }
        badgeVariant={viewModel.classificationLocked ? "secondary" : "default"}
      >
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">
            {t("pages.readiness.badgeReadinessOnly")}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {t("pages.readiness.updatedAtLabel")}:{" "}
            {formatDate(viewModel.updatedAt)}
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border bg-muted/30 p-4">
            <h2 className="text-sm font-medium">
              {t("pages.readiness.completedTitle")}
            </h2>
            {viewModel.completedSteps.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {viewModel.completedSteps.map((step) => (
                  <li key={step}>• {mapCompletedStep(step)}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("pages.readiness.noCompletedSteps")}
              </p>
            )}
          </section>

          <section className="rounded-lg border bg-muted/30 p-4">
            <h2 className="text-sm font-medium">
              {t("pages.readiness.missingTitle")}
            </h2>
            {viewModel.missingEvidence.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {viewModel.missingEvidence.map((item) => (
                  <li key={item.type}>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p>{mapMissingEvidence(item.type, item.description)}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                {t("pages.readiness.noMissingEvidence")}
              </p>
            )}
          </section>
        </div>

        <section className="rounded-lg border bg-muted/30 p-4">
          <h2 className="text-sm font-medium">
            {t("pages.readiness.unresolvedUnknownsTitle")}
          </h2>
          {viewModel.unresolvedUnknownItems.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              {viewModel.unresolvedUnknownItems.map((item) => (
                <li key={item.questionId}>• {item.label}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("pages.readiness.noUnresolvedUnknowns")}
            </p>
          )}
        </section>

        <section className="rounded-lg border border-dashed p-4">
          <h2 className="text-sm font-medium">
            {t("pages.readiness.nextActionTitle")}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {viewModel.nextAction}
          </p>
        </section>

        {generateExport.data?.kind === "created" ? (
          <Alert>
            <AlertTitle>{t("pages.readiness.exportGeneratedTitle")}</AlertTitle>
            <AlertDescription>
              {t("pages.readiness.exportGeneratedDetail").replace(
                "{version}",
                String(generateExport.data.data.version),
              )}
            </AlertDescription>
          </Alert>
        ) : null}

        {generateExport.data?.kind === "blocked" ||
        generateExport.data?.kind === "error" ||
        generateExport.isError ? (
          <Alert variant="destructive">
            <AlertTitle>
              {generateExport.data?.kind === "blocked"
                ? t(generateExport.data.titleKey)
                : t("pages.readiness.exportErrorTitle")}
            </AlertTitle>
            <AlertDescription>
              {generateExport.data?.kind === "blocked"
                ? t(generateExport.data.detailKey)
                : t("pages.readiness.exportErrorDetail")}
            </AlertDescription>
          </Alert>
        ) : null}

        <section className="rounded-lg border p-4">
          <h2 className="text-sm font-medium">
            {t("pages.readiness.exportHistoryTitle")}
          </h2>
          {exportHistory.isLoading ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("pages.readiness.exportHistoryLoading")}
            </p>
          ) : exportHistory.data && exportHistory.data.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {exportHistory.data.map((artifact) => (
                <li
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                  key={artifact.export_id}
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {artifact.title}
                      </span>
                      <Badge variant="outline">
                        {t("pages.readiness.badgeReadinessOnly")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t("pages.readiness.exportVersionLabel").replace(
                        "{version}",
                        String(artifact.version),
                      )}
                      {" · "}
                      {formatDate(artifact.generated_at)}
                    </p>
                  </div>
                  {artifact.download_state ===
                  READINESS_EXPORT_DOWNLOAD_STATES.ready ? (
                    <Link
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                      )}
                      download
                      href={`/api/assessments/${encodeURIComponent(assessmentId)}/wizard/readiness-exports/${encodeURIComponent(artifact.export_id)}/download`}
                    >
                      {t("pages.readiness.actions.downloadExport")}
                    </Link>
                  ) : (
                    <Badge variant="secondary">
                      {t("pages.readiness.exportUnavailable")}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              {t("pages.readiness.exportHistoryEmpty")}
            </p>
          )}
        </section>

        <div className="flex flex-wrap gap-3">
          <Button
            disabled={
              !viewModel.classificationLocked || generateExport.isPending
            }
            onClick={() => generateExport.mutate()}
            type="button"
          >
            {generateExport.isPending
              ? t("pages.readiness.actions.generatingExport")
              : t("pages.readiness.actions.generateExport")}
          </Button>
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href="/workspace"
          >
            {t("pages.readiness.actions.backToWorkspace")}
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "default" }))}
            href={`/assessments/${assessmentId}/classification`}
          >
            {t("pages.readiness.actions.openClassification")}
          </Link>
          <Link
            className={cn(buttonVariants({ variant: "outline" }))}
            href={`/assessments/${assessmentId}/documents`}
          >
            {t("pages.readiness.actions.openDocuments")}
          </Link>
        </div>
      </ClassificationStatusCard>
    </div>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(appLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function mapCompletedStep(step: string) {
  switch (step) {
    case "wizard_profile":
      return t("pages.readiness.completedSteps.wizardProfile");
    case "repository_connected":
      return t("pages.readiness.completedSteps.repositoryConnected");
    case "technical_evidence_accepted":
      return t("pages.readiness.completedSteps.technicalEvidenceAccepted");
    default:
      return step;
  }
}

function mapMissingEvidence(type: string, fallback: string) {
  switch (type) {
    case "repository_connection":
      return t("pages.readiness.missingEvidence.repositoryConnection");
    case "technical_evidence":
      return t("pages.readiness.missingEvidence.technicalEvidence");
    default:
      return fallback;
  }
}
