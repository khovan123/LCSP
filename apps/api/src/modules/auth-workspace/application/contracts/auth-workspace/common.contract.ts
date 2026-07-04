import type { Membership } from "../../../domain/models/auth-workspace.models.ts";
import type { ProblemResult } from "@lcsp/contracts/auth";

export type SafeUserProjection = {
  user_id: string;
  email: string;
  organization_id: string;
  membership_status: Membership["status"];
  subject_attributes: Membership["subjectAttributes"];
};

export type RequestMeta = {
  correlation_id?: string;
};

export type AuthProblemResult = ProblemResult;
