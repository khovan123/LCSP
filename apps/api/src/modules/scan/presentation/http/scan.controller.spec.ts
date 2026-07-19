import { describe, expect, it, jest } from "@jest/globals";
import type { QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";

import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { GetScanJobQuery } from "../../application/queries/get-scan-job/get-scan-job.query.js";
import { ScanController } from "./scan.controller.js";

describe("ScanController", () => {
  it("requires the scan:read PBAC action", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ScanController.prototype.getScanJob,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.scanRead,
    });
  });

  it("dispatches GetScanJobQuery with organization and Developer scope", async () => {
    const execute = jest.fn<(query: unknown) => Promise<unknown>>();
    execute.mockResolvedValue({ scan_job_id: "scan-job-1" });
    const controller = new ScanController({ execute } as unknown as QueryBus);

    await controller.getScanJob("assessment-1", "scan-job-1", {
      correlationId: "corr-1",
      pbacContext: {
        userId: "developer-1",
        sessionId: "session-1",
        organizationId: "org-1",
        subjectRole: SUBJECT_ROLES.developer,
        scope: "assessment-1",
        grantedActions: [PBAC_ACTIONS.scanRead],
        policyId: "policy-developer",
        policyVersion: "v1",
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(GetScanJobQuery);
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      assessmentId: "assessment-1",
      scanJobId: "scan-job-1",
      organizationId: "org-1",
      subjectRole: SUBJECT_ROLES.developer,
      scope: "assessment-1",
      correlationId: "corr-1",
    });
  });
});
