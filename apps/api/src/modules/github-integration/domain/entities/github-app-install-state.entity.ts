import { randomBytes, randomUUID } from "node:crypto";

type GitHubAppInstallStateProps = {
  id: string;
  state: string;
  assessmentId: string | null;
  organizationId: string;
  userId: string;
  redirectUri: string;
  expiresAt: Date;
  createdAt: Date;
};

export class GitHubAppInstallState {
  private constructor(private readonly props: GitHubAppInstallStateProps) {}

  static create(input: {
    organizationId: string;
    userId: string;
    redirectUri: string;
    assessmentId?: string | null;
    ttlMs: number;
  }): GitHubAppInstallState {
    const now = new Date();

    return new GitHubAppInstallState({
      id: randomUUID(),
      state: randomBytes(32).toString("hex"),
      assessmentId: input.assessmentId ?? null,
      organizationId: input.organizationId,
      userId: input.userId,
      redirectUri: input.redirectUri,
      expiresAt: new Date(now.getTime() + input.ttlMs),
      createdAt: now,
    });
  }

  static rehydrate(props: GitHubAppInstallStateProps): GitHubAppInstallState {
    return new GitHubAppInstallState(props);
  }

  get id(): string {
    return this.props.id;
  }

  get state(): string {
    return this.props.state;
  }

  get assessmentId(): string | null {
    return this.props.assessmentId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get redirectUri(): string {
    return this.props.redirectUri;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
