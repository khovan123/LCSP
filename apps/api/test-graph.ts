import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Try to create a dummy assessment first since it's required for nodes
  const org = await prisma.authOrganization.create({
    data: {
      id: "org-123",
      name: "Test Org",
      domain: "test.com",
    }
  });

  const user = await prisma.authUser.create({
    data: {
      id: "user-123",
      email: "test@test.com",
      name: "Test User",
    }
  });

  const assessment = await prisma.assessment.create({
    data: {
      id: "ass-123",
      organizationId: org.id,
      ownerId: user.id,
      name: "Test Assessment",
      description: "Testing Graph Schema",
    }
  });

  const node1 = await prisma.evidenceGraphNode.create({
    data: {
      assessmentId: assessment.id,
      source: "DECLARED",
      type: "SERVICE",
      canonicalName: "PaymentService",
      properties: { version: "1.0" },
    }
  });

  const node2 = await prisma.evidenceGraphNode.create({
    data: {
      assessmentId: assessment.id,
      source: "DECLARED",
      type: "DATABASE",
      canonicalName: "PaymentDB",
      properties: { engine: "postgres" },
    }
  });

  const edge = await prisma.evidenceGraphEdge.create({
    data: {
      assessmentId: assessment.id,
      sourceId: node1.id,
      targetId: node2.id,
      sourceType: "DECLARED",
      type: "WRITES",
      confidence: 1.0,
      properties: { query: "INSERT INTO payments" },
    }
  });

  console.log("Successfully created nodes and edge:");
  console.log("Node1:", node1);
  console.log("Node2:", node2);
  console.log("Edge:", edge);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.evidenceGraphEdge.deleteMany();
    await prisma.evidenceGraphNode.deleteMany();
    await prisma.assessment.deleteMany({ where: { id: "ass-123" } });
    await prisma.authUser.deleteMany({ where: { id: "user-123" } });
    await prisma.authOrganization.deleteMany({ where: { id: "org-123" } });
    await prisma.$disconnect();
  });
