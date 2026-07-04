import { UserEmail } from "../value-objects/user-email.value-object.js";
import { UserId } from "../value-objects/user-id.value-object.js";

type UserProps = {
  id: UserId;
  email: UserEmail;
  displayName: string;
  createdAt: Date;
};

export class User {
  private constructor(private readonly props: UserProps) {}

  static register(input: { email: string; displayName: string }): User {
    const displayName = input.displayName.trim();

    if (!displayName) {
      throw new Error("Display name is required");
    }

    return new User({
      id: UserId.generate(),
      email: UserEmail.create(input.email),
      displayName,
      createdAt: new Date(),
    });
  }

  static rehydrate(props: UserProps): User {
    return new User(props);
  }

  get id(): UserId {
    return this.props.id;
  }

  get email(): UserEmail {
    return this.props.email;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
