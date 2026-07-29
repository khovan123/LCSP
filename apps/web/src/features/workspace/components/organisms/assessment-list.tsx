import { resolveMessage } from "@lcsp/i18n";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAssessmentStatusLabelKey,
  getWizardStatusLabelKey,
} from "@/lib/api/workspace-client";

import { appLocale } from "@/lib/locale";
import type { AssessmentSummary } from "../../types/workspace.types";

type AssessmentListProps = {
  assessments: AssessmentSummary[];
  isLoading: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  loadingLabel: string;
  statusLabel: string;
  wizardStatusLabel: string;
  createdAtLabel: string;
  getAssessmentHref?: (assessment: AssessmentSummary) => string;
  openAssessmentLabel?: string;
};

export function AssessmentList({
  assessments,
  isLoading,
  title,
  description,
  emptyTitle,
  emptyDescription,
  loadingLabel,
  statusLabel,
  wizardStatusLabel,
  createdAtLabel,
  getAssessmentHref,
  openAssessmentLabel,
}: AssessmentListProps) {
  return (
    <section
      id="assessments"
      className="flex flex-col gap-4"
      aria-busy={isLoading}
    >
      <div className="flex items-end justify-between gap-4">
        <div>
        <h2 className="font-heading text-2xl font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[0, 1].map((item) => (
            <Card key={item} aria-label={loadingLabel}>
              <CardHeader>
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-16 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {!isLoading && assessments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{emptyTitle}</EmptyTitle>
            <EmptyDescription>{emptyDescription}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      {!isLoading && assessments.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {assessments.map((assessment) => (
            <AssessmentCard
              key={assessment.id}
              assessment={assessment}
              statusLabel={statusLabel}
              wizardStatusLabel={wizardStatusLabel}
              createdAtLabel={createdAtLabel}
              href={getAssessmentHref?.(assessment)}
              openAssessmentLabel={openAssessmentLabel}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function AssessmentCard({
  assessment,
  statusLabel,
  wizardStatusLabel,
  createdAtLabel,
  href,
  openAssessmentLabel,
}: {
  assessment: AssessmentSummary;
  statusLabel: string;
  wizardStatusLabel: string;
  createdAtLabel: string;
  href?: string;
  openAssessmentLabel?: string;
}) {
  const status = resolveMessage(
    appLocale,
    getAssessmentStatusLabelKey(assessment.status),
  );
  const wizardStatus = resolveMessage(
    appLocale,
    getWizardStatusLabelKey(assessment.wizard_status),
  );

  return (
    <Card className="group transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <CardHeader>
        <CardTitle>
          {href ? (
            <Link className="underline-offset-4 group-hover:text-primary hover:underline" href={href}>
              {assessment.name}
              {openAssessmentLabel ? (
                <span className="sr-only"> — {openAssessmentLabel}</span>
              ) : null}
            </Link>
          ) : (
            assessment.name
          )}
        </CardTitle>
        <CardDescription>
          {createdAtLabel}: {formatAssessmentDate(assessment.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <AssessmentFact label={statusLabel} value={status} />
          <AssessmentFact label={wizardStatusLabel} value={wizardStatus} />
        </dl>
      </CardContent>
    </Card>
  );
}

function AssessmentFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        <Badge variant="outline">{value}</Badge>
      </dd>
    </div>
  );
}

function formatAssessmentDate(value: string) {
  return new Intl.DateTimeFormat(appLocale, {
    dateStyle: "medium",
  }).format(new Date(value));
}
