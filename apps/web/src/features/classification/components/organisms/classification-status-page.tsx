"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { resolveMessage } from "@lcsp/i18n";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { StatusCard } from "@/components/organisms/status-card";
import {
  getClassificationActionVisibility,
} from "@/lib/api/classification-client";
import { useClassificationStatusQuery } from "@/lib/api/assessment-queries";
import { appLocale } from "@/lib/locale";
import type { ClassificationStatusPageProps } from "../../types/component-props.types";

export function ClassificationStatusPage({
  assessmentId,
}: ClassificationStatusPageProps) {
  const router = useRouter();
  const statusQuery = useClassificationStatusQuery(assessmentId);

  useEffect(() => {
    if (statusQuery.data?.kind === "redirect") {
      router.replace(statusQuery.data.location);
    }
  }, [router, statusQuery.data]);

  const headingDescription = useMemo(
    () => resolveMessage(appLocale, "pages.classification.pageDescription"),
    [],
  );

  if (statusQuery.isLoading) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.classification.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{headingDescription}</p>
        </header>
        <StatusCard
          title={resolveMessage(appLocale, "pages.classification.pageTitle")}
          description={resolveMessage(appLocale, "pages.classification.loading")}
          badgeLabel={resolveMessage(appLocale, "pages.classification.states.processingBadge")}
          badgeVariant="secondary"
        >
          <div className="py-2 text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.loading")}
          </div>
        </StatusCard>
      </div>
    );
  }

  const viewModel =
    statusQuery.data?.kind === "loaded" ? statusQuery.data.data : null;
  const error =
    statusQuery.data?.kind === "error"
      ? resolveMessage(appLocale, statusQuery.data.titleKey)
      : null;

  if (error || !viewModel) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {resolveMessage(appLocale, "pages.classification.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">{headingDescription}</p>
        </header>
        <Alert variant="destructive">
          <AlertTitle>
            {resolveMessage(appLocale, "pages.classification.errorTitle")}
          </AlertTitle>
          <AlertDescription>{error ?? resolveMessage(appLocale, "pages.classification.errorDetail")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const state = viewModel.state;
  const actionVisibility = getClassificationActionVisibility(viewModel);
  const showFinalReport = actionVisibility.showFinalReport;
  const showGapAnalysis = actionVisibility.showGapAnalysis;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          {resolveMessage(appLocale, "pages.classification.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">{headingDescription}</p>
      </header>

      <StatusCard
        title={resolveMessage(appLocale, viewModel.titleKey)}
        description={resolveMessage(appLocale, viewModel.descriptionKey)}
        badgeLabel={resolveMessage(appLocale, viewModel.badgeKey)}
        badgeVariant={state === "blocked" ? "destructive" : "secondary"}
      >
        {viewModel.summaryKey ? (
          <div className="rounded-lg border bg-muted/40 p-4">
            <p className="text-sm font-medium">{resolveMessage(appLocale, "pages.classification.summaryLabel")}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {resolveMessage(appLocale, viewModel.summaryKey)}
            </p>
          </div>
        ) : null}

        {viewModel.references?.length ? (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-medium">
              {resolveMessage(appLocale, "pages.classification.referencesLabel")}
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-muted-foreground">
              {viewModel.references.map((reference) => (
                <li key={reference}>{reference}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {state === "locked" ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            {resolveMessage(appLocale, "pages.classification.states.lockedNextSteps")}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {showFinalReport ? (
            <Button
              render={<Link href={`/assessments/${assessmentId}/documents`} />}
            >
              {resolveMessage(appLocale, "pages.classification.generateFinalReport")}
            </Button>
          ) : null}
          {showGapAnalysis ? (
            <Button
              render={<Link href={`/assessments/${assessmentId}/documents`} />}
              variant="outline"
            >
              {resolveMessage(appLocale, "pages.classification.generateGapAnalysis")}
            </Button>
          ) : null}
        </div>
      </StatusCard>
    </div>
  );
}
