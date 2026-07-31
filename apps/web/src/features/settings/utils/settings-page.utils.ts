import {
  SETTINGS_SECTION_IDS,
  type SettingsSectionId,
} from "../types/settings.types";

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return (
    value !== null &&
    (Object.values(SETTINGS_SECTION_IDS) as string[]).includes(value)
  );
}
