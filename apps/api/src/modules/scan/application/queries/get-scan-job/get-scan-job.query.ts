import { Query } from "@nestjs/cqrs";
import type { SubjectRole } from "@lcsp/contracts/pbac";

import type { ScanJobStatusDto } from "../../contracts/scan/scan-job-status.contract.js";

export class GetScanJobQuery extends Query<ScanJobStatusDto> {
  constructor(
    public readonly assessmentId: string,
    public readonly scanJobId: string,
    public readonly organizationId: string,
    public readonly subjectRole: SubjectRole,
    public readonly scope: string | null,
    public readonly correlationId: string,
  ) {
    super();
  }
}
