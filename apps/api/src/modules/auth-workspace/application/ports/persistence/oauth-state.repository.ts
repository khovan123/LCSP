import type { OAuthState } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_OAUTH_STATE_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_OAUTH_STATE_REPOSITORY",
);

export interface OAuthStateRepository {
  nextId(): string;
  save(state: OAuthState): Promise<void>;
  /** Atomically deletes and returns the row so a state value can never be replayed; returns null if unknown or already consumed. */
  consumeByState(state: string): Promise<OAuthState | null>;
}
