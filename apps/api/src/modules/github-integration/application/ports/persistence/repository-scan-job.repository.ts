import type { OutboxMessageInput } from "@lcsp/contracts/outbox";

import type { RepositoryScanJob } from "../../../domain/entities/repository-scan-job.entity.js";

export const REPOSITORY_SCAN_JOB_REPOSITORY = Symbol(
  "REPOSITORY_SCAN_JOB_REPOSITORY",
);

export interface RepositoryScanJobRepository {
  findByIdempotencyKey(key: string): Promise<RepositoryScanJob | null>;
  saveWithTriggeredEvent(
    job: RepositoryScanJob,
    event: OutboxMessageInput,
  ): Promise<void>;
}
