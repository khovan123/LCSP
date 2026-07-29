import type { AppResult } from "@lcsp/contracts/auth";

import { getProblemCode } from "./problem-envelope.ts";

export type ApiRequestResult = {
  payload: unknown;
  result: AppResult | null;
  ok: boolean;
  status: number;
  problemCode?: string;
};

export async function apiRequest(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ApiRequestResult> {
  const response = await fetch(input, {
    credentials: "same-origin",
    ...init,
  });
  const result = toApiResult(await response.json().catch(() => null));
  const payload = result?.ok === true ? result.data : result;

  return {
    result,
    payload,
    ok: response.ok && result?.ok === true,
    status: response.status,
    problemCode: getProblemCode(result),
  };
}

export async function apiJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T | null> {
  const { payload, ok } = await apiRequest(input, init);
  return ok ? (payload as T) : null;
}

function toApiResult(payload: unknown): AppResult | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const result = payload as Partial<AppResult>;
  return result.ok === true || result.ok === false
    ? (payload as AppResult)
    : null;
}
