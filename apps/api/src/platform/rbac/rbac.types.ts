import type { AuthMembershipStatus, AuthUserRole } from "@lcsp/contracts/auth";
import type {
  RbacDecision,
  RbacDecisionResult,
  RbacEvaluationContext,
  RbacSubject,
} from "@lcsp/contracts/rbac";

export type {
  RbacDecision,
  RbacDecisionResult,
  RbacEvaluationContext,
  RbacSubject,
  AuthUserRole,
};

export interface RbacMembershipContext {
  organizationId: string;
  userId: string;
  membershipStatus: AuthMembershipStatus;
  role: AuthUserRole;
}
