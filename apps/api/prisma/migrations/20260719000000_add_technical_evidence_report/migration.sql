CREATE TABLE "TechnicalEvidenceReport" (
    "id" TEXT NOT NULL,
    "scanJobId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "toolsVersion" JSONB NOT NULL,
    "configHash" JSONB NOT NULL,
    "evidencePayload" JSONB NOT NULL,
    "privacyFlags" JSONB NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalEvidenceReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TechnicalEvidenceReport_scanJobId_key" ON "TechnicalEvidenceReport"("scanJobId");
CREATE INDEX "TechnicalEvidenceReport_assessmentId_idx" ON "TechnicalEvidenceReport"("assessmentId");
CREATE INDEX "TechnicalEvidenceReport_scanJobId_idx" ON "TechnicalEvidenceReport"("scanJobId");
