import { NextRequest } from "next/server";
import { requireSessionToken } from "@/lib/server/session-token";
import {
  upstreamRequest,
  validatedUpstreamJson,
} from "@/lib/server/upstream-request";
import { parseBillingAdminDashboard } from "@/features/admin/schemas/billing-admin.schema";

const BILLING_ADMIN_QUERY_KEYS = [
  "period",
  "status",
  "gateway",
  "page",
  "pageSize",
] as const;

export async function GET(request: NextRequest) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;

  const query = new URLSearchParams();
  for (const key of BILLING_ADMIN_QUERY_KEYS) {
    const value = request.nextUrl.searchParams.get(key);
    if (value) query.set(key, value);
  }

  return validatedUpstreamJson(
    await upstreamRequest(`/admin/billing?${query.toString()}`, {
      bearerToken: session.token,
    }),
    parseBillingAdminDashboard,
  );
}
