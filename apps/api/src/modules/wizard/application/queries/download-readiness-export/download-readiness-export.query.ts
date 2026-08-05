import { Query } from "@nestjs/cqrs";

import type {
  ReadinessExportFormat,
  ReadinessExportLocale,
} from "../../services/wizard/readiness-export-document.service.js";

export interface ReadinessExportDownload {
  document: Buffer;
  mediaType:
    | "application/pdf"
    | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  extension: ReadinessExportFormat;
  locale: ReadinessExportLocale;
  version: number;
}

export class DownloadReadinessExportQuery extends Query<ReadinessExportDownload> {
  constructor(
    public readonly assessmentId: string,
    public readonly exportId: string,
    public readonly organizationId: string,
    public readonly ownerId: string,
    public readonly correlationId: string,
    public readonly format: ReadinessExportFormat,
    public readonly locale: ReadinessExportLocale,
  ) {
    super();
  }
}
