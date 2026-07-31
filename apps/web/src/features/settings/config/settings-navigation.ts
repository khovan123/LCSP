import type { MessageKey } from "@lcsp/i18n";

import {
  SETTINGS_SECTION_IDS,
  type SettingsSectionId,
} from "../types/settings.types";

export type SettingsNavigationItem = {
  id: SettingsSectionId;
  labelKey: MessageKey;
};

export const settingsNavigationItems: SettingsNavigationItem[] = [
  {
    id: SETTINGS_SECTION_IDS.account,
    labelKey: "pages.workspace.settingsHub.sections.account",
  },
  {
    id: SETTINGS_SECTION_IDS.appearance,
    labelKey: "pages.workspace.settingsHub.sections.appearance",
  },
  {
    id: SETTINGS_SECTION_IDS.notifications,
    labelKey: "pages.workspace.settingsHub.sections.notifications",
  },
  {
    id: SETTINGS_SECTION_IDS.emails,
    labelKey: "pages.workspace.settingsHub.sections.emails",
  },
  {
    id: SETTINGS_SECTION_IDS.passwordAndAuthentication,
    labelKey: "pages.workspace.settingsHub.sections.passwordAndAuthentication",
  },
  {
    id: SETTINGS_SECTION_IDS.sessions,
    labelKey: "pages.workspace.settingsHub.sections.sessions",
  },
  {
    id: SETTINGS_SECTION_IDS.repositories,
    labelKey: "pages.workspace.settingsHub.sections.repositories",
  },
];
