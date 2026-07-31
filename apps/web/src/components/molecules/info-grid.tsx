import { Card, CardContent } from "@/components/ui/card";
import type { InfoGridProps } from "@/components/types/info-grid.types";

export function InfoGrid({ rows }: InfoGridProps) {
  return (
    <Card>
      <CardContent className="grid gap-4 px-6 py-6 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="flex flex-col gap-1">
            <p className="text-sm text-muted-foreground">{row.label}</p>
            <p className="font-medium">{row.value}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
