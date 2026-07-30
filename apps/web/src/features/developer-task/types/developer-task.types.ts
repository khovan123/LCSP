import type { EvidenceSeverity } from "@lcsp/contracts/evidence";

import {
  API_OUTCOME_KINDS,
  API_REDIRECT_LOCATIONS,
} from "../../../lib/api/outcome-kinds.ts";

export const DEVELOPER_TASK_SCOPE_TYPES = {
  assessment: "assessment",
  organization: "organization",
} as const;

type DeveloperTaskScopeTypes =
  typeof DEVELOPER_TASK_SCOPE_TYPES[keyof typeof DEVELOPER_TASK_SCOPE_TYPES];

export type DeveloperTaskContext = {
  organization: { id: string; name: string };
  scope:
    | {
        type: typeof DEVELOPER_TASK_SCOPE_TYPES.assessment;
        assessment: { id: string; name: string };
      }
    | { type: typeof DEVELOPER_TASK_SCOPE_TYPES.organization; assessment: null };
  granted_actions: string[];
};

export type DeveloperFinding = {
  finding_id: string;
  tool: string;
  finding_type: string;
  severity: EvidenceSeverity;
  description: string;
};

export type DeveloperTaskContextOutcome =
  | { kind: typeof API_OUTCOME_KINDS.loaded; context: DeveloperTaskContext }
  | {
      kind: typeof API_OUTCOME_KINDS.redirect;
      location:
        (typeof API_REDIRECT_LOCATIONS)[keyof typeof API_REDIRECT_LOCATIONS];
    }
  | { kind: typeof API_OUTCOME_KINDS.accessRevoked }
  | { kind: typeof API_OUTCOME_KINDS.error };

export type EvidenceOutcome =
  | { kind: typeof API_OUTCOME_KINDS.loaded; findings: DeveloperFinding[] }
  | { kind: typeof API_OUTCOME_KINDS.empty }
  | {
      kind: typeof API_OUTCOME_KINDS.redirect;
      location:
        (typeof API_REDIRECT_LOCATIONS)[keyof typeof API_REDIRECT_LOCATIONS];
    }
  | { kind: typeof API_OUTCOME_KINDS.accessRevoked }
  | { kind: typeof API_OUTCOME_KINDS.error };

export function isDeveloperTaskScopeType(
  value: unknown,
): value is DeveloperTaskScopeTypes {
  return (
    value === DEVELOPER_TASK_SCOPE_TYPES.assessment ||
    value === DEVELOPER_TASK_SCOPE_TYPES.organization
  );
}
