import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StatusCardProps } from "@/components/types/status-card.types";

export function StatusCard({
  title,
  description,
  badgeLabel,
  badgeVariant = "secondary",
  children,
}: StatusCardProps) {
  return (
    <Card
      className={
        badgeVariant === "destructive" ? "border-destructive/40" : undefined
      }
    >
      <CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle>{title}</CardTitle>
          <Badge variant={badgeVariant}>{badgeLabel}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children ? (
        <CardContent className="flex flex-col gap-6">{children}</CardContent>
      ) : null}
    </Card>
  );
}
