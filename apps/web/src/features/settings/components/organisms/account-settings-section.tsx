"use client";

import { resolveMessage } from "@lcsp/i18n";
import { UserIcon } from "lucide-react";

import { InfoGrid } from "@/components/molecules/info-grid";
import { SectionHeading } from "@/components/molecules/section-heading";
import { appLocale } from "@/lib/locale";

import type { SettingsSectionSharedProps } from "../../types/settings-page.types";
import { formatDateTime } from "../../utils/settings-page.utils";

export function AccountSettingsSection({
  profile,
}: SettingsSectionSharedProps) {
  return (
    <section className="flex flex-col gap-4">
      <SectionHeading
        title={resolveMessage(appLocale, "pages.workspace.settingsHub.account.title")}
        description={resolveMessage(
          appLocale,
          "pages.workspace.settingsHub.account.description",
        )}
        icon={<UserIcon className="size-4" />}
      />
      <InfoGrid
        rows={[
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.displayName",
            ),
            value:
              profile?.display_name ??
              resolveMessage(
                appLocale,
                "pages.workspace.settingsHub.states.notConfigured",
              ),
          },
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.primaryEmail",
            ),
            value: profile?.email ?? "…",
          },
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.organization",
            ),
            value: profile?.organization_id ?? "…",
          },
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.membershipRole",
            ),
            value: profile?.membership_role ?? "…",
          },
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.createdAt",
            ),
            value: formatDateTime(profile?.created_at),
          },
          {
            label: resolveMessage(
              appLocale,
              "pages.workspace.settingsHub.labels.updatedAt",
            ),
            value: formatDateTime(profile?.updated_at),
          },
        ]}
      />
    </section>
  );
}
