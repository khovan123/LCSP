CREATE TABLE "ReadinessExport" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL,
    "contentJson" JSONB,
    "blockedReason" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReadinessExport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReadinessExport_assessmentId_idx" ON "ReadinessExport"("assessmentId");
CREATE INDEX "ReadinessExport_organizationId_idx" ON "ReadinessExport"("organizationId");
CREATE INDEX "ReadinessExport_assessmentId_version_idx" ON "ReadinessExport"("assessmentId", "version");
