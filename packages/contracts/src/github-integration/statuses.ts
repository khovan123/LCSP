export const REPOSITORY_CONNECTION_STATUSES = {
  active: "ACTIVE",
  revoked: "REVOKED",
} as const;

export const GITHUB_REPOSITORY_PERMISSION_LEVELS = {
  read: "READ",
} as const;

export type RepositoryConnectionStatus =
  (typeof REPOSITORY_CONNECTION_STATUSES)[keyof typeof REPOSITORY_CONNECTION_STATUSES];

export const REPOSITORY_SNAPSHOT_STATUSES = {
  ready: "READY",
} as const;

export type RepositorySnapshotStatus =
  (typeof REPOSITORY_SNAPSHOT_STATUSES)[keyof typeof REPOSITORY_SNAPSHOT_STATUSES];

export const REPOSITORY_SCAN_JOB_STATUSES = {
  queued: "QUEUED",
  running: "RUNNING",
  completed: "COMPLETED",
  failed: "FAILED",
  blocked: "BLOCKED",
  pendingMapping: "PENDING_MAPPING",
  blockedMapping: "BLOCKED_MAPPING",
  waitingForContext: "WAITING_FOR_CONTEXT",
  readyToSnapshot: "READY_TO_SNAPSHOT",
} as const;

export type RepositoryScanJobStatus =
  (typeof REPOSITORY_SCAN_JOB_STATUSES)[keyof typeof REPOSITORY_SCAN_JOB_STATUSES];

export const REPOSITORY_SCAN_TRIGGER_SOURCES = {
  manual: "MANUAL",
  trusted: "TRUSTED",
} as const;

export type RepositoryScanTriggerSource =
  (typeof REPOSITORY_SCAN_TRIGGER_SOURCES)[keyof typeof REPOSITORY_SCAN_TRIGGER_SOURCES];
