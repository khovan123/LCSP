import { randomUUID } from "node:crypto";

import {
  SubjectAttributes,
  type SubjectAttributesRecord,
} from "../value-objects/subject-attributes.value-object.ts";

export type MembershipStatus = AuthMembershipStatus;

type MembershipInput = {
  userId: string;
  organizationId: string;
  status: MembershipStatus;
  subjectAttributes?: SubjectAttributesRecord;
  policyId: string;
  policyVersion: string;
};

export class Membership {
  readonly id: string;
  readonly userId: string;
  readonly organizationId: string;
  status: MembershipStatus;
  private subjectAttributesValue: SubjectAttributes;
  readonly policyId: string;
  readonly policyVersion: string;

  constructor(input: MembershipInput) {
    this.id = randomUUID();
    this.userId = input.userId;
    this.organizationId = input.organizationId;
    this.status = input.status;
    this.subjectAttributesValue = SubjectAttributes.create(
      input.subjectAttributes,
    );
    this.policyId = input.policyId;
    this.policyVersion = input.policyVersion;
  }

  static rehydrate(input: MembershipInput & { id: string }): Membership {
    const entity = new Membership(input);
    Object.assign(entity, { id: input.id });
    return entity;
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
