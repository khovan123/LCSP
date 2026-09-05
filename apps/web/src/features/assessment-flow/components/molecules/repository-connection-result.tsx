import { resolveMessage } from "@lcsp/i18n";
import { ASSESSMENT_REPOSITORY_PROVIDERS } from "@lcsp/contracts/assessment";

import { SelectionHistoryRow } from "@/features/workspace/components/molecules/selection-history-row";
import { appLocale } from "@/lib/locale";

import type { RepositoryHistory } from "../../types/assessment-flow.types";

type RepositoryConnectionResultProps = RepositoryHistory;

export function RepositoryConnectionResult({
  provider,
  repositoryFullName,
  commitSha,
}: RepositoryConnectionResultProps) {
  return (
    <SelectionHistoryRow
      prompt={t("pages.assessmentFlow.repository.connected")}
      selectedValue={`${formatProvider(provider)} · ${repositoryFullName}`}
      detail={t("pages.assessmentFlow.repository.pinnedCommit").replace(
        "{commit}",
        commitSha.slice(0, 12),
      )}
    />
  );
}

function formatProvider(provider: string) {
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.github) {
    return t("pages.assessmentFlow.providers.github");
  }
  if (provider === ASSESSMENT_REPOSITORY_PROVIDERS.gitlab) {
    return t("pages.assessmentFlow.providers.gitlab");
  }
  return provider;
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
