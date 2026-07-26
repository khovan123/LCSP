import { GetActiveLegalCorpusHandler } from "./get-active-legal-corpus.handler.js";

describe("GetActiveLegalCorpusHandler", () => {
  it("returns a default approved corpus payload when no corpus record exists", async () => {
    const prisma = {
      legalRuleCatalogVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };

    const handler = new GetActiveLegalCorpusHandler(prisma as any);
    const result = await handler.execute({} as any);

    expect(result.status).toBe("APPROVED");
    expect(result.versionId).toBe("LCSP-LEGAL-CORPUS-v0.1.0");
  });
});
