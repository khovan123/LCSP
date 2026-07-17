import type { SubjectRole } from "../pbac.types.js";

export interface PbacRequestContext {
  userId: string;
  sessionId: string;
  organizationId: string;
  subjectRole: SubjectRole;
  scope: string | null;
  grantedActions: string[];
  policyId: string | null;
  policyVersion: string | null;
}
