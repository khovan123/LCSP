import type { AppResult } from "@lcsp/contracts/auth";
import { SHARED_ERROR_CODES } from "@lcsp/contracts/shared";

import { getProblemCode } from "@/lib/api/problem-envelope";
import {
  problemJson,
  readResultData,
  resultJson,
  successJson,
} from "@/lib/server/problem-json";

const upstreamBaseUrl =
  process.env.LCSP_API_BASE_URL ?? "http://localhost:3001";

export type UpstreamRequestInit = RequestInit & {
  bearerToken?: string;
};

export type UpstreamRequestResult = {
  result: AppResult | null;
  data: unknown;
  ok: boolean;
  status: number;
  problemCode?: string;
};

export function upstreamUrl(path: string): URL {
  return new URL(path, upstreamBaseUrl);
}

export async function upstreamRequest(
  path: string | URL,
  init: UpstreamRequestInit = {},
): Promise<UpstreamRequestResult> {
  const { bearerToken, headers, ...fetchInit } = init;
  const requestHeaders = new Headers(headers);
  if (bearerToken) {
    requestHeaders.set("authorization", `Bearer ${bearerToken}`);
  }

  const response = await fetch(
    typeof path === "string" ? upstreamUrl(path) : path,
    {
      cache: "no-store",
      ...fetchInit,
      headers: requestHeaders,
    },
  );
  const result = toAppResult(await response.json().catch(() => null));

  return {
    result,
    data: readResultData(result),
    ok: response.ok && result?.ok === true,
    status: response.status,
    problemCode: getProblemCode(result),
  };
}

export function upstreamJson(
  upstream: Pick<UpstreamRequestResult, "result" | "status">,
) {
  return resultJson(upstream.result, { status: upstream.status });
}

export function validatedUpstreamJson<TData>(
  upstream: UpstreamRequestResult,
  sanitize: (data: unknown) => TData | null,
) {
  if (!upstream.ok) {
    return upstreamJson(upstream);
  }

  const sanitized = sanitize(upstream.data);
  return sanitized === null
    ? problemJson(SHARED_ERROR_CODES.upstreamResponseInvalid, { status: 502 })
    : successJson(sanitized, { status: upstream.status });
}

function toAppResult(payload: unknown): AppResult | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const result = payload as Partial<AppResult>;
  return result.ok === true || result.ok === false
    ? (payload as AppResult)
    : null;
}
