import type { DEVELOPER_ALLOWED_ACTION_VALUES } from "./developer-policy.ts";

export type DeveloperAllowedAction =
  (typeof DEVELOPER_ALLOWED_ACTION_VALUES)[number];
