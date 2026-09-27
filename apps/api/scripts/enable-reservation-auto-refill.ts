import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { BILLING_AUDIT_EVENT_TYPES } from "@lcsp/contracts/billing";
import {
  AUDIT_ACTOR_TYPES,
  AUDIT_DECISIONS,
  AUDIT_RESOURCE_TYPES,
} from "@lcsp/contracts/audit";
import { AuditWriterService } from "../src/platform/audit/audit-writer.service.ts";
import type { PrismaService } from "../src/infrastructure/prisma/prisma.service.ts";

const email = process.argv[2]?.trim().toLowerCase();
if (!email || !email.includes("@"))
  throw new Error("Provide the existing account email");
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
try {
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    select: { id: true },
  });
  const audit = new AuditWriterService(prisma as unknown as PrismaService);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const wallet = await tx.billingWallet.findUniqueOrThrow({
      where: { userId: user.id },
    });
    if (wallet.reservationAutoRefillEnabled) return;
    await tx.billingWallet.update({
      where: { id: wallet.id },
      data: { reservationAutoRefillEnabled: true },
    });
    await audit.writeInTx(
      {
        eventType: BILLING_AUDIT_EVENT_TYPES.reservationAutoRefillEnabled,
        actorId: null,
        actor: {
          id: "operator:reservation-auto-refill",
          type: AUDIT_ACTOR_TYPES.system,
        },
        resourceType: AUDIT_RESOURCE_TYPES.authAccount,
        resourceId: user.id,
        correlationId: `reservation-auto-refill:${wallet.id}`,
        decision: AUDIT_DECISIONS.allow,
        payload: { reservationAutoRefillEnabled: true, walletId: wallet.id },
      },
      tx,
    );
  });
  console.log(JSON.stringify({ email, reservationAutoRefillEnabled: true }));
} finally {
  await prisma.$disconnect();
}
