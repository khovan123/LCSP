import type { RepositoryScanTriggerSource } from "@lcsp/contracts/github-integration";
import type { SubjectRole } from "@lcsp/contracts/pbac";

export class TriggerScanCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly snapshotId: string,
    public readonly triggerSource: RepositoryScanTriggerSource,
    public readonly idempotencyKey: string,
    public readonly actorId: string | null,
    public readonly organizationId: string | null,
    public readonly subjectRole: SubjectRole | null,
    public readonly scope: string | undefined,
    public readonly correlationId: string,
  ) {}
}
