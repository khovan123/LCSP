import { describe, expect, it, jest } from "@jest/globals";
import { NotFoundException } from "@nestjs/common";
import { ProcessDocumentCallbackHandler } from "./process-document-callback.handler.js";
import { ProcessDocumentCallbackCommand } from "./process-document-callback.command.js";

function buildHandler(options?: {
  request?: {
    id: string;
    assessmentId: string;
    organizationId: string;
    correlationId?: string;
  } | null;
}) {
  const request =
    options?.request === undefined
      ? {
          id: "dr-1",
          assessmentId: "asmt-1",
          organizationId: "org-1",
          correlationId: "corr-1",
        }
      : options.request;

  const findUnique = jest.fn(() => request);
  const update = jest.fn().mockResolvedValue({} as never);
  const createAuthAudit = jest.fn().mockResolvedValue({} as never);

  const prisma = {
    documentRequest: { findUnique, update },
    authAuditEvent: { create: createAuthAudit },
  } as unknown as any;

  const auditWriter = {} as any;

  const handler = new ProcessDocumentCallbackHandler(prisma, auditWriter);

  return { handler, prisma, findUnique, update, createAuthAudit };
}

describe("ProcessDocumentCallbackHandler", () => {
  it("throws NotFoundException when document request missing", async () => {
    const { handler } = buildHandler({ request: null });
    const command = new ProcessDocumentCallbackCommand(
      { document_request_id: "missing", status: "READY" },
      "corr-1",
    );

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
  });

  it("updates document request and writes audit when callback arrives", async () => {
    const { handler, prisma, findUnique, update, createAuthAudit } =
      buildHandler();
    const command = new ProcessDocumentCallbackCommand(
      {
        document_request_id: "dr-1",
        status: "READY",
        document_url: "https://obj/store/1",
      },
      "corr-1",
    );

    const result = await handler.execute(command);

    expect(findUnique).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(createAuthAudit).toHaveBeenCalledTimes(1);
    expect(result.processed).toBe(true);
    expect(result.document_request_id).toBe("dr-1");
  });
});
