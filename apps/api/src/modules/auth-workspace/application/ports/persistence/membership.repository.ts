import type { Membership } from "../../../domain/models/auth-workspace.models.ts";

export const AUTH_WORKSPACE_MEMBERSHIP_REPOSITORY = Symbol(
  "AUTH_WORKSPACE_MEMBERSHIP_REPOSITORY",
);

export interface MembershipRepository {
  nextId(): string;
  save(membership: Membership): Promise<void>;
  findByUserAndOrganization(
    userId: string,
    organizationId: string,
  ): Promise<Membership | null>;
  /** Used where the caller has no organization context of its own (e.g. OAuth callback) to resolve the single workspace an account belongs to. */
  findActiveByUserId(userId: string): Promise<Membership[]>;
}
