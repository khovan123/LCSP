import { resolveMessage } from "@lcsp/i18n";
import Link from "next/link";
import {
  FileCheck2Icon,
  FileTextIcon,
  GaugeIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getAssessmentStatusLabelKey,
  getWizardStatusLabelKey,
} from "@/lib/api/workspace-client";
import { appLocale } from "@/lib/locale";
import { getAssessmentProgress } from "../../config/assessment-progress";
import type {
  AssessmentFactProps,
  AssessmentModuleLinkProps,
  AssessmentSummaryCardProps,
} from "../../types/assessment-summary-card.types";

export function AssessmentSummaryCard({
  assessment,
  statusLabel,
  wizardStatusLabel,
  createdAtLabel,
  href,
  openAssessmentLabel,
}: AssessmentSummaryCardProps) {
  const status = resolveMessage(
    appLocale,
    getAssessmentStatusLabelKey(assessment.status),
  );
  const wizardStatus = resolveMessage(
    appLocale,
    getWizardStatusLabelKey(assessment.wizard_status),
  );
  const progress = getAssessmentProgress(assessment.status);

  return (
    <Card className="group relative transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      {href ? (
        <Link
          aria-label={`${assessment.name} — ${openAssessmentLabel ?? assessment.name}`}
          className="absolute inset-0 z-0 rounded-xl"
          href={href}
        />
      ) : null}
      <CardHeader>
        <CardTitle>{assessment.name}</CardTitle>
        <CardDescription>
          {createdAtLabel}: {formatAssessmentDate(assessment.created_at)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3 text-sm">
          <AssessmentFact label={statusLabel} value={status} />
          <AssessmentFact label={wizardStatusLabel} value={wizardStatus} />
        </dl>
        <div className="mt-5 flex flex-col gap-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {resolveMessage(appLocale, "pages.workspace.progressLabel")}
            </span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label={resolveMessage(
              appLocale,
              "pages.workspace.progressLabel",
            )}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        {href ? (
          <nav
            className="relative z-10 mt-5 grid grid-cols-2 gap-2 border-t pt-4 text-sm"
            aria-label={resolveMessage(
              appLocale,
              "pages.assessment.moduleNavigation",
            )}
          >
            <AssessmentModuleLink
              href={`${href}/wizard`}
              labelKey="pages.appShell.wizard"
              icon={FileCheck2Icon}
            />
            <AssessmentModuleLink
              href={`${href}/readiness`}
              labelKey="pages.appShell.readiness"
              icon={GaugeIcon}
            />
            <AssessmentModuleLink
              href={`${href}/classification`}
              labelKey="pages.appShell.classification"
              icon={ShieldCheckIcon}
            />
            <AssessmentModuleLink
              href={`${href}/documents`}
              labelKey="pages.appShell.documents"
              icon={FileTextIcon}
            />
            <AssessmentModuleLink
              href={`${href}/conflicts`}
              labelKey="pages.appShell.conflicts"
              icon={ScaleIcon}
            />
          </nav>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AssessmentModuleLink({
  href,
  labelKey,
  icon: Icon,
}: AssessmentModuleLinkProps) {
  return (
    <Link
      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      href={href}
    >
      <Icon className="size-4" aria-hidden="true" />
      <span>{resolveMessage(appLocale, labelKey)}</span>
    </Link>
  );
}

function AssessmentFact({ label, value }: AssessmentFactProps) {
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
