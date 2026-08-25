import type { AuthUserRole } from "@lcsp/contracts/auth";
import type { AuthorizationDecision } from "../../../domain/models/auth-workspace.models.ts";
import type { AuthProblemResult } from "./common.contract.ts";

export type WorkspaceRequest = {
  correlationId?: string;
  session_token?: string;
};

export type WorkspaceAuthorization =
  | AuthProblemResult
  | {
      ok: true;
      decision: AuthorizationDecision;
      role: AuthUserRole;
      granted_actions: string[];
    };

export type WorkspaceSuccess = {
  ok: true;
  user_id: string;
  display_name: string;
  role: AuthUserRole;
  granted_actions: string[];
  session_expires_at: string;
  mfa_verified: boolean;
  correlationId: string;
};
