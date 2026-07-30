import { apiRequest } from "./api-request";

export type DeveloperMember = {
  user_id: string;
  email: string;
  display_name?: string;
  status: string;
  allowed_actions: string[];
  revoked_at?: string | null;
};

export async function getDevelopers(): Promise<DeveloperMember[]> {
  const { payload, ok } = await apiRequest("/api/workspace/developers");
  if (!ok || !Array.isArray(payload)) {
    return [];
  }
  return payload as DeveloperMember[];
}

export async function inviteDeveloper(
  email: string,
): Promise<{ ok: boolean }> {
  const { ok } = await apiRequest("/api/workspace/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return { ok };
}

export async function revokeMembership(
  userId: string,
): Promise<{ ok: boolean }> {
  const { ok } = await apiRequest(
    `/api/workspace/memberships/${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
    },
  );
  return { ok };
}
