import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ClassificationStatusCardProps = {
  title: string;
  description: string;
  badgeLabel: string;
  badgeVariant?: "default" | "secondary" | "destructive";
  children?: ReactNode;
};

export function ClassificationStatusCard({
  title,
  description,
  badgeLabel,
  badgeVariant = "secondary",
  children,
}: ClassificationStatusCardProps) {
  return (
    <Card className={badgeVariant === "destructive" ? "border-destructive/40" : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? <CardContent className="space-y-6">{children}</CardContent> : null}
    </Card>
  );
}
