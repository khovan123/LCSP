export const GITHUB_INTEGRATION_EVENT_TYPES = {
  appInstallStarted: "GITHUB_APP_INSTALL_STARTED",
  appConnected: "GITHUB_APP_CONNECTED",
  snapshotCreated: "snapshot.created",
  snapshotCreatedAudit: "SNAPSHOT_CREATED",
  snapshotPinFailedAudit: "SNAPSHOT_PIN_FAILED",
  scanTriggered: "scan.triggered",
  scanJobTriggeredAudit: "SCAN_JOB_TRIGGERED",
  scanTriggerRejectedAudit: "SCAN_TRIGGER_REJECTED",
  scanTriggerDuplicateAudit: "SCAN_TRIGGER_DUPLICATE",
} as const;
