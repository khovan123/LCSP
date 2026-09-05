import { resolveMessage } from "@lcsp/i18n";

import {
  AgentMessage,
  AgentTurn,
  ThinkingLine,
} from "@/features/workspace/components/molecules/agent-turn";
import { ChatResultContainer } from "@/features/workspace/components/molecules/chat-result-container";
import { appLocale } from "@/lib/locale";

import type {
  RepositoryHistory,
  ScannerActivityItem,
} from "../../types/assessment-flow.types";
import { RepositoryConnectionResult } from "../molecules/repository-connection-result";
import { ScannerActivitySequence } from "../molecules/scanner-activity-sequence";

type ScannerStepProps = {
  repository: RepositoryHistory;
  activities: ScannerActivityItem[];
  evidenceReady: boolean;
};

export function ScannerStep({
  repository,
  activities,
  evidenceReady,
}: ScannerStepProps) {
  return (
    <>
      <AgentTurn>
        <AgentMessage>
          <p>{t("pages.assessmentFlow.repository.connectedDescription")}</p>
        </AgentMessage>
        <RepositoryConnectionResult {...repository} />
      </AgentTurn>
      <AgentTurn>
        <ThinkingLine
          label={
            evidenceReady
              ? t("pages.assessmentFlow.scanner.completeThinking")
              : t("pages.assessmentFlow.scanner.runningThinking")
          }
        />
        <AgentMessage className="mt-2 text-muted-foreground">
          {evidenceReady
            ? t("pages.assessmentFlow.scanner.completeDescription")
            : t("pages.assessmentFlow.scanner.runningDescription")}
        </AgentMessage>
        <div className="mt-3">
          <ScannerActivitySequence activities={activities} />
        </div>
      </AgentTurn>
      {evidenceReady ? (
        <AgentTurn>
          <ChatResultContainer
            eyebrow={t("pages.assessmentFlow.graph.eyebrow")}
            title={t("pages.assessmentFlow.graph.title")}
            description={t("pages.assessmentFlow.graph.description")}
          >
            <dl className="grid gap-2 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">
                  {t("pages.assessmentFlow.graph.repository")}
                </dt>
                <dd className="truncate font-medium">
                  {repository.repositoryFullName}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  {t("pages.assessmentFlow.graph.commit")}
                </dt>
                <dd className="font-mono font-medium">
                  {repository.commitSha.slice(0, 12)}
                </dd>
              </div>
            </dl>
          </ChatResultContainer>
        </AgentTurn>
      ) : null}
    </>
  );
}

function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
