import { randomUUID } from "node:crypto";

import {
  AUTH_INVITATION_STATES,
  AUTH_MEMBERSHIP_STATUSES,
  type AuthInvitationState,
} from "@lcsp/contracts/auth";

import type { MembershipStatus } from "./membership.entity.ts";
import { EmailAddress } from "../value-objects/email-address.value-object.ts";
import {
  SubjectAttributes,
  type SubjectAttributesRecord,
} from "../value-objects/subject-attributes.value-object.ts";

export type InvitationState = AuthInvitationState;

type InvitationInput = {
  email: string;
  organizationId: string;
  state: InvitationState;
  emailVerified: boolean;
  membershipStatus: MembershipStatus;
  subjectAttributes?: SubjectAttributesRecord;
  policyId: string;
  policyVersion: string;
  expiresAt: number;
};

export class Invitation {
  readonly id: string;
  readonly email: EmailAddress;
  readonly organizationId: string;
  state: InvitationState;
  readonly emailVerified: boolean;
  readonly membershipStatus: MembershipStatus;
  private subjectAttributesValue: SubjectAttributes;
  readonly policyId: string;
  readonly policyVersion: string;
  readonly expiresAt: number;

  constructor(input: InvitationInput) {
    this.id = randomUUID();
    this.email = EmailAddress.create(input.email);
    this.organizationId = input.organizationId;
    this.state = input.state;
    this.emailVerified = input.emailVerified;
    this.membershipStatus = input.membershipStatus;
    this.subjectAttributesValue = SubjectAttributes.create(
      input.subjectAttributes,
    );
    this.policyId = input.policyId;
    this.policyVersion = input.policyVersion;
    this.expiresAt = input.expiresAt;
  }

  static rehydrate(input: InvitationInput & { id: string }): Invitation {
    const entity = new Invitation(input);
    Object.assign(entity, { id: input.id });
    return entity;
  }

  get subjectAttributes(): SubjectAttributesRecord {
    return this.subjectAttributesValue.toRecord();
  }

  isApproved(): boolean {
    return this.state === AUTH_INVITATION_STATES.approved;
  }

  isConsumable(): boolean {
    return (
      this.isApproved() &&
      this.emailVerified &&
      this.membershipStatus === AUTH_MEMBERSHIP_STATUSES.active
    );
  }

  consume(): void {
    this.state = AUTH_INVITATION_STATES.consumed;
  }
}
