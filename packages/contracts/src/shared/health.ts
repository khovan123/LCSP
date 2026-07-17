export const SERVICE_HEALTH_STATUSES = {
  ok: "ok",
} as const;

export type ServiceHealthStatus =
  (typeof SERVICE_HEALTH_STATUSES)[keyof typeof SERVICE_HEALTH_STATUSES];
