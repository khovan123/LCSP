import type { AuthMembershipStatus } from "../auth/types.ts";
import { PBAC_DECISION } from "./decisions.ts";
import type { PbacReasonCode } from "./decisions.ts";

export const SUBJECT_ROLES = {
  manager: "Manager",
  developer: "Developer",
  systemAdmin: "SystemAdmin",
} as const;

export const PBAC_STATE_GATES = {
  membershipActive: "membership_active",
} as const;

export type SubjectRole = (typeof SUBJECT_ROLES)[keyof typeof SUBJECT_ROLES];
export type StateGate =
  (typeof PBAC_STATE_GATES)[keyof typeof PBAC_STATE_GATES];
export type PbacDecision = (typeof PBAC_DECISION)[keyof typeof PBAC_DECISION];

export interface PolicyDocument {
  id: string;
  organizationId: string;
  version: string;
  subjectRole: SubjectRole;
  stateGate: StateGate;
  actions: string[];
  conditions?: Record<string, unknown>;
}

export interface SubjectAttributes {
  role: SubjectRole;
  scope?: string;
}

export interface PbacEvaluationContext {
  action: string;
  subject: SubjectAttributes;
  policy: PolicyDocument;
  membershipStatus: AuthMembershipStatus;
}

export interface PbacDecisionResult {
  decision: PbacDecision;
  reasonCode?: PbacReasonCode;
  policyId: string;
  policyVersion: string;
}
