import type { Invitation } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_INVITATION_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_INVITATION_REPOSITORY",
);

export interface InvitationRepository {
  nextId(): string;
  save(invitation: Invitation): Promise<void>;
  findById(id: string): Promise<Invitation | null>;
  /** Atomically flips state "approved" -> "consumed". Returns false if it was not in "approved" state (already consumed/raced). */
  tryConsume(id: string): Promise<boolean>;
}
