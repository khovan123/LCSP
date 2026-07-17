export const REPOSITORY_CONNECTION_STATUSES = {
  active: "active",
  revoked: "revoked",
} as const;

export const GITHUB_REPOSITORY_PERMISSION_LEVELS = {
  read: "read",
} as const;

export type RepositoryConnectionStatus =
  (typeof REPOSITORY_CONNECTION_STATUSES)[keyof typeof REPOSITORY_CONNECTION_STATUSES];
