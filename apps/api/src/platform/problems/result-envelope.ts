import { createSuccessResult, type AppResult } from "@lcsp/contracts/auth";

export function resultEnvelope<TData>(value: TData): AppResult<TData, string> {
  if (isApiResult(value)) {
    return value as AppResult<TData, string>;
  }

  return createSuccessResult(value);
}

export function isApiResult(
  value: unknown,
): value is AppResult<unknown, string> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as { ok?: unknown };
  return candidate.ok === true || candidate.ok === false;
}
