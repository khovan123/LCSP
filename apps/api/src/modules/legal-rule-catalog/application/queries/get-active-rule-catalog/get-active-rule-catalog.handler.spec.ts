import { describe, expect, it, jest } from "@jest/globals";
import { PrismaService } from "../../../../../infrastructure/prisma/prisma.service.js";
import { GetActiveRuleCatalogHandler } from "./get-active-rule-catalog.handler.js";

describe("GetActiveRuleCatalogHandler", () => {
  it("returns the latest approved rule catalog and approved rules", async () => {
    const prisma = {
      legalRuleCatalogVersion: {
        findFirst: jest.fn().mockResolvedValue({
          id: "catalog-1",
          version: "v1",
          status: "APPROVED",
        }),
      },
      legalRule: {
        findMany: jest.fn().mockResolvedValue([
          {
            legalRuleId: "RULE-A",
            requiredFacts: [
              { field: "businessProcess", expectedValue: "AUTOMATED_DECISION" },
            ],
            optionalFacts: [],
            blockingFacts: [],
            unknownFactPolicy: "BLOCK_ON_UNKNOWN",
            citationLocatorRefs: [{ documentId: "doc-1", locator: "art-1" }],
            ruleFamily: "ai-use",
          },
        ]),
      },
    } as unknown as PrismaService;

    const handler = new GetActiveRuleCatalogHandler(prisma);
    const result = await handler.execute();

    expect(result.versionId).toBe("catalog-1");
    expect(result.rules[0]?.legalRuleId).toBe("RULE-A");
  });
});
