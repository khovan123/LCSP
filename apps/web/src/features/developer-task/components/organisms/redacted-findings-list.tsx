import { resolveMessage } from "@lcsp/i18n";

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
import { appLocale } from "@/lib/locale";

import type { DeveloperFinding } from "../../types/developer-task.types";

export function RedactedFindingsList({
  findings,
}: {
  findings: DeveloperFinding[];
}) {
  if (findings.length === 0) {
    return (
      <Empty className="rounded-xl border bg-card">
        <EmptyHeader>
          <EmptyTitle>
            {resolveMessage(appLocale, "pages.developerTask.emptyTitle")}
          </EmptyTitle>
          <EmptyDescription>
            {resolveMessage(appLocale, "pages.developerTask.emptyDescription")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <section aria-labelledby="technical-findings-title" className="space-y-4">
      <div>
        <h2 id="technical-findings-title" className="text-xl font-semibold">
          {resolveMessage(appLocale, "pages.developerTask.findingsTitle")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {resolveMessage(appLocale, "pages.developerTask.findingsDescription")}
        </p>
      </div>
      <div className="grid gap-4">
        {findings.map((finding) => (
          <Card key={finding.finding_id}>
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{finding.finding_type}</CardTitle>
                <Badge variant="outline">{finding.severity}</Badge>
              </div>
              <CardDescription>{finding.tool}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{finding.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
