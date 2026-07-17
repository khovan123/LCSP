export class PinSnapshotRequest {
  connection_id!: string;
  branch?: string;
  ref?: string;
  commit_sha?: string;
}
