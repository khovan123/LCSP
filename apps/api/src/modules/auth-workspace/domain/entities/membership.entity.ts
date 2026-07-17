import {
  SubjectAttributes,
  type SubjectAttributesRecord,
} from "../value-objects/subject-attributes.value-object.ts";

export type MembershipStatus = AuthMembershipStatus;

export class Membership {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  status: MembershipStatus;
  private subjectAttributesValue: SubjectAttributes;
  readonly policyId: string;
  readonly policyVersion: string;

  constructor(input: {
    id: string;
    userId: string;
    organizationId: string;
    status: MembershipStatus;
    subjectAttributes?: SubjectAttributesRecord;
    policyId: string;
    policyVersion: string;
  }) {
    this.id = input.id;
    this.userId = input.userId;
    this.organizationId = input.organizationId;
    this.status = input.status;
    this.subjectAttributesValue = SubjectAttributes.create(
      input.subjectAttributes,
    );
    this.policyId = input.policyId;
    this.policyVersion = input.policyVersion;
  }

  get subjectAttributes(): SubjectAttributesRecord {
    return this.subjectAttributesValue.toRecord();
  }

  set subjectAttributes(value: SubjectAttributesRecord) {
    this.subjectAttributesValue = SubjectAttributes.create(value);
  }

  hasRole(): boolean {
    return this.subjectAttributesValue.hasRole();
  }

  role(): string | undefined {
    return this.subjectAttributesValue.role;
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
