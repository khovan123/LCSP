import { describe, expect, it, jest } from "@jest/globals";
import type { CommandBus } from "@nestjs/cqrs";

import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";

import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { PinSnapshotCommand } from "../../application/commands/pin-snapshot/pin-snapshot.command.js";
import { GitHubIntegrationController } from "./github-integration.controller.js";

describe("GitHubIntegrationController.pinSnapshot", () => {
  it("requires the snapshot:create PBAC action", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      GitHubIntegrationController.prototype.pinSnapshot,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.snapshotCreate,
    });
  });

  it("dispatches an assessment and actor scoped PinSnapshotCommand", async () => {
    const execute = jest
      .fn<(command: unknown) => Promise<{ snapshot_id: string }>>()
      .mockResolvedValue({ snapshot_id: "snapshot-1" });
    const controller = new GitHubIntegrationController({
      execute,
    } as unknown as CommandBus);

    await controller.pinSnapshot(
      "assessment-1",
      {
        connection_id: "connection-1",
        branch: "main",
      },
      {
        correlationId: "corr-1",
        pbacContext: {
          organizationId: "org-1",
          userId: "manager-1",
          subjectRole: "Manager",
          scope: null,
        },
      } as never,
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute.mock.calls[0][0]).toBeInstanceOf(PinSnapshotCommand);
    expect(execute.mock.calls[0][0]).toMatchObject({
      assessmentId: "assessment-1",
      organizationId: "org-1",
      actorId: "manager-1",
      connectionId: "connection-1",
      branch: "main",
      correlationId: "corr-1",
    });
  });
});
