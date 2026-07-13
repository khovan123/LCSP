import developerPolicy from "./policies/developer-policy.json" with { type: "json" };

export const DEVELOPER_SUBJECT_ROLE = developerPolicy.subjectRole;
export const DEVELOPER_ALLOWED_ACTIONS = developerPolicy.allowedActions;

export function isDeveloperAllowedAction(action: string): boolean {
  return DEVELOPER_ALLOWED_ACTIONS.includes(action);
}
