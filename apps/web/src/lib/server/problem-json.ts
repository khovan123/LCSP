import { NextResponse } from "next/server";
import { createSuccessResult, type AppResult } from "@lcsp/contracts/auth";

import { problemEnvelope } from "@/lib/api/problem-envelope";

export function problemJson(
  code: string,
  init: { status: number; correlationId?: string },
) {
  return NextResponse.json(
    problemEnvelope(code, init.status, init.correlationId),
    {
      status: init.status,
    },
  );
}

export function successJson<TData>(
  data: TData,
  init: { status?: number } = {},
) {
  return NextResponse.json(createSuccessResult(data), {
    status: init.status ?? 200,
  });
}

export function resultJson(result: AppResult | null, init: { status: number }) {
  return NextResponse.json(result, { status: init.status });
}

export function readResultData(payload: unknown): unknown {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const result = payload as Partial<AppResult>;
  return result.ok === true ? result.data : payload;
}
