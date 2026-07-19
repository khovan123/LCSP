import { describe, expect, it, jest } from "@jest/globals";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import { PBAC_ACTIONS, SUBJECT_ROLES } from "@lcsp/contracts/pbac";
import { SCAN_CALLBACK_STATUSES } from "@lcsp/contracts/scan";

import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { GetScanJobQuery } from "../../application/queries/get-scan-job/get-scan-job.query.js";
import { ProcessScanCallbackCommand } from "../../application/commands/process-scan-callback/process-scan-callback.command.js";
import { InternalScanController, ScanController } from "./scan.controller.js";

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
        selectedAction: PBAC_ACTIONS.scanRead,
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

describe("InternalScanController", () => {
  it("dispatches the worker callback command", async () => {
    const execute = jest.fn<(command: unknown) => Promise<unknown>>();
    execute.mockResolvedValue({ accepted: true });
    const controller = new InternalScanController({
      execute,
    } as unknown as CommandBus);
    const payload = {
      scan_job_id: "scan-job-1",
      tools_version: { semgrep: "1.0.0" },
      config_hash: { semgrep: "sha256:abc" },
      evidence_payload: { findings: [] },
      privacy_flags: {
        containsSourceCode: false,
        secretsRedacted: true,
      },
      schema_version: "1.0.0",
      status: SCAN_CALLBACK_STATUSES.success,
    };

    await controller.processCallback("scan-job-1", payload, "corr-1");

    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(
      ProcessScanCallbackCommand,
    );
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      scanJobId: "scan-job-1",
      payload,
      correlationId: "corr-1",
    });
  });
});
