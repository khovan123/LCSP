import type { MfaRecoveryCodeAccessAction } from "@lcsp/contracts/auth";

export class VerifyMfaOtpDto {
  session_token?: string;
  otp?: string;
}

export class VerifyMfaRecoveryCodeDto {
  session_token?: string;
  code?: string;
}

export class RecordMfaRecoveryCodeAccessDto {
  action?: MfaRecoveryCodeAccessAction | string;
}

