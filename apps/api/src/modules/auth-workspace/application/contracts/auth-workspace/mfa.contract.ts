import type { MfaRecoveryCodeAccessAction } from "@lcsp/contracts/auth";

export type { MfaRecoveryCodeAccessAction };

export type EnrollMfaSuccess = {
  ok: true;
  correlation_id: string;
  totp_uri: string;
  recovery_codes: string[];
};

export type VerifyMfaOtpSuccess = {
  ok: true;
  correlation_id: string;
};

export type VerifyMfaRecoveryCodeSuccess = {
  ok: true;
  correlation_id: string;
};

export type GenerateMfaRecoveryCodesSuccess = {
  ok: true;
  correlation_id: string;
  recovery_codes: string[];
};

export type RecordMfaRecoveryCodeAccessSuccess = {
  ok: true;
  correlation_id: string;
};

export type DisableMfaSuccess = {
  ok: true;
  correlation_id: string;
};
