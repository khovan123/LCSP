import { NextRequest } from "next/server";
import {
  ADMIN_ERROR_CODES,
  type AdminUserDetail,
} from "@lcsp/contracts/auth";

import { readMockJson } from "@/lib/server/fixtures/response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) {
    return session.response;
  }

  const { id } = await params;

  // Forward to upstream backend if available
  const upstream = await upstreamRequest(`/admin/users/${id}`, {
    bearerToken: session.token,
  });

  if (upstream.ok && upstream.result?.ok) {
    return upstreamJson(upstream);
  }

  if (upstream.status === 401 || upstream.status === 403) {
    return upstreamJson(upstream);
  }

  // Mock fallback for development prior to LCSP-299 backend implementation
  try {
    const allUsers = await readMockJson<AdminUserDetail[]>("admin-users.json");
    const user = allUsers.find((u) => u.id === id);

    if (!user) {
      return problemJson(ADMIN_ERROR_CODES.userNotFound, { status: 404 });
    }

    return successJson(user);
  } catch {
    return problemJson(ADMIN_ERROR_CODES.userNotFound, { status: 404 });
  }
}
