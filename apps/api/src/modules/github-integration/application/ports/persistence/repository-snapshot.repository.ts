import type { OutboxMessageInput } from "@lcsp/contracts/outbox";

import type { RepositorySnapshot } from "../../../domain/entities/repository-snapshot.entity.js";

export const REPOSITORY_SNAPSHOT_REPOSITORY = Symbol(
  "REPOSITORY_SNAPSHOT_REPOSITORY",
);

export interface RepositorySnapshotRepository {
  saveWithCreatedEvent(
    snapshot: RepositorySnapshot,
    event: OutboxMessageInput,
  ): Promise<void>;
}
