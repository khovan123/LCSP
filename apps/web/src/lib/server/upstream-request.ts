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

export type UpstreamBinaryRequestResult = {
  bytes: Uint8Array | null;
  contentDisposition: string | null;
  contentType: string | null;
  result: AppResult | null;
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
  const response = await fetchUpstream(path, init);
  const result = toAppResult(await response.json().catch(() => null));

  return {
    result,
    data: readResultData(result),
    ok: response.ok && result?.ok === true,
    status: response.status,
    problemCode: getProblemCode(result),
  };
}

export async function upstreamBinaryRequest(
  path: string | URL,
  init: UpstreamRequestInit = {},
): Promise<UpstreamBinaryRequestResult> {
  const response = await fetchUpstream(path, init);
  if (!response.ok) {
    const result = toAppResult(await response.json().catch(() => null));
    return {
      bytes: null,
      contentDisposition: null,
      contentType: response.headers.get("content-type"),
      result,
      ok: false,
      status: response.status,
      problemCode: getProblemCode(result),
    };
  }

  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentDisposition: response.headers.get("content-disposition"),
    contentType: response.headers.get("content-type"),
    result: null,
    ok: true,
    status: response.status,
  };
}

export function upstreamJson(
  upstream: Pick<UpstreamRequestResult, "result" | "status">,
) {
  if (upstream.result === null) {
    return problemJson(SHARED_ERROR_CODES.upstreamResponseInvalid, {
      status: 502,
    });
  }
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

async function fetchUpstream(
  path: string | URL,
  init: UpstreamRequestInit,
): Promise<Response> {
  const { bearerToken, headers, ...fetchInit } = init;
  const requestHeaders = new Headers(headers);
  if (bearerToken) {
    requestHeaders.set("authorization", `Bearer ${bearerToken}`);
  }

  return fetch(typeof path === "string" ? upstreamUrl(path) : path, {
    cache: "no-store",
    ...fetchInit,
    headers: requestHeaders,
  });
}
