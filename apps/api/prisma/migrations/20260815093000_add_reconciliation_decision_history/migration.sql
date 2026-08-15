CREATE TABLE "ReconciliationDecision" (
  "id" TEXT NOT NULL,
  "conflictRecordId" TEXT NOT NULL,
  "aiUsageFlowId" TEXT NOT NULL,
  "assessmentId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "resolution" "ConflictRecordStatus" NOT NULL,
  "resolutionVersion" INTEGER NOT NULL,
  "actorId" TEXT NOT NULL,
  "rationale" TEXT,
  "evidenceRefs" JSONB NOT NULL,
  "technicalEvidenceReportId" TEXT,
  "technicalEvidenceReportVersion" TEXT,
  "technicalEvidenceReportHash" JSONB,
  "technicalProfileId" TEXT,
  "technicalProfileVersion" TEXT,
  "originalConflictStatus" "ConflictRecordStatus" NOT NULL,
  "resolvedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ReconciliationDecision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReconciliationDecision_conflictRecordId_resolutionVersion_key"
  ON "ReconciliationDecision"("conflictRecordId", "resolutionVersion");

CREATE INDEX "ReconciliationDecision_assessmentId_resolutionVersion_idx"
  ON "ReconciliationDecision"("assessmentId", "resolutionVersion");

CREATE INDEX "ReconciliationDecision_aiUsageFlowId_idx"
  ON "ReconciliationDecision"("aiUsageFlowId");
