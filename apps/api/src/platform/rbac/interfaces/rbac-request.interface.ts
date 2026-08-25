import type { AuthUserRole } from "../rbac.types.js";

export interface RbacRequestContext {
  userId: string;
  sessionId: string;
  organizationId: string;
  role: AuthUserRole;
  scope: string | null;
  grantedActions: readonly string[];
  selectedAction: string | null;
}
