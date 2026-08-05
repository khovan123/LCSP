import { Query } from "@nestjs/cqrs";

export interface ReadinessExportDownload {
  pdf: Buffer;
  version: number;
}

export class DownloadReadinessExportQuery extends Query<ReadinessExportDownload> {
  constructor(
    public readonly assessmentId: string,
    public readonly exportId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly correlationId: string,
  ) {
    super();
  }
}
