export type PasswordReauthPayload = {
  session_token?: string;
  password?: string;
};

export type PasswordReauthSuccess = {
  ok: true;
  correlation_id: string;
  verified: true;
};
