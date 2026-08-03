"use client";

import { resolveMessage } from "@lcsp/i18n";
import { CircleAlertIcon, ShieldCheckIcon } from "lucide-react";

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
import type { SessionsSettingsSectionProps } from "../../types/settings-page.types";
import { formatDateTime } from "../../utils/settings-page.utils";

export function SessionsSettingsSection({
  sessions,
  activeSessionsCount,
  revokePending,
  onRevokeSession,
}: SessionsSettingsSectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.sessions.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.sessions.description",
        )}
        icon={<ShieldCheckIcon className="size-4" />}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.sessions.activeTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.sessions.activeDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CircleAlertIcon className="size-4" />
            <span>
              {resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.sessions.summary",
              )}
              : {activeSessionsCount}
            </span>
          </div>
          {sessions.length === 0 ? (
            <Empty className="rounded-xl border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldCheckIcon className="size-4" />
                </EmptyMedia>
                <EmptyTitle>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.sessions.activeTitle",
                  )}
                </EmptyTitle>
                <EmptyDescription>
                  {resolveMessage(
                    appLocale,
                    "pages.workspace.settingsHub.states.noSessions",
                  )}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => (
                <div key={session.id} className="rounded-xl border px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">
                          {session.is_current
                            ? resolveMessage(
                                appLocale,
                                "pages.workspace.settingsHub.states.currentSession",
                              )
                            : session.id}
                        </p>
                        <Badge variant="outline">
                          {resolveMessage(
                            appLocale,
                            session.revoked_at
                              ? "pages.workspace.settingsHub.badges.revoked"
                              : "pages.workspace.settingsHub.badges.active",
                          )}
                        </Badge>
                      </div>
                      <div className="grid gap-1 text-sm text-muted-foreground">
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.createdAt",
                          )}
                          : {formatDateTime(session.created_at)}
                        </span>
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.lastActiveAt",
                          )}
                          : {formatDateTime(session.updated_at)}
                        </span>
                        <span>
                          {resolveMessage(
                            appLocale,
                            "pages.workspace.settingsHub.labels.expiresAt",
                          )}
                          : {formatDateTime(session.expires_at)}
                        </span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={
                        session.is_current ||
                        session.revoked_at !== null ||
                        revokePending
                      }
                      onClick={() => void onRevokeSession(session.id)}
                    >
                      {resolveMessage(
                        appLocale,
                        "pages.workspace.settingsHub.actions.revoke",
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
