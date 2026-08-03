import { resolveMessage } from "@lcsp/i18n";
import { appLocale } from "@/lib/locale";

type UnresolvedUnknownItem = {
  questionId: string;
  label: string;
};

export function UnresolvedUnknownPanel({
  items,
}: {
  items: UnresolvedUnknownItem[];
}) {
  return (
    <section className="rounded-lg border bg-amber-50/30 p-4">
      <h2 className="text-sm font-medium">
        {t("pages.readiness.unresolvedTitle")}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        {t("pages.readiness.unresolvedDescription")}
      </p>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => (
            <li key={item.questionId}>
              • {mapUnresolvedItem(item.questionId, item.label)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {t("pages.readiness.noUnresolvedItems")}
        </p>
      )}
    </section>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}

function mapUnresolvedItem(questionId: string, fallback: string) {
  switch (questionId) {
    case "affectedSubjects":
      return t("pages.readiness.unresolvedItemLabels.affectedSubjects");
    case "dataTypes":
      return t("pages.readiness.unresolvedItemLabels.dataTypes");
    case "specialCategoryData":
      return t("pages.readiness.unresolvedItemLabels.specialCategoryData");
    case "biometricData":
      return t("pages.readiness.unresolvedItemLabels.biometricData");
    case "humanReview":
      return t("pages.readiness.unresolvedItemLabels.humanReview");
    case "externalLlmUsage":
      return t("pages.readiness.unresolvedItemLabels.externalLlmUsage");
    case "highImpactIndicators":
      return t("pages.readiness.unresolvedItemLabels.highImpactIndicators");
    case "prohibitedRiskSignals":
      return t("pages.readiness.unresolvedItemLabels.prohibitedRiskSignals");
    default:
      return fallback;
  }
}
