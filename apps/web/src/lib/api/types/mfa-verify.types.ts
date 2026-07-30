import type { MessageKey } from "@lcsp/i18n";

import { API_OUTCOME_KINDS } from "../outcome-kinds.ts";

export type MfaVerifyRequest = {
  otp: string;
};

export type MfaVerifyError = {
  titleKey: MessageKey;
  detailKey: MessageKey;
};

export type MfaVerifyOutcome =
  | { kind: typeof API_OUTCOME_KINDS.verified }
  | { kind: typeof API_OUTCOME_KINDS.sessionInvalid }
  | ({ kind: typeof API_OUTCOME_KINDS.invalid } & MfaVerifyError)
  | ({ kind: typeof API_OUTCOME_KINDS.rateLimited } & MfaVerifyError)
  | ({ kind: typeof API_OUTCOME_KINDS.error } & MfaVerifyError);
