import { NextRequest } from "next/server";
import { AUTH_ERROR_CODES } from "@lcsp/contracts/auth";

import {
  isMockModeEnabled,
  readMockJson,
} from "@/lib/server/fixtures/response";
import type { MockManagerAccount } from "@/lib/server/fixtures/workspace";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const body: unknown = await request.json().catch(() => null);

  if (isMockModeEnabled()) {
    const managerAccount = await readMockJson<MockManagerAccount>(
      "manager-account.json",
    );
    const password =
      typeof body === "object" && body !== null
        ? (body as { password?: unknown }).password
        : undefined;

    if (session.token !== "mock-session:manager") {
      return problemJson(AUTH_ERROR_CODES.sessionInvalid, { status: 401 });
    }

    if (password !== managerAccount.password) {
      return problemJson(AUTH_ERROR_CODES.invalidCredentials, { status: 401 });
    }

    return successJson({ verified: true });
  }

  const upstream = await upstreamRequest("/auth/re-auth/password", {
    method: "POST",
    bearerToken: session.token,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      password:
        typeof body === "object" && body !== null
          ? (body as { password?: unknown }).password
          : undefined,
    }),
  });

  return upstreamJson(upstream);
}
