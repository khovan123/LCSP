import { Separator } from "@/components/ui/separator";
import type { LabeledSeparatorProps } from "../types/labeled-separator.types";

export function LabeledSeparator({ label }: LabeledSeparatorProps) {
  return (
    <div className="flex w-full items-center gap-3 text-xs text-muted-foreground">
      <Separator className="flex-1" />
      <span>{label}</span>
      <Separator className="flex-1" />
    </div>
  );
}
