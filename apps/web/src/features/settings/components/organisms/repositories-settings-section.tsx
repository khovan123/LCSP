"use client";

import { resolveMessage } from "@lcsp/i18n";
import { RefreshCwIcon } from "lucide-react";

import { SectionHeading } from "@/components/molecules/section-heading";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appLocale } from "@/lib/locale";
import type { RepositoriesSettingsSectionProps } from "../../types/settings-page.types";
import { formatDateTime } from "../../utils/settings-page.utils";

export function RepositoriesSettingsSection({
  repositories,
  repositoryCount,
}: RepositoriesSettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.repositories.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.repositories.description",
        )}
        icon={<RefreshCwIcon className="size-4" />}
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
            <p className="text-sm text-muted-foreground">
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.states.noRepositories",
              )}
            </p>
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
