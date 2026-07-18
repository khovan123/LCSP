import { randomUUID } from "node:crypto";

import {
  REPOSITORY_SCAN_JOB_STATUSES,
  type RepositoryScanJobStatus,
  type RepositoryScanTriggerSource,
} from "@lcsp/contracts/github-integration";

export type RepositoryScanJobProps = {
  id: string;
  assessmentId: string;
  snapshotId: string;
  organizationId: string;
  idempotencyKey: string;
  triggerSource: RepositoryScanTriggerSource;
  status: RepositoryScanJobStatus;
  attemptCount: number;
  correlationId: string;
  blockedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class RepositoryScanJob {
  private constructor(private readonly props: RepositoryScanJobProps) {}

  static create(
    input: Omit<
      RepositoryScanJobProps,
      | "id"
      | "status"
      | "attemptCount"
      | "blockedReason"
      | "createdAt"
      | "updatedAt"
    >,
  ): RepositoryScanJob {
    const now = new Date();
    return new RepositoryScanJob({
      ...input,
      id: randomUUID(),
      status: REPOSITORY_SCAN_JOB_STATUSES.queued,
      attemptCount: 0,
      blockedReason: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  static rehydrate(props: RepositoryScanJobProps): RepositoryScanJob {
    return new RepositoryScanJob(props);
  }

  get id(): string {
    return this.props.id;
  }
  get assessmentId(): string {
    return this.props.assessmentId;
  }
  get snapshotId(): string {
    return this.props.snapshotId;
  }
  get organizationId(): string {
    return this.props.organizationId;
  }
  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }
  get triggerSource(): RepositoryScanTriggerSource {
    return this.props.triggerSource;
  }
  get status(): RepositoryScanJobStatus {
    return this.props.status;
  }
  get attemptCount(): number {
    return this.props.attemptCount;
  }
  get correlationId(): string {
    return this.props.correlationId;
  }
  get blockedReason(): string | null {
    return this.props.blockedReason;
  }
  get createdAt(): Date {
    return this.props.createdAt;
  }
  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
