export class StreamSnapshotArchiveQuery {
  constructor(
    public readonly snapshotId: string,
    public readonly scanJobId: string,
    public readonly correlationId: string,
  ) {}
}
