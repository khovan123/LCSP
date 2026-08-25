import type { SubjectRole } from "../rbac.types.js";

export interface RbacRequestContext {
  userId: string;
  sessionId: string;
  organizationId: string;
  subjectRole: SubjectRole;
  scope: string | null;
  grantedActions: string[];
  selectedAction: string | null;
  policyId: string | null;
  policyVersion: string | null;
}
