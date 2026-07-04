import type { MembershipStatus } from "./membership.entity.ts";
import { EmailAddress } from "../value-objects/email-address.value-object.ts";
import {
  SubjectAttributes,
  type SubjectAttributesRecord,
} from "../value-objects/subject-attributes.value-object.ts";

export type InvitationState = "approved" | "pending" | "consumed";

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

  constructor(input: {
    id: string;
    email: string;
    organizationId: string;
    state: InvitationState;
    emailVerified: boolean;
    membershipStatus: MembershipStatus;
    subjectAttributes?: SubjectAttributesRecord;
    policyId: string;
    policyVersion: string;
  }) {
    this.id = input.id;
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
  }

  get subjectAttributes(): SubjectAttributesRecord {
    return this.subjectAttributesValue.toRecord();
  }

  isApproved(): boolean {
    return this.state === "approved";
  }

  isConsumable(): boolean {
    return (
      this.isApproved() &&
      this.emailVerified &&
      this.membershipStatus === "active"
    );
  }

  consume(): void {
    this.state = "consumed";
  }
}
