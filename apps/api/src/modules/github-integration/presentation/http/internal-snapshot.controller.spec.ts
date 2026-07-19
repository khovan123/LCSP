import { describe, expect, it, jest } from "@jest/globals";
import type { QueryBus } from "@nestjs/cqrs";

import { InternalSnapshotController } from "./internal-snapshot.controller.js";

describe("InternalSnapshotController", () => {
  it("dispatches the snapshot archive query and streams the response", async () => {
    const pipe = jest.fn();
    const result = {
      snapshotId: "snapshot-1",
      commitSha: "a".repeat(40),
      repositoryFullName: "acme/example-repo",
      contentType: "application/gzip",
      resolvedUrl: "https://codeload.github.com/acme/example-repo/tar.gz/a",
      stream: { pipe: jest.fn() },
    };
    const execute = jest.fn().mockResolvedValue(result);
    const controller = new InternalSnapshotController({
      execute,
    } as unknown as QueryBus);
    const setHeader = jest.fn();
    const response = {
      status: jest.fn().mockReturnValue(undefined),
      setHeader,
    } as never;

    await controller.streamArchive(
      "snapshot-1",
      "scan-job-1",
      "scan-job-1",
      { headers: { "x-correlation-id": "corr-1" } } as never,
      response,
    );

    expect(execute).toHaveBeenCalledTimes(1);
    expect(result.stream.pipe).toHaveBeenCalledTimes(1);
    expect(setHeader).toHaveBeenCalledWith("x-snapshot-id", "snapshot-1");
  });
});
