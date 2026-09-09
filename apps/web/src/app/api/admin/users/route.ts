import { NextRequest } from "next/server";
import {
  AUTH_ACCOUNT_STATUSES,
  AUTH_ERROR_CODES,
  AUTH_USER_ROLES,
  type AdminUserDetail,
  type AdminUserListResponse,
  type AdminUserSummary,
} from "@lcsp/contracts/auth";

import { readMockJson } from "@/lib/server/fixtures/response";
import { problemJson, successJson } from "@/lib/server/problem-json";
import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function GET(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) {
    return session.response;
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("query") ?? url.searchParams.get("q") ?? "").trim().toLowerCase();
  const status = url.searchParams.get("status") ?? "ALL";
  const role = url.searchParams.get("role") ?? "ALL";
  const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.max(1, Math.min(100, Number.parseInt(url.searchParams.get("page_size") ?? url.searchParams.get("pageSize") ?? "10", 10) || 10));

  // Forward to upstream backend if available
  const upstream = await upstreamRequest(`/admin/users?${url.searchParams.toString()}`, {
    bearerToken: session.token,
  });

  if (upstream.ok && upstream.result?.ok) {
    return upstreamJson(upstream);
  }

  // If upstream is forbidden / unauthorized, return upstream problem directly
  if (upstream.status === 401 || upstream.status === 403) {
    return upstreamJson(upstream);
  }

  // Mock fallback for development prior to LCSP-299 backend implementation
  try {
    const allUsers = await readMockJson<AdminUserDetail[]>("admin-users.json");

    let filtered = allUsers.map((u): AdminUserSummary => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
      lastActiveAt: u.lastActiveAt,
      assessmentCount: u.usageSummary?.assessments30d ?? 0,
    }));


    if (query) {
      filtered = filtered.filter(
        (u) =>
          u.fullName.toLowerCase().includes(query) ||
          u.email.toLowerCase().includes(query),
      );
    }

    if (status !== "ALL" && Object.values(AUTH_ACCOUNT_STATUSES).includes(status as never)) {
      filtered = filtered.filter((u) => u.status === status);
    }

    if (role !== "ALL" && Object.values(AUTH_USER_ROLES).includes(role as never)) {
      filtered = filtered.filter((u) => u.role === role);
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
    const paginatedUsers = filtered.slice((page - 1) * pageSize, page * pageSize);

    const responseData: AdminUserListResponse = {
      users: paginatedUsers,
      totalCount,
      page,
      pageSize,
      totalPages,
    };

    return successJson(responseData);
  } catch {
    return problemJson(AUTH_ERROR_CODES.authzEvaluatorFailure, { status: 500 });
  }
}
