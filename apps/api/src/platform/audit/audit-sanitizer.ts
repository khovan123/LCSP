const SENSITIVE_KEY_PATTERN = /password|token|secret|key|nonce|code|hash/i;

export interface SanitizeResult {
  payload: Record<string, unknown> | undefined;
  removedKeys: string[];
}

export class AuditSanitizer {
  static sanitize(payload?: Record<string, unknown>): SanitizeResult {
    if (!payload) {
      return { payload: undefined, removedKeys: [] };
    }

    const removedKeys: string[] = [];
    return {
      payload: sanitizeRecord(payload, "", removedKeys),
      removedKeys,
    };
  }
}

function sanitizeRecord(
  value: Record<string, unknown>,
  parentPath: string,
  removedKeys: string[],
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(value).flatMap(([key, child]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        removedKeys.push(path);
        return [];
      }
      return [[key, sanitizeValue(child, path, removedKeys)]];
    }),
  );
}

function sanitizeValue(
  value: unknown,
  path: string,
  removedKeys: string[],
): unknown {
  if (Array.isArray(value)) {
    const items: unknown[] = value;
    return items.map((item, index) =>
      isRecord(item)
        ? sanitizeRecord(item, `${path}[${index}]`, removedKeys)
        : item,
    );
  }
  return isRecord(value) ? sanitizeRecord(value, path, removedKeys) : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
