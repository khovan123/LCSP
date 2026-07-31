import "dotenv/config";
import { randomUUID } from "node:crypto";

import { AUTH_MEMBERSHIP_STATUSES } from "@lcsp/contracts/auth";
import {
  PBAC_ACTIONS,
  PBAC_STATE_GATES,
  SUBJECT_ROLES,
} from "@lcsp/contracts/pbac";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  toPrismaAuthMembershipStatus,
  toPrismaAuthStateGate,
} from "../src/infrastructure/prisma/prisma-enum-mappers.ts";
import { hashSecret } from "../src/modules/auth-workspace/infrastructure/security/security.utils.ts";

const ORGANIZATION = {
  id: "org-lcsp",
  slug: "lcsp",
  name: "LCSP",
};
const POLICY = {
  id: "policy-lcsp-manager",
  version: "2026-07-29",
};
const ADMIN_EMAILS = [
  "minhpnq1807@gmail.com",
  "anhkn7@gmail.com",
  "lebaonhi0805@gmail.com",
  "anhtunguyen643@gmail.com"
] as const;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required");
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg(connectionString),
  });

  try {
    const organization = await prisma.authOrganization.upsert({
      where: { slug: ORGANIZATION.slug },
      create: ORGANIZATION,
      update: { name: ORGANIZATION.name },
    });
    await prisma.authPolicy.upsert({
      where: { id_version: POLICY },
      create: {
        ...POLICY,
        organizationId: organization.id,
        subjectRole: SUBJECT_ROLES.manager,
        stateGate: toPrismaAuthStateGate(PBAC_STATE_GATES.membershipActive),
        actions: Object.values(PBAC_ACTIONS),
      },
      update: {
        organizationId: organization.id,
        subjectRole: SUBJECT_ROLES.manager,
        stateGate: toPrismaAuthStateGate(PBAC_STATE_GATES.membershipActive),
        actions: Object.values(PBAC_ACTIONS),
      },
    });

    const adminPassword = process.env.ADMIN_SEED_PASSWORD ?? "Admin@123";

    for (const email of ADMIN_EMAILS) {
      const user = await prisma.authUser.upsert({
        where: { email },
        create: {
          id: randomUUID(),
          email,
          passwordHash: hashSecret(adminPassword),
          emailVerified: true,
          failedLoginCount: 0,
        },
        update: {
          emailVerified: true,
          passwordHash: hashSecret(adminPassword),
          failedLoginCount: 0,
        },
      });
      await prisma.authMembership.upsert({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organization.id,
          },
        },
        create: {
          id: randomUUID(),
          userId: user.id,
          organizationId: organization.id,
          status: toPrismaAuthMembershipStatus(AUTH_MEMBERSHIP_STATUSES.active),
          subjectAttributes: { role: SUBJECT_ROLES.manager },
          policyId: POLICY.id,
          policyVersion: POLICY.version,
        },
        update: {
          status: toPrismaAuthMembershipStatus(AUTH_MEMBERSHIP_STATUSES.active),
          subjectAttributes: { role: SUBJECT_ROLES.manager },
          policyId: POLICY.id,
          policyVersion: POLICY.version,
        },
      });
    }

    console.log(
      JSON.stringify({ organization: organization.slug, admins: ADMIN_EMAILS }),
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main();
