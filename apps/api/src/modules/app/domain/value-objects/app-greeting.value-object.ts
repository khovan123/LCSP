export class AppGreeting {
  private constructor(private readonly value: string) {}

  static create(value: string): AppGreeting {
    const normalized = value.trim();

    if (!normalized) {
      throw new Error("App greeting is required");
    }

    return new AppGreeting(normalized);
  }

  toString(): string {
    return this.value;
  }
}
