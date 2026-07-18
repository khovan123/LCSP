CREATE TABLE "RepositoryScanJob" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "triggerSource" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "correlationId" TEXT NOT NULL,
    "blockedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryScanJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RepositoryScanJob_idempotencyKey_key" ON "RepositoryScanJob"("idempotencyKey");
CREATE INDEX "RepositoryScanJob_assessmentId_idx" ON "RepositoryScanJob"("assessmentId");
CREATE INDEX "RepositoryScanJob_snapshotId_idx" ON "RepositoryScanJob"("snapshotId");
