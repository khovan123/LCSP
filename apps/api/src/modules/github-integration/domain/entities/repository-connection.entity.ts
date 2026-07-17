import { randomUUID } from "node:crypto";

type RepositoryConnectionProps = {
  id: string;
  assessmentId: string | null;
  organizationId: string;
  userId: string;
  installationId: string;
  repositoryId: string;
  repositoryName: string;
  repositoryFullName: string;
  defaultBranch: string;
  permissions: Record<string, string>;
  status: "active" | "revoked";
  connectedAt: Date;
  revokedAt: Date | null;
};

export class RepositoryConnection {
  private constructor(private readonly props: RepositoryConnectionProps) {}

  static create(input: {
    assessmentId: string | null;
    organizationId: string;
    userId: string;
    installationId: string;
    repositoryId: string;
    repositoryName: string;
    repositoryFullName: string;
    defaultBranch: string;
    permissions: Record<string, string>;
  }): RepositoryConnection {
    return new RepositoryConnection({
      id: randomUUID(),
      assessmentId: input.assessmentId,
      organizationId: input.organizationId,
      userId: input.userId,
      installationId: input.installationId,
      repositoryId: input.repositoryId,
      repositoryName: input.repositoryName,
      repositoryFullName: input.repositoryFullName,
      defaultBranch: input.defaultBranch,
      permissions: input.permissions,
      status: "active",
      connectedAt: new Date(),
      revokedAt: null,
    });
  }

  static rehydrate(props: RepositoryConnectionProps): RepositoryConnection {
    return new RepositoryConnection(props);
  }

  get id(): string {
    return this.props.id;
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

  get installationId(): string {
    return this.props.installationId;
  }

  get repositoryId(): string {
    return this.props.repositoryId;
  }

  get repositoryName(): string {
    return this.props.repositoryName;
  }

  get repositoryFullName(): string {
    return this.props.repositoryFullName;
  }

  get defaultBranch(): string {
    return this.props.defaultBranch;
  }

  get permissions(): Record<string, string> {
    return this.props.permissions;
  }

  get status(): "active" | "revoked" {
    return this.props.status;
  }

  get connectedAt(): Date {
    return this.props.connectedAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }
}
