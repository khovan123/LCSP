CREATE TABLE "ClassificationResult" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "technicalEvidenceReportId" TEXT NOT NULL,
    "guardrailStatus" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassificationResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassificationResult_technicalEvidenceReportId_key" ON "ClassificationResult"("technicalEvidenceReportId");
CREATE INDEX "ClassificationResult_assessmentId_organizationId_createdAt_idx" ON "ClassificationResult"("assessmentId", "organizationId", "createdAt");

CREATE TABLE "DocumentRequest" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "classificationResultId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "correlationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentRequest_assessmentId_organizationId_documentType_status_crea_idx" ON "DocumentRequest"("assessmentId", "organizationId", "documentType", "status", "createdAt");
CREATE INDEX "DocumentRequest_organizationId_createdAt_idx" ON "DocumentRequest"("organizationId", "createdAt");
