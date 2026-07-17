import { jest } from "@jest/globals";
import type { QueryBus } from "@nestjs/cqrs";

import { PBAC_METADATA_KEY } from "../../../../platform/pbac/decorators/pbac-metadata.js";
import { ListAuditEventsQuery } from "../../application/queries/list-audit-events/list-audit-events.query.js";
import { AuditController } from "./audit.controller.js";

describe("AuditController", () => {
  it("requires the audit:read PBAC action", () => {
    const metadata = Reflect.getMetadata(
      PBAC_METADATA_KEY,
      // Reading decorator metadata requires the unbound prototype method.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      AuditController.prototype.listAuditEvents,
    ) as unknown;

    expect(metadata).toEqual({ type: "action", action: "audit:read" });
  });

  it("dispatches the organization-scoped list query", async () => {
    const execute =
      jest.fn<(query: unknown) => Promise<{ events: unknown[] }>>();
    execute.mockResolvedValue({ events: [] });
    const controller = new AuditController({ execute } as unknown as QueryBus);

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
});
