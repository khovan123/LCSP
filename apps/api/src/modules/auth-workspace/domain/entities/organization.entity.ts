export class Organization {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly mfaRequired: boolean;

  constructor(input: {
    id: string;
    slug: string;
    name: string;
    mfaRequired?: boolean;
  }) {
    this.id = input.id;
    this.slug = input.slug;
    this.name = input.name;
    this.mfaRequired = input.mfaRequired ?? false;
  }
}
