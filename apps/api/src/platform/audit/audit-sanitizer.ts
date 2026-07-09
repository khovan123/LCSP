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
    const kept = Object.entries(payload).filter(([key]) => {
      const isSensitive = SENSITIVE_KEY_PATTERN.test(key);
      if (isSensitive) {
        removedKeys.push(key);
      }
      return !isSensitive;
    });

    return { payload: Object.fromEntries(kept), removedKeys };
  }
}
