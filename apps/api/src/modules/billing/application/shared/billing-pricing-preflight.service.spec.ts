import { jest } from "@jest/globals";
import type { ConfigService } from "@nestjs/config";

import { BillingPricingPreflightService } from "./billing-pricing-preflight.service.js";

type FindFirstArgs = {
  where: {
    provider: string;
    model: string;
    effectiveAt: { lte: Date };
  };
};

function makeConfigService(values: Record<string, unknown>): ConfigService {
  return {
    get: (key: string, fallback?: unknown) => values[key] ?? fallback,
  } as unknown as ConfigService;
}

function makePrismaService(available: ReadonlySet<string>): {
  modelPricingSnapshot: {
    findFirst: (args: FindFirstArgs) => Promise<{ id: string } | null>;
  };
} {
  return {
    modelPricingSnapshot: {
      findFirst: jest.fn((args: FindFirstArgs) =>
        Promise.resolve(
          available.has(`${args.where.provider}:${args.where.model}`)
            ? { id: "pricing-1" }
            : null,
        ),
      ),
    },
  };
}

describe("BillingPricingPreflightService", () => {
  it("skips pricing checks when billing metering is disabled", async () => {
    const prisma = makePrismaService(new Set());
    const service = new BillingPricingPreflightService(
      makeConfigService({ "billing.meteringEnabled": false }),
      prisma as never,
    );

    await service.onModuleInit();

    expect(prisma.modelPricingSnapshot.findFirst).not.toHaveBeenCalled();
  });

  it("passes when primary LLM7 and Google fallback pricing snapshots exist", async () => {
    const prisma = makePrismaService(
      new Set(["LLM7:GLM-5.3-Flash", "GOOGLE_GENAI:gemini-3.5-flash-lite"]),
    );
    const service = new BillingPricingPreflightService(
      makeConfigService({
        "billing.meteringEnabled": true,
        "billing.authorizedRuntimeModels":
          "LLM7:GLM-5.3-Flash,GOOGLE_GENAI:gemini-3.5-flash-lite",
      }),
      prisma as never,
    );

    await service.onModuleInit();

    expect(prisma.modelPricingSnapshot.findFirst).toHaveBeenCalledTimes(2);
  });

  it("fails fast with the missing runtime model identity", async () => {
    const prisma = makePrismaService(
      new Set(["GOOGLE_GENAI:gemini-3.5-flash-lite"]),
    );
    const service = new BillingPricingPreflightService(
      makeConfigService({
        "billing.meteringEnabled": true,
        "billing.authorizedRuntimeModels":
          "LLM7:GLM-5.3-Flash,GOOGLE_GENAI:gemini-3.5-flash-lite",
      }),
      prisma as never,
    );

    await expect(service.onModuleInit()).rejects.toThrow("LLM7/GLM-5.3-Flash");
  });
});
