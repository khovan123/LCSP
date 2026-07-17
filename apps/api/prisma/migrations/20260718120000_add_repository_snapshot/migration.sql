CREATE TABLE "RepositorySnapshot" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "repositoryFullName" TEXT NOT NULL,
    "branch" TEXT,
    "ref" TEXT,
    "commitSha" TEXT NOT NULL,
    "providerMetadata" JSONB NOT NULL,
    "actorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ready',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositorySnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RepositorySnapshot_assessmentId_idx" ON "RepositorySnapshot"("assessmentId");
CREATE INDEX "RepositorySnapshot_connectionId_idx" ON "RepositorySnapshot"("connectionId");
CREATE INDEX "RepositorySnapshot_commitSha_idx" ON "RepositorySnapshot"("commitSha");
