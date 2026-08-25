import { AUTH_USER_ROLES } from "../auth/roles.ts";
import { RBAC_DECISION } from "./decisions.ts";
import type { RbacReasonCode } from "./decisions.ts";

export const RBAC_METADATA_TYPES = {
  action: "ACTION",
  actionAny: "ACTION_ANY",
  session: "SESSION",
} as const;

export type AuthUserRole = (typeof AUTH_USER_ROLES)[keyof typeof AUTH_USER_ROLES];
export const SUBJECT_ROLES = {
  manager: AUTH_USER_ROLES.manager,
  systemAdmin: AUTH_USER_ROLES.admin,
} as const;
export type SubjectRole = AuthUserRole;
export type RbacMetadataType =
  (typeof RBAC_METADATA_TYPES)[keyof typeof RBAC_METADATA_TYPES];
export type RbacDecision = (typeof RBAC_DECISION)[keyof typeof RBAC_DECISION];

export interface RbacSubject {
  role: AuthUserRole;
  scope?: string;
}

export interface RbacEvaluationContext {
  action: string;
  subject: RbacSubject;
  grantedActions: readonly string[];
}

export interface RbacDecisionResult {
  decision: RbacDecision;
  reasonCode?: RbacReasonCode;
}
