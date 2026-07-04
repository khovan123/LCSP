import type { AuthorizationDecision } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_AUTHORIZATION_DECISION_REPOSITORY",
);

export interface AuthorizationDecisionRepository {
  append(decision: AuthorizationDecision): Promise<void>;
}
