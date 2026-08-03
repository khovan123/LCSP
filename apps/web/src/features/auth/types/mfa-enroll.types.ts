import type { resolveMessage } from "@lcsp/i18n";

export type MfaEnrollErrorState = {
  titleKey: Parameters<typeof resolveMessage>[1];
  detailKey: Parameters<typeof resolveMessage>[1];
} | null;

export type MfaQrPreviewProps = {
  totpUri: string;
};
