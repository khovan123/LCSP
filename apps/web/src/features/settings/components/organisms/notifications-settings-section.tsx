"use client";

import { resolveMessage } from "@lcsp/i18n";
import { BellIcon } from "lucide-react";

import { LabeledValueRow } from "@/components/molecules/labeled-value-row";
import { SectionHeading } from "@/components/molecules/section-heading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { appLocale } from "@/lib/locale";
import type { SettingsSectionSharedProps } from "../../types/settings-page.types";

export function NotificationsSettingsSection({
  profile,
}: SettingsSectionSharedProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.notifications.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.notifications.description",
        )}
        icon={<BellIcon className="size-4" />}
      />
      <Card>
        <CardHeader>
          <CardTitle>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.notifications.emailRoutingTitle",
            )}
          </CardTitle>
          <CardDescription>
            {resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.notifications.emailRoutingDescription",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <LabeledValueRow
            label={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.primaryEmail",
            )}
            value={profile?.email ?? "…"}
          />
          <LabeledValueRow
            label={resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.recoveryEmail",
            )}
            value={
              profile?.recovery_email ??
              resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.states.noRecoveryEmail",
              )
            }
          />
        </CardContent>
      </Card>
    </section>
  );
}
