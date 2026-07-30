import { randomUUID } from "node:crypto";

type OrganizationInput = {
  slug: string;
  name: string;
  mfaRequired?: boolean;
};

export class Organization {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly mfaRequired: boolean;

  constructor(input: OrganizationInput) {
    this.id = randomUUID();
    this.slug = input.slug;
    this.name = input.name;
    this.mfaRequired = input.mfaRequired ?? false;
  }

  static rehydrate(input: OrganizationInput & { id: string }): Organization {
    const entity = new Organization(input);
    Object.assign(entity, { id: input.id });
    return entity;
  }
}
