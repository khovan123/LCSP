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

export const REPOSITORY_SCAN_JOB_STATUSES = {
  queued: "QUEUED",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
  blocked: "BLOCKED",
} as const;

export type RepositoryScanJobStatus =
  (typeof REPOSITORY_SCAN_JOB_STATUSES)[keyof typeof REPOSITORY_SCAN_JOB_STATUSES];

export const REPOSITORY_SCAN_TRIGGER_SOURCES = {
  manual: "manual",
  trusted: "trusted",
} as const;

export type RepositoryScanTriggerSource =
  (typeof REPOSITORY_SCAN_TRIGGER_SOURCES)[keyof typeof REPOSITORY_SCAN_TRIGGER_SOURCES];
