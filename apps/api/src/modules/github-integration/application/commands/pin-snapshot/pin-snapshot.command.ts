import type { SubjectRole } from "@lcsp/contracts/pbac";

export class PinSnapshotCommand {
  constructor(
    public readonly assessmentId: string,
    public readonly organizationId: string,
    public readonly actorId: string,
    public readonly subjectRole: SubjectRole,
    public readonly scope: string | undefined,
    public readonly connectionId: string,
    public readonly branch: string | undefined,
    public readonly ref: string | undefined,
    public readonly commitSha: string | undefined,
    public readonly correlationId: string,
  ) {}
}
