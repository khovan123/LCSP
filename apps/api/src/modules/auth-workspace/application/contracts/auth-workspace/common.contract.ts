import type {
  AuthMembershipStatus,
  AuthUserRole,
  ProblemResult,
} from "@lcsp/contracts/auth";

export type SafeUserProjection = {
  user_id: string;
  email: string;
  organization_id: string;
  membership_status: AuthMembershipStatus;
  subject_attributes: { role: AuthUserRole };
};

export type RequestMeta = {
  correlationId?: string;
  app_origin?: string;
};

export type AuthProblemResult = ProblemResult;
