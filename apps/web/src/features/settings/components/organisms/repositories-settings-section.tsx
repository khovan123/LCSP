"use client";

import { resolveMessage } from "@lcsp/i18n";
import { REPOSITORY_AUTHENTICATION_MODES } from "@lcsp/contracts/github-integration";
import { RefreshCwIcon } from "lucide-react";

import { SectionHeading } from "@/components/molecules/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { appLocale } from "@/lib/locale";
import { GitHubRepositoryConnectCard } from "../molecules/github-repository-connect-card";
import type { RepositoriesSettingsSectionProps } from "../../types/settings-page.types";
import { formatDateTime } from "../../utils/settings-page.utils";

export function RepositoriesSettingsSection({
  repositories,
  repositoryCount,
  githubConnectionStatus,
  onConnectGitHub,
  onManageGitHubInstallation,
  onReconnectGitHubRepository,
}: RepositoriesSettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.title",
        )}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.description",
        )}
        icon={<RefreshCwIcon className="size-4" />}
      />
      <GitHubRepositoryConnectCard
        title={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectTitle",
        )}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectDescription",
        )}
        actionLabel={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.actions.connectGitHubRepository",
        )}
        successTitle={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectSuccessTitle",
        )}
        successDescription={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectSuccessDescription",
        )}
        failedTitle={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectFailedTitle",
        )}
        failedDescription={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.connectFailedDescription",
        )}
        status={githubConnectionStatus}
        onConnect={onConnectGitHub}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.repositories.listTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.repositories.listDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.repositories.summary",
            )}
            : {repositoryCount}
          </div>
          {repositories.length === 0 ? (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RefreshCwIcon className="size-4" />
                </EmptyMedia>
                <EmptyTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.repositories.listTitle",
                  )}
                </EmptyTitle>
                <EmptyDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.states.noRepositories",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {repositories.map((repository) => (
                <div
                  key={repository.id}
                  className="rounded-xl border px-4 py-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {repository.repository_full_name}
                        </p>
                        <Badge variant="outline">
                          {resolveMessage(
                            appLocale,
                            repository.revoked_at
                              ? "pages.workspace.settingsHub.badges.revoked"
                              : "pages.workspace.settingsHub.badges.active",
                          )}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.defaultBranch",
                          )}
                          : {repository.default_branch}
                        </span>
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.linkedAssessment",
                          )}
                          :{" "}
                          {repository.assessment_name ??
                            resolveMessage(
                              appLocale,
                              "pages.workspace.settingsHub.states.noAssessmentLinked",
                            )}
                        </span>
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.connectedAt",
                          )}
                          : {formatDateTime(repository.connected_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        switch (repository.authentication_mode) {
                          case REPOSITORY_AUTHENTICATION_MODES.githubApp:
                            if (repository.installation_id) {
                              onManageGitHubInstallation(
                                repository.installation_id,
                              );
                            }
                            break;
                          case REPOSITORY_AUTHENTICATION_MODES.githubCliCredential:
                            onReconnectGitHubRepository();
                            break;
                        }
                      }}
                    >
                      {resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.actions.manageGitHubRepositoryAccess",
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
