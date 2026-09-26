import { Injectable, type OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { PrismaService } from "../../../../infrastructure/prisma/prisma.service.js";

type RuntimeModelIdentity = {
  provider: string;
  model: string;
};

@Injectable()
export class BillingPricingPreflightService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.configService.get<boolean>("billing.meteringEnabled", false)) {
      return;
    }
    const configured = this.configService.get<string>(
      "billing.authorizedRuntimeModels",
      "",
    );
    const identities = parseAuthorizedRuntimeModels(configured);
    if (identities.length === 0) {
      throw new Error(
        "Billing pricing preflight requires authorized runtime models",
      );
    }

    const checkedAt = new Date();
    const missing: RuntimeModelIdentity[] = [];
    for (const identity of identities) {
      const found = await this.prisma.modelPricingSnapshot.findFirst({
        where: {
          provider: identity.provider,
          model: identity.model,
          effectiveAt: { lte: checkedAt },
        },
        orderBy: { effectiveAt: "desc" },
        select: { id: true },
      });
      if (!found) missing.push(identity);
    }

    if (missing.length > 0) {
      throw new Error(
        `Billing pricing snapshot missing for authorized runtime model(s): ${missing
          .map((identity) => `${identity.provider}/${identity.model}`)
          .join(", ")}`,
      );
    }
  }
}

function parseAuthorizedRuntimeModels(value: string): RuntimeModelIdentity[] {
  const seen = new Set<string>();
  return value
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map((entry) => {
      const [provider, ...modelParts] = entry.split(":");
      const identity = {
        provider: provider.trim().toUpperCase(),
        model: modelParts.join(":").trim(),
      };
      if (!identity.provider || !identity.model) {
        throw new Error(
          "Billing pricing preflight requires PROVIDER:model entries",
        );
      }
      return identity;
    })
    .filter((identity) => {
      const key = `${identity.provider}:${identity.model}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
