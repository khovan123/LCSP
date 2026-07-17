export const REPOSITORY_CONNECTION_STATUSES = {
  active: "active",
  revoked: "revoked",
} as const;

export const GITHUB_REPOSITORY_PERMISSION_LEVELS = {
  read: "read",
} as const;

export type RepositoryConnectionStatus =
  (typeof REPOSITORY_CONNECTION_STATUSES)[keyof typeof REPOSITORY_CONNECTION_STATUSES];

export const REPOSITORY_SNAPSHOT_STATUSES = {
  ready: "ready",
} as const;

export type RepositorySnapshotStatus =
  (typeof REPOSITORY_SNAPSHOT_STATUSES)[keyof typeof REPOSITORY_SNAPSHOT_STATUSES];
