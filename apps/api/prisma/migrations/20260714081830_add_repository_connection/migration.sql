-- AlterTable
ALTER TABLE "AuthInvitation" ALTER COLUMN "expiresAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "RepositoryConnection" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "installationId" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "selectedBranch" TEXT,
    "status" TEXT NOT NULL DEFAULT 'connected',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryConnection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryConnection_assessmentId_idx" ON "RepositoryConnection"("assessmentId");
