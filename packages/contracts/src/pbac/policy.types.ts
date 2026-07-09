export type SubjectRole = "Manager" | "Developer" | "SystemAdmin";
export type StateGate = "membership_active";
export type PbacDecision = "allow" | "deny";

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
  membershipStatus: string;
}

export interface PbacDecisionResult {
  decision: PbacDecision;
  reasonCode?: string;
  policyId: string;
  policyVersion: string;
}
