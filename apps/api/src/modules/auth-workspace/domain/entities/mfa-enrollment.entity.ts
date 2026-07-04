export class MfaEnrollment {
  readonly userId: string;
  readonly encryptedSecret: string;
  readonly enrolledAt: number;

  constructor(input: {
    userId: string;
    encryptedSecret: string;
    enrolledAt: number;
  }) {
    this.userId = input.userId;
    this.encryptedSecret = input.encryptedSecret;
    this.enrolledAt = input.enrolledAt;
  }
}
