import { jest } from "@jest/globals";

import { PrismaBillingTransaction } from "./prisma-billing-transaction.js";
import type { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";

describe("PrismaBillingTransaction runtime policy repository", () => {
  it("returns null when no runtime policy snapshot is applicable", async () => {
    const tx = {
      $executeRaw: jest.fn(() => Promise.resolve(1)),
      runtimeModelPolicySnapshot: {
        findMany: jest.fn(() => Promise.resolve([])),
      },
    };
    const prisma = {
      $transaction: jest.fn(
        async <T>(operation: (transaction: typeof tx) => Promise<T>) =>
          operation(tx),
      ),
    };
    const transaction = new PrismaBillingTransaction(
      prisma as unknown as PrismaService,
    );

    const selected = await transaction.runForUser("user-1", (repositories) =>
      repositories.runtimePolicy.findApplicable(
        "investigator",
        "GOOGLE_GENAI",
        "gemini-3.5-flash-lite",
        new Date("2026-09-24T16:39:22.918Z"),
      ),
    );

    expect(selected).toBeNull();
    expect(tx.runtimeModelPolicySnapshot.findMany).toHaveBeenCalledWith({
      where: {
        role: "investigator",
        provider: "GOOGLE_GENAI",
        model: "gemini-3.5-flash-lite",
        effectiveAt: { lte: new Date("2026-09-24T16:39:22.918Z") },
      },
      orderBy: { effectiveAt: "desc" },
    });
  });
});
