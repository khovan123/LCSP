-- DropIndex
DROP INDEX "RepositoryConnection_assessmentId_idx";

-- AlterTable
ALTER TABLE "RepositoryConnection"
  ALTER COLUMN "assessmentId" DROP NOT NULL,
  ADD COLUMN "organizationId" TEXT NOT NULL,
  ADD COLUMN "userId" TEXT NOT NULL,
  ADD COLUMN "repositoryFullName" TEXT NOT NULL,
  ADD COLUMN "defaultBranch" TEXT NOT NULL,
  ADD COLUMN "permissions" JSONB NOT NULL,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  DROP COLUMN "repositoryOwner",
  DROP COLUMN "selectedBranch",
  DROP COLUMN "updatedAt",
  ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "RepositoryConnection" RENAME COLUMN "createdAt" TO "connectedAt";

-- CreateIndex
CREATE UNIQUE INDEX "RepositoryConnection_installationId_repositoryId_key" ON "RepositoryConnection"("installationId", "repositoryId");

-- CreateIndex
CREATE INDEX "RepositoryConnection_organizationId_idx" ON "RepositoryConnection"("organizationId");

-- CreateIndex
CREATE INDEX "RepositoryConnection_assessmentId_idx" ON "RepositoryConnection"("assessmentId");
