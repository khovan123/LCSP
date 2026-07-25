-- MW-rec-004: persist immutable VerifiedProfile artifacts after reconciliation gates pass.
CREATE TABLE "VerifiedProfile" (
    "id" TEXT NOT NULL,
    "aiUsageFlowId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "profileData" JSONB NOT NULL,
    "gatesPassedAt" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending_approval',
    "approvedAt" TIMESTAMP(3),
    "approvedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "VerifiedProfile_aiUsageFlowId_key"
    ON "VerifiedProfile"("aiUsageFlowId");

CREATE INDEX "VerifiedProfile_assessmentId_idx"
    ON "VerifiedProfile"("assessmentId");
