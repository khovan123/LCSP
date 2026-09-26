import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PolicyInput = {
  role: string;
  provider: string;
  model: string;
  policyVersion: string;
  effectiveAt: string;
};

const DEVELOPMENT_BILLING_ROLES = [
  "root",
  "triage",
  "planner",
  "interview",
  "investigator",
  "narrator",
] as const;
const DEVELOPMENT_POLICY_EFFECTIVE_AT = "2026-01-01T00:00:00.000Z";

function policyInputs(value: unknown): PolicyInput[] {
  if (!Array.isArray(value))
    throw new Error("Policy configuration must be an array");
  return value.map((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      !["role", "provider", "model", "policyVersion", "effectiveAt"].every(
        (key) => typeof (item as Record<string, unknown>)[key] === "string",
      )
    )
      throw new Error("Invalid runtime model policy configuration");
    const policy = item as PolicyInput;
    if (
      !policy.role.trim() ||
      !policy.provider.trim() ||
      !policy.model.trim() ||
      !policy.policyVersion.trim() ||
      Number.isNaN(new Date(policy.effectiveAt).getTime())
    )
      throw new Error("Invalid runtime model policy configuration");
    return {
      role: policy.role.trim(),
      provider: policy.provider.trim().toUpperCase(),
      model: policy.model.trim(),
      policyVersion: policy.policyVersion.trim(),
      effectiveAt: new Date(policy.effectiveAt).toISOString(),
    };
  });
}

function authorizedDevelopmentModels(): Array<{
  provider: string;
  model: string;
}> {
  const configured = process.env.BILLING_AUTHORIZED_RUNTIME_MODELS?.trim();
  if (!configured)
    throw new Error(
      "BILLING_AUTHORIZED_RUNTIME_MODELS is required for development runtime policies",
    );
  const seen = new Set<string>();
  return configured.split(",").map((entry) => {
    const separator = entry.indexOf(":");
    if (separator <= 0 || separator === entry.length - 1)
      throw new Error("Invalid BILLING_AUTHORIZED_RUNTIME_MODELS entry");
    const provider = entry.slice(0, separator).trim().toUpperCase();
    const model = entry.slice(separator + 1).trim();
    if (!provider || !model)
      throw new Error("Invalid BILLING_AUTHORIZED_RUNTIME_MODELS entry");
    const identity = `${provider}:${model}`;
    if (seen.has(identity))
      throw new Error(`Duplicate authorized runtime model: ${identity}`);
    seen.add(identity);
    return { provider, model };
  });
}

function developmentPolicyInputs(): PolicyInput[] {
  const models = authorizedDevelopmentModels();
  return DEVELOPMENT_BILLING_ROLES.flatMap((role) =>
    models.map(({ provider, model }) => ({
      role,
      provider,
      model,
      policyVersion: `dev-route-v1-${provider.toLowerCase()}-${model
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")}`,
      effectiveAt: DEVELOPMENT_POLICY_EFFECTIVE_AT,
    })),
  );
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  const configured = process.env.LCSP_RUNTIME_MODEL_POLICY_SNAPSHOTS;
  if (!connectionString) throw new Error("DATABASE_URL is required");
  const policies = configured
    ? policyInputs(JSON.parse(configured))
    : process.env.NODE_ENV === "development"
      ? developmentPolicyInputs()
      : (() => {
          throw new Error("LCSP_RUNTIME_MODEL_POLICY_SNAPSHOTS is required");
        })();
  const prisma = new PrismaClient({ adapter: new PrismaPg(connectionString) });
  try {
    for (const policy of policies) {
      const existing = await prisma.runtimeModelPolicySnapshot.findUnique({
        where: {
          role_policyVersion: {
            role: policy.role,
            policyVersion: policy.policyVersion,
          },
        },
      });
      if (existing) {
        if (
          existing.provider !== policy.provider ||
          existing.model !== policy.model ||
          existing.effectiveAt.getTime() !==
            new Date(policy.effectiveAt).getTime()
        )
          throw new Error(
            `Runtime policy ${policy.role}/${policy.policyVersion} is immutable`,
          );
        continue;
      }
      await prisma.runtimeModelPolicySnapshot.create({ data: policy });
    }
    console.log(
      `[bootstrap:runtime-model-policies] ensured ${policies.length} runtime policy snapshots`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
