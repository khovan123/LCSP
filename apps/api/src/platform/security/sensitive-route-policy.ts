type SensitiveRouteDefinition = {
  routeId: string;
  method: string;
  pathTemplate: string;
};

export const SENSITIVE_ROUTE_IDS = {
  githubAppStart: "GITHUB_APP_START",
  mfaRecoveryCodesGenerate: "MFA_RECOVERY_CODES_GENERATE",
} as const;

const sensitiveRouteRegistry = new Map<string, SensitiveRouteDefinition>();

export const SENSITIVE_ACTION_REAUTH_TTL_MS = 5 * 60_000;

export type SensitiveRouteMatch = {
  routeId: string;
};

type SensitiveActionVerifiedAt = Date | number | null | undefined;

export function registerSensitiveRoute(
  definition: SensitiveRouteDefinition,
): void {
  const normalizedMethod = definition.method.trim().toUpperCase();
  const normalizedPathTemplate = normalizeRoutePath(definition.pathTemplate);
  if (
    definition.routeId.trim().length === 0 ||
    normalizedMethod.length === 0 ||
    normalizedPathTemplate.length === 0
  ) {
    return;
  }

  const registryKey = [
    definition.routeId,
    normalizedMethod,
    normalizedPathTemplate,
  ].join(":");
  sensitiveRouteRegistry.set(registryKey, {
    routeId: definition.routeId,
    method: normalizedMethod,
    pathTemplate: normalizedPathTemplate,
  });
}

export function isSensitiveRoute(method: string, route: string): boolean {
  return matchSensitiveRoute(method, route) !== null;
}

export function matchSensitiveRoute(
  method: string,
  route: string,
): SensitiveRouteMatch | null {
  const normalizedMethod = method.trim().toUpperCase();
  const normalizedPath = normalizeRoutePath(route);

  const policy = Array.from(sensitiveRouteRegistry.values()).find(
    (candidate) =>
      candidate.method === normalizedMethod &&
      pathTemplateMatches(candidate.pathTemplate, normalizedPath),
  );

  return policy ? { routeId: policy.routeId } : null;
}

export function sensitiveActionVerificationExpiresAt(
  verifiedAt: SensitiveActionVerifiedAt,
): Date | null {
  const verifiedAtMs = sensitiveActionVerifiedAtMs(verifiedAt);
  return verifiedAtMs
    ? new Date(verifiedAtMs + SENSITIVE_ACTION_REAUTH_TTL_MS)
    : null;
}

export function isSensitiveActionVerificationFresh(
  verifiedAt: SensitiveActionVerifiedAt,
  now: number,
): boolean {
  const expiresAt = sensitiveActionVerificationExpiresAt(verifiedAt);
  return expiresAt !== null && expiresAt.getTime() > now;
}

function sensitiveActionVerifiedAtMs(
  verifiedAt: SensitiveActionVerifiedAt,
): number | null {
  if (verifiedAt instanceof Date) {
    return verifiedAt.getTime();
  }

  return typeof verifiedAt === "number" ? verifiedAt : null;
}

function normalizeRoutePath(route: string): string {
  const trimmedRoute = route.trim();
  if (trimmedRoute.length === 0) {
    return "";
  }

  try {
    return new URL(trimmedRoute, "http://lcsp.local").pathname;
  } catch {
    return "";
  }
}

function pathTemplateMatches(template: string, path: string): boolean {
  return compilePathTemplate(template).test(path);
}

function compilePathTemplate(template: string): RegExp {
  const pattern = template
    .split("/")
    .map((segment) => {
      if (segment === "*") {
        return ".*";
      }

      if (segment.startsWith(":")) {
        return "[^/]+";
      }

      return escapeRegExp(segment);
    })
    .join("/");

  return new RegExp(`^${pattern}$`, "u");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}
