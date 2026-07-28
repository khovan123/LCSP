import { AUDIT_ERROR_CODES } from "@lcsp/contracts/audit";
import { PBAC_ACTIONS } from "@lcsp/contracts/pbac";
import { jest } from "@jest/globals";
import type { CommandBus, QueryBus } from "@nestjs/cqrs";
import type { Response } from "express";

import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { ExportAuditTrailCommand } from "../../application/commands/export-audit-trail/export-audit-trail.command.js";
import { GetAuditExportArtifactQuery } from "../../application/queries/get-audit-export-artifact/get-audit-export-artifact.query.js";
import { GetAuditExportQuery } from "../../application/queries/get-audit-export/get-audit-export.query.js";
import { ListAuditEventsQuery } from "../../application/queries/list-audit-events/list-audit-events.query.js";
import { AuditExportStorageService } from "../../infrastructure/storage/audit-export-storage.service.js";
import { AuditController } from "./audit.controller.js";

describe("AuditController", () => {
  it("requires the audit:read PBAC action", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // Reading decorator metadata requires the unbound prototype method.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AuditController.prototype.listAuditEvents,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.auditRead,
    });
  });

  it("dispatches the organization-scoped list query", async () => {
    const execute =
      jest.fn<(query: unknown) => Promise<{ events: unknown[] }>>();
    execute.mockResolvedValue({ events: [] });
    const controller = new AuditController(
      {} as CommandBus,
      { execute } as unknown as QueryBus,
      {} as AuditExportStorageService,
    );

    await controller.listAuditEvents(
      "org-1",
      "auth.sign_in",
      "user-1",
      "2026-07-01T00:00:00.000Z",
      "2026-07-31T23:59:59.999Z",
      "2",
      "10",
      {
        pbacContext: { organizationId: "org-1" },
        correlationId: "corr-1",
      } as never,
    );

    const dispatched = execute.mock.calls[0]?.[0];
    expect(dispatched).toBeInstanceOf(ListAuditEventsQuery);
    expect(dispatched).toMatchObject({
      organizationId: "org-1",
      sessionOrganizationId: "org-1",
      eventType: "auth.sign_in",
      actorId: "user-1",
      page: 2,
      pageSize: 10,
      correlationId: "corr-1",
    });
  });

  it("requires the audit:export PBAC action for export request", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AuditController.prototype.exportAuditTrail,
    ) as unknown;

    expect(metadata).toEqual({
      type: "action",
      action: PBAC_ACTIONS.auditExport,
    });
  });

  it("dispatches export command with organization scope", async () => {
    const execute = jest
      .fn<(command: unknown) => Promise<{ export_request_id: string }>>()
      .mockResolvedValue({ export_request_id: "export-1" });
    const controller = new AuditController(
      { execute } as unknown as CommandBus,
      {} as QueryBus,
      {} as AuditExportStorageService,
    );

    await controller.exportAuditTrail(
      "org-1",
      {
        from_date: "2026-07-01T00:00:00.000Z",
        to_date: "2026-07-31T23:59:59.999Z",
      },
      {
        pbacContext: { organizationId: "org-1", userId: "user-1" },
        correlationId: "corr-1",
      } as never,
    );

    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(ExportAuditTrailCommand);
    expect(execute.mock.calls[0]?.[0]).toMatchObject({
      organizationId: "org-1",
      sessionOrganizationId: "org-1",
      requestedById: "user-1",
      correlationId: "corr-1",
    });
  });

  it("dispatches status query for an export request", async () => {
    const execute = jest
      .fn<(query: unknown) => Promise<{ export_request_id: string }>>()
      .mockResolvedValue({ export_request_id: "export-1" });
    const controller = new AuditController(
      {} as CommandBus,
      { execute } as unknown as QueryBus,
      {} as AuditExportStorageService,
    );

    await controller.getAuditExport("org-1", "export-1", {
      pbacContext: { organizationId: "org-1" },
      correlationId: "corr-1",
    } as never);

    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(GetAuditExportQuery);
  });

  it("rejects download without signed token", async () => {
    const controller = new AuditController(
      {} as CommandBus,
      {} as QueryBus,
      new AuditExportStorageService(),
    );

    await expect(
      controller.downloadAuditExport(
        "org-1",
        "export-1",
        undefined,
        {} as Response,
      ),
    ).rejects.toMatchObject({
      response: {
        error_code: AUDIT_ERROR_CODES.downloadUrlInvalid,
      },
    });
  });

  it("streams a signed export artifact download", async () => {
    const execute = jest
      .fn<(query: unknown) => Promise<Record<string, unknown>>>()
      .mockResolvedValue({ export_request_id: "export-1", events: [] });
    const storage = new AuditExportStorageService();
    const token = storage
      .createSignedDownloadUrl({
        organizationId: "org-1",
        exportRequestId: "export-1",
        expiresAt: new Date(Date.now() + 60_000),
      })
      .split("token=")[1];
    const setHeader = jest.fn<Response["setHeader"]>();
    const send = jest.fn<Response["send"]>();
    const controller = new AuditController(
      {} as CommandBus,
      { execute } as unknown as QueryBus,
      storage,
    );

    await controller.downloadAuditExport("org-1", "export-1", token, {
      setHeader,
      send,
    } as never);

    expect(execute.mock.calls[0]?.[0]).toBeInstanceOf(
      GetAuditExportArtifactQuery,
    );
    expect(send).toHaveBeenCalledWith(
      JSON.stringify({ export_request_id: "export-1", events: [] }, null, 2),
    );
  });
});
