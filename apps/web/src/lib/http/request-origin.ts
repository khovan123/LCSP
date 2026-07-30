export function resolvePublicOrigin(request: Request): string {
  const configuredOrigin = toOrigin(process.env.LCSP_PUBLIC_ORIGIN);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestUrl = new URL(request.url);
  const forwardedHost = firstForwardedValue(
    request.headers.get("x-forwarded-host"),
  );
  const host = forwardedHost ?? request.headers.get("host");
  const forwardedProto = firstForwardedValue(
    request.headers.get("x-forwarded-proto"),
  );
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : requestUrl.protocol.slice(0, -1);

  return toOrigin(host ? `${protocol}://${host}` : null) ?? requestUrl.origin;
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",", 1)[0]?.trim() || null;
}

function toOrigin(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : null;
  } catch {
    return null;
  }
}
