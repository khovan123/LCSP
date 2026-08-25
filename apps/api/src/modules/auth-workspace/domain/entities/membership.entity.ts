import { randomUUID } from "node:crypto";

export type MembershipStatus = AuthMembershipStatus;

type MembershipInput = {
  userId: string;
  organizationId: string;
  status: MembershipStatus;
  revokedAt?: number | null;
};

export class Membership {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  status: MembershipStatus;
  revokedAt: number | null;

  constructor(input: MembershipInput) {
    this.id = randomUUID();
    this.userId = input.userId;
    this.organizationId = input.organizationId;
    this.status = input.status;
    this.revokedAt = input.revokedAt ?? null;
  }

  static rehydrate(input: MembershipInput & { id: string }): Membership {
    const entity = new Membership(input);
    Object.assign(entity, { id: input.id });
    return entity;
  }

  isActive(): boolean {
    return this.status === AUTH_MEMBERSHIP_STATUSES.active;
  }

  belongsToOrganization(organizationId: string): boolean {
    return this.organizationId === organizationId;
  }
}
import {
  AUTH_MEMBERSHIP_STATUSES,
  type AuthMembershipStatus,
} from "@lcsp/contracts/auth";
