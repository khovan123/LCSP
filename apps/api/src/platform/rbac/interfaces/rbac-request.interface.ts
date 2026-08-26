import type { AuthUserRole } from "@lcsp/contracts/auth";

export interface RbacRequestContext {
  userId: string;
  sessionId: string;
  role: AuthUserRole;
  scope: string | null;
  grantedActions: readonly string[];
  selectedAction: string | null;
}
