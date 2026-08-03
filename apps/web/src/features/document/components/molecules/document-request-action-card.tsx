import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentRequestActionCardProps } from "../../types/document-request-action-card.types";

export function DocumentRequestActionCard({
  title,
  description,
  actionLabel,
  actionVariant = "default",
  disabled,
  highlighted = false,
  onAction,
}: DocumentRequestActionCardProps) {
  return (
    <Card className={highlighted ? "bg-muted/50" : undefined}>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <Button
          type="button"
          variant={actionVariant}
          onClick={onAction}
          disabled={disabled}
          className="w-fit"
        >
          {actionLabel}
        </Button>
      </CardContent>
    </Card>
  );
}
