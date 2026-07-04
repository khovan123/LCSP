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
}
