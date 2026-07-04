export type RequestRecoveryPayload = {
  email?: string;
};

export type RequestRecoverySuccess = {
  ok: true;
  correlation_id: string;
};

export type ConfirmRecoveryPayload = {
  token?: string;
  new_password?: string;
};

export type ConfirmRecoverySuccess = {
  ok: true;
  correlation_id: string;
};
