export const SESSION_COOKIE_NAME = "lcsp_session";

export const sessionCookieOptions = Object.freeze({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 8,
});
