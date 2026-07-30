import { NextRequest } from "next/server";

import { requireSessionToken } from "@/lib/server/session-token";
import { upstreamJson, upstreamRequest } from "@/lib/server/upstream-request";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const session = requireSessionToken(request);
  if (!session.ok) return session.response;
  const { id, userId } = await params;
  const upstream = await upstreamRequest(
    `/organizations/${encodeURIComponent(id)}/memberships/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      bearerToken: session.token,
    },
  );
  return upstreamJson(upstream);
}
