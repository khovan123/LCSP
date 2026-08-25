import type { AuthMembershipStatus, AuthUserRole } from "../auth/types.ts";
import { RBAC_DECISION } from "./decisions.ts";
import type { RbacReasonCode } from "./decisions.ts";

export const RBAC_METADATA_TYPES = {
  action: "ACTION",
  actionAny: "ACTION_ANY",
  session: "SESSION",
} as const;

export type RbacMetadataType =
  (typeof RBAC_METADATA_TYPES)[keyof typeof RBAC_METADATA_TYPES];
export type RbacDecision = (typeof RBAC_DECISION)[keyof typeof RBAC_DECISION];

export interface RbacSubject {
  role: AuthUserRole;
  scope?: string;
}

export interface RbacEvaluationContext {
  organizationId: string;
  action: string;
  subject: RbacSubject;
  grantedActions: readonly string[];
  membershipStatus: AuthMembershipStatus;
}

export interface RbacDecisionResult {
  decision: RbacDecision;
  reasonCode?: RbacReasonCode;
}
