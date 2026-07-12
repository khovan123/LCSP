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
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        {showCreateAssessment ? (
          <CardAction>
            <Button>{createAssessmentLabel}</Button>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {organizationLabel}
            </dt>
            <dd className="mt-1 text-base font-medium">{organizationName}</dd>
          </div>
          <div className="rounded-lg border bg-muted/30 p-4">
            <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {membershipRoleLabel}
            </dt>
            <dd className="mt-1">
              <Badge variant="outline">{membershipRole}</Badge>
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}
