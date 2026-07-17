import { randomUUID } from "node:crypto";

import {
  REPOSITORY_SNAPSHOT_STATUSES,
  type RepositorySnapshotStatus,
} from "@lcsp/contracts/github-integration";

export type RepositorySnapshotProviderMetadata = {
  authorDate: string | null;
  committerDate: string | null;
  htmlUrl: string;
  requestedRevision: string;
};

type RepositorySnapshotProps = {
  id: string;
  assessmentId: string;
  organizationId: string;
  connectionId: string;
  repositoryId: string;
  repositoryFullName: string;
  branch: string | null;
  ref: string | null;
  commitSha: string;
  providerMetadata: RepositorySnapshotProviderMetadata;
  actorId: string;
  status: RepositorySnapshotStatus;
  createdAt: Date;
};

export class RepositorySnapshot {
  private constructor(private readonly props: RepositorySnapshotProps) {}

  static create(
    input: Omit<RepositorySnapshotProps, "id" | "status" | "createdAt">,
  ): RepositorySnapshot {
    return new RepositorySnapshot({
      ...input,
      id: randomUUID(),
      status: REPOSITORY_SNAPSHOT_STATUSES.ready,
      createdAt: new Date(),
    });
  }

  get id(): string {
    return this.props.id;
  }
  get assessmentId(): string {
    return this.props.assessmentId;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get connectionId(): string {
    return this.props.connectionId;
  }
  get repositoryId(): string {
    return this.props.repositoryId;
  }
  get repositoryFullName(): string {
    return this.props.repositoryFullName;
  }
  get branch(): string | null {
    return this.props.branch;
  }
  get ref(): string | null {
    return this.props.ref;
  }
  get commitSha(): string {
    return this.props.commitSha;
  }
  get providerMetadata(): RepositorySnapshotProviderMetadata {
    return { ...this.props.providerMetadata };
  }
  get actorId(): string {
    return this.props.actorId;
  }
  get status(): RepositorySnapshotStatus {
    return this.props.status;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
}
