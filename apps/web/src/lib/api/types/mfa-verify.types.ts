import type { MessageKey } from "@lcsp/i18n";

export type MfaVerifyRequest = {
  otp: string;
};

export type MfaVerifyError = {
  titleKey: MessageKey;
  detailKey: MessageKey;
};

export type MfaVerifyOutcome =
  | { kind: "verified" }
  | { kind: "session_invalid" }
  | ({ kind: "invalid" } & MfaVerifyError)
  | ({ kind: "rate_limited" } & MfaVerifyError)
  | ({ kind: "error" } & MfaVerifyError);
