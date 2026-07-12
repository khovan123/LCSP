export function buildMfaVerifyApiBody(sessionToken: string, body: unknown) {
  const otp =
    typeof body === "object" && body !== null
      ? (body as { otp?: unknown }).otp
      : undefined;

  return { session_token: sessionToken, otp };
}
