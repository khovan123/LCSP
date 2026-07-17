export const AUTH_MEMBERSHIP_STATUSES = {
  invited: "invited",
  active: "active",
  revoked: "revoked",
} as const;

export const AUTH_INVITATION_STATES = {
  approved: "approved",
  pending: "pending",
  consumed: "consumed",
} as const;

export const WORKSPACE_CAPABILITY_SOURCES = {
  backendProjection: "backend_projection",
} as const;
