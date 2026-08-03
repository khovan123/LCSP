"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  getSummaryItems,
  sectionCardClassName,
} from "@/features/wizard/lib/wizard-form";
import { t } from "@/features/wizard/lib/wizard-i18n";
import type { WizardReadOnlySummaryProps } from "@/features/wizard/types/component-props.types";

export function WizardReadOnlySummary({
  answers,
  onBack,
  onNext,
}: WizardReadOnlySummaryProps) {
  const summaryItems = getSummaryItems(answers);

  return (
    <>
      <Card className={sectionCardClassName}>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge>{t("pages.wizard.readOnlyBadge")}</Badge>
          </div>
          <CardTitle>{t("pages.wizard.readOnlyTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.readOnlyDescription")}
          </CardDescription>
        </CardHeader>
      </Card>
      <Card className={sectionCardClassName}>
        <CardHeader>
          <CardTitle>{t("pages.wizard.summaryTitle")}</CardTitle>
          <CardDescription>
            {t("pages.wizard.summaryDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {summaryItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("pages.wizard.readOnlyEmpty")}
            </p>
          ) : (
            summaryItems.map((item) => (
              <div key={item.label} className="rounded-lg border px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.value}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={onBack}>
          {t("pages.wizard.actions.backToWorkspace")}
        </Button>
        <Button onClick={onNext}>
          {t("pages.wizard.actions.openClassification")}
        </Button>
      </div>
    </>
  );
}
