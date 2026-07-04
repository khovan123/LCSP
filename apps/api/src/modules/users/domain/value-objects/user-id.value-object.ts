export class UserId {
  private constructor(private readonly value: string) {}

  static create(value: string): UserId {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error("User id is required");
    }

    return new UserId(normalized);
  }

  static generate(): UserId {
    const suffix = Math.random().toString(36).slice(2, 10);

    return new UserId(`user-${suffix}`);
  }

  toString(): string {
    return this.value;
  }
}
