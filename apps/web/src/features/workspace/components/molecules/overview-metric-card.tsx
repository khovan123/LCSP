import { resolveMessage } from "@lcsp/i18n";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appLocale } from "@/lib/locale";
import type { OverviewMetricCardProps } from "../../types/overview-metric-card.types";

export function OverviewMetricCard({
  labelKey,
  value,
}: OverviewMetricCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{resolveMessage(appLocale, labelKey)}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}
