export type EnrollMfaSuccess = {
  ok: true;
  correlation_id: string;
  totp_uri: string;
};

export type VerifyMfaOtpSuccess = {
  ok: true;
  correlation_id: string;
};

export type DisableMfaSuccess = {
  ok: true;
  correlation_id: string;
};
