export class UserEmail {
  private constructor(private readonly value: string) {}

  static create(value: string): UserEmail {
    const normalized = value.trim().toLowerCase();

    if (!normalized.includes("@")) {
      throw new Error("Valid email is required");
    }

    return new UserEmail(normalized);
  }

  toString(): string {
    return this.value;
  }
}
