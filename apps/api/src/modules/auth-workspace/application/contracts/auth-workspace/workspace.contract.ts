import type { AuthorizationDecision } from "../../../domain/models/auth-workspace.models.ts";
import type { WorkspaceCapabilitySource } from "@lcsp/contracts/auth";
import type { AuthProblemResult } from "./common.contract.ts";

export type WorkspaceRequest = {
  correlation_id?: string;
  organization_id?: string;
  session_token?: string;
};

export type WorkspaceAuthorization =
  AuthProblemResult | { ok: true; decision: AuthorizationDecision };

export type WorkspaceSuccess = {
  ok: true;
  correlation_id: string;
  workspace: {
    id: string;
    organization_id: string;
    name: string;
  };
  capabilities: {
    can_view_workspace: true;
    source: WorkspaceCapabilitySource;
  };
};
