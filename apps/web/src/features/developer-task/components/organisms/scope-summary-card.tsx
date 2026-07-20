import { resolveMessage } from "@lcsp/i18n";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appLocale } from "@/lib/locale";

import { getVisibleDeveloperActions } from "../../config/action-labels";
import type { DeveloperTaskContext } from "../../types/developer-task.types";

export function ScopeSummaryCard({
  context,
}: {
  context: DeveloperTaskContext;
}) {
  const visibleActions = getVisibleDeveloperActions(context.granted_actions);
  const assessmentLabel =
    context.scope.type === "assessment"
      ? context.scope.assessment.name
      : resolveMessage(appLocale, "pages.developerTask.organizationScope");

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {resolveMessage(appLocale, "pages.developerTask.scopeTitle")}
        </CardTitle>
        <CardDescription>
          {resolveMessage(appLocale, "pages.developerTask.scopeDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {resolveMessage(appLocale, "pages.developerTask.organization")}
            </dt>
            <dd className="mt-1 font-medium">{context.organization.name}</dd>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {resolveMessage(appLocale, "pages.developerTask.assessment")}
            </dt>
            <dd className="mt-1 font-medium">{assessmentLabel}</dd>
          </div>
        </dl>

        <div>
          <h2 className="text-sm font-medium">
            {resolveMessage(appLocale, "pages.developerTask.grantedActions")}
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {visibleActions.map(({ action, labelKey }) => (
              <Badge key={action} variant="secondary">
                {resolveMessage(appLocale, labelKey)}
              </Badge>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
          <p className="font-medium">
            {resolveMessage(appLocale, "pages.developerTask.hiddenBoundaryTitle")}
          </p>
          <p className="mt-1 text-muted-foreground">
            {resolveMessage(appLocale, "pages.developerTask.hiddenBoundary")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
