export const SCAN_JOB_GUIDANCE = {
  queuedNextAction: "No action is needed while the scan is waiting to start.",
  runningNextAction: "No action is needed while the scan is in progress.",
  failedNextAction:
    "Start the scan again. Contact support if the problem continues.",
  blockedNextAction: "Complete the required setup, then start the scan again.",
  blockedReason:
    "The scan cannot continue until the required setup is complete.",
} as const;
