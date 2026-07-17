import type { AuthMembershipStatus } from "@lcsp/contracts/auth";
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
  membershipStatus: AuthMembershipStatus;
  policyId: string;
  policyVersion: string;
}
