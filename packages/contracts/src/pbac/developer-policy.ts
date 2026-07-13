import type { DeveloperAllowedAction } from "./types.ts";

export const DEVELOPER_SUBJECT_ROLE = "Developer";

export const DEVELOPER_ALLOWED_ACTION_VALUES = [
  "evidence:read:redacted",
  "ai-usage-flow:read",
  "findings:read:redacted",
  "conflict:comment",
] as const;

export const DEVELOPER_ALLOWED_ACTIONS: string[] = [
  ...DEVELOPER_ALLOWED_ACTION_VALUES,
];

export function isDeveloperAllowedAction(
  action: string,
): action is DeveloperAllowedAction {
  return (DEVELOPER_ALLOWED_ACTIONS as readonly string[]).includes(action);
}
