export const AUTH_MEMBERSHIP_STATUSES = {
  invited: "INVITED",
  active: "ACTIVE",
  revoked: "REVOKED",
} as const;

export const AUTH_INVITATION_STATES = {
  approved: "APPROVED",
  pending: "PENDING",
  consumed: "CONSUMED",
} as const;

export const WORKSPACE_CAPABILITY_SOURCES = {
  backendProjection: "BACKEND_PROJECTION",
} as const;
