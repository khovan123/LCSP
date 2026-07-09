import type {
  PbacDecision,
  PbacDecisionResult,
  PbacEvaluationContext,
  PolicyDocument,
  SubjectAttributes,
  SubjectRole,
} from "@lcsp/contracts/pbac";

export type {
  PbacDecision,
  PbacDecisionResult,
  PbacEvaluationContext,
  PolicyDocument,
  SubjectAttributes,
  SubjectRole,
};

export interface PbacMembershipContext {
  organizationId: string;
  userId: string;
  membershipStatus: string;
  policyId: string;
  policyVersion: string;
}
