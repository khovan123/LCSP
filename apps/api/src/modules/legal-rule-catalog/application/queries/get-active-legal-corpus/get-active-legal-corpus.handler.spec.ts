import { describe, expect, it, jest } from "@jest/globals";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetActiveLegalCorpusHandler } from "./get-active-legal-corpus.handler.js";

describe("GetActiveLegalCorpusHandler", () => {
  it("returns a default approved corpus payload when no corpus record exists", async () => {
    const prisma = {
      legalRuleCatalogVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as unknown as PrismaService;

    const handler = new GetActiveLegalCorpusHandler(prisma);
    const result = await handler.execute();

    expect(result.status).toBe("APPROVED");
    expect(result.versionId).toBe("LCSP-LEGAL-CORPUS-v0.1.0");
  });
});
