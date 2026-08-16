const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * Returns whether explicitly unsafe, fully unredacted development tracing is enabled.
 *
 * This mode is intentionally restricted to non-production runtimes because trace
 * records can contain Authorization headers, session cookies, worker credentials,
 * source code, prompts, model output, idempotency keys, and other sensitive data.
 *
 * @throws Error when unsafe tracing is requested while NODE_ENV=production.
 */
export function unsafeDevTraceEnabled(): boolean {
  const enabled = TRUE_VALUES.has(
    (process.env.LCSP_DEV_UNSAFE_TRACE ?? "").trim().toLowerCase(),
  );
  if (!enabled) {
    return false;
  }
  if ((process.env.NODE_ENV ?? "").trim().toLowerCase() === "production") {
    throw new Error(
      "LCSP_DEV_UNSAFE_TRACE must never be enabled with NODE_ENV=production",
    );
  }
  return true;
}

/**
 * Emits one unredacted JSON-line diagnostic record to stderr in unsafe dev mode.
 *
 * No field-name filtering, source-code stripping, token masking, or truncation is
 * performed here. Circular/non-JSON runtime objects are represented safely so the
 * tracing path cannot accidentally break the application request path.
 *
 * @param event - Stable diagnostic event name.
 * @param fields - Exact diagnostic values to serialize without redaction.
 */
export function emitDevUnsafeTrace(
  event: string,
  fields: Record<string, unknown> = {},
): void {
  if (!unsafeDevTraceEnabled()) {
    return;
  }

  const record = {
    timestamp: new Date().toISOString(),
    level: "UNSAFE_DEV_TRACE",
    event,
    ...fields,
  };

  try {
    process.stderr.write(`${safeStringify(record)}\n`);
  } catch (error) {
    process.stderr.write(
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "UNSAFE_DEV_TRACE",
        event: "DEV_UNSAFE_TRACE_SERIALIZATION_ERROR",
        originalEvent: event,
        error: error instanceof Error ? error.message : String(error),
      })}\n`,
    );
  }
}

function safeStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (typeof entry === "bigint") {
      return entry.toString();
    }
    if (entry instanceof Error) {
      return {
        name: entry.name,
        message: entry.message,
        stack: entry.stack,
        ...(entry as Error & { cause?: unknown }).cause !== undefined
          ? { cause: (entry as Error & { cause?: unknown }).cause }
          : {},
      };
    }
    if (Buffer.isBuffer(entry)) {
      return {
        encoding: "base64",
        value: entry.toString("base64"),
      };
    }
    if (entry && typeof entry === "object") {
      if (seen.has(entry)) {
        return "<cycle>";
      }
      seen.add(entry);
    }
    return entry;
  });
}
