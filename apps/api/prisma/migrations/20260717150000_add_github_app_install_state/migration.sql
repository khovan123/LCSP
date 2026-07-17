-- CreateTable
CREATE TABLE "GitHubAppInstallState" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "assessmentId" TEXT,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GitHubAppInstallState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GitHubAppInstallState_state_key" ON "GitHubAppInstallState"("state");

-- CreateIndex
CREATE INDEX "GitHubAppInstallState_organizationId_idx" ON "GitHubAppInstallState"("organizationId");
