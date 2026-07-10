-- CreateTable
CREATE TABLE "WizardProfile" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "answers" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WizardProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WizardProfile_assessmentId_key" ON "WizardProfile"("assessmentId");

-- CreateIndex
CREATE INDEX "WizardProfile_assessmentId_idx" ON "WizardProfile"("assessmentId");

-- CreateIndex
CREATE INDEX "WizardProfile_organizationId_idx" ON "WizardProfile"("organizationId");
