import { resolveMessage } from "@lcsp/i18n";

import { appLocale } from "@/lib/locale";

export function t(key: string) {
  return resolveMessage(appLocale, key as Parameters<typeof resolveMessage>[1]);
}
