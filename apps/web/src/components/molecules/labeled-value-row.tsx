import { Badge } from "@/components/ui/badge";
import type {
  LabeledStatusRowProps,
  LabeledValueRowProps,
} from "@/components/types/labeled-value-row.types";

export function LabeledValueRow({ label, value }: LabeledValueRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-right font-medium">{value}</p>
    </div>
  );
}

export function LabeledStatusRow({ label, status }: LabeledStatusRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border px-4 py-3">
      <p className="font-medium">{label}</p>
      <Badge variant="outline">{status}</Badge>
    </div>
  );
}
