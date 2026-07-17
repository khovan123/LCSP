import type { Invitation } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_INVITATION_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_INVITATION_REPOSITORY",
);

export interface InvitationRepository {
  nextId(): string;
  save(invitation: Invitation): Promise<void>;
  findById(id: string): Promise<Invitation | null>;
  /** Atomically consumes an approved invitation. Returns false if it was already consumed or raced. */
  tryConsume(id: string): Promise<boolean>;
}
