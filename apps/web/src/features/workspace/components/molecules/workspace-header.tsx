import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type WorkspaceHeaderProps = {
  title: string;
  description: string;
  organizationLabel: string;
  organizationName: string;
  membershipRoleLabel: string;
  membershipRole: string;
  createAssessmentLabel: string;
  showCreateAssessment: boolean;
};

export function WorkspaceHeader({
  title,
  description,
  organizationLabel,
  organizationName,
  membershipRoleLabel,
  membershipRole,
  createAssessmentLabel,
  showCreateAssessment,
}: WorkspaceHeaderProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
      <Card className="overflow-hidden border-primary/15 bg-linear-to-br from-card via-card to-primary/5">
        <CardHeader className="min-h-40">
          <CardDescription className="font-medium text-primary">
            {organizationName}
          </CardDescription>
          <CardTitle className="font-heading max-w-2xl text-3xl leading-tight">
            {title}
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-relaxed">
            {description}
          </CardDescription>
          {showCreateAssessment ? (
            <CardAction>
              <Button>{createAssessmentLabel}</Button>
            </CardAction>
          ) : null}
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="flex h-full items-center">
          <dl className="grid w-full gap-3">
            <div className="rounded-lg border bg-muted/35 p-4">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {organizationLabel}
            </dt>
            <dd className="mt-1 text-base font-medium">{organizationName}</dd>
            </div>
            <div className="rounded-lg border bg-muted/35 p-4">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {membershipRoleLabel}
            </dt>
            <dd className="mt-1">
                <Badge variant="secondary">{membershipRole}</Badge>
            </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
