import { NextRequest } from "next/server";
import {
  AUTH_ERROR_CODES,
  AUTH_USER_ROLES,
  type AdminUserDetail,
  type AuthUserRole,
} from "@lcsp/contracts/auth";

import { readMockJson } from "@/lib/server/fixtures/response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) {
    return session.response;
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { role?: string } | null;

  if (!body || !body.role || !Object.values(AUTH_USER_ROLES).includes(body.role as never)) {
    return problemJson(AUTH_ERROR_CODES.validationFailed, { status: 400 });
  }

  const targetRole = body.role as AuthUserRole;

  // Forward to upstream backend if available
  const upstream = await upstreamRequest(`/admin/users/${id}/role`, {
    method: "POST",
    bearerToken: session.token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role: targetRole }),
  });

  if (upstream.ok && upstream.result?.ok) {
    return upstreamJson(upstream);
  }

  if (upstream.status === 401 || upstream.status === 403 || upstream.status === 400 || upstream.status === 404 || upstream.status === 409) {
    return upstreamJson(upstream);
  }

  // Mock fallback for development prior to LCSP-299 backend implementation
  try {
    const allUsers = await readMockJson<AdminUserDetail[]>("admin-users.json");
    const user = allUsers.find((u) => u.id === id);

    if (!user) {
      return problemJson(AUTH_ERROR_CODES.accountNotFound, { status: 404 });
    }

    const updatedUser: AdminUserDetail = {
      ...user,
      role: targetRole,
    };

    return successJson(updatedUser);
  } catch {
    return problemJson(AUTH_ERROR_CODES.authzEvaluatorFailure, { status: 500 });
  }
}
