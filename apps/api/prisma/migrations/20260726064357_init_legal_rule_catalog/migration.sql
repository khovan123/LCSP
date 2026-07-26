-- CreateTable
CREATE TABLE "TechnicalProfile" (
    "id" TEXT NOT NULL,
    "evidenceReportId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "profileData" JSONB NOT NULL,
    "privacyFlags" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIUsageFlow" (
    "id" TEXT NOT NULL,
    "technicalProfileId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "providerVersion" TEXT NOT NULL,
    "claims" JSONB NOT NULL,
    "unknownUsages" JSONB NOT NULL,
    "privacyFlags" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'accepted',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIUsageFlow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictRecord" (
    "id" TEXT NOT NULL,
    "aiUsageFlowId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "conflictScore" DOUBLE PRECISION NOT NULL,
    "scoreExplanation" TEXT NOT NULL,
    "evidenceRefs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRuleCatalogVersion" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "ruleRefs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),

    CONSTRAINT "LegalRuleCatalogVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalRule" (
    "id" TEXT NOT NULL,
    "legalRuleId" TEXT NOT NULL,
    "legalRuleCatalogVersionId" TEXT NOT NULL,
    "ruleFamily" TEXT NOT NULL,
    "requiredFacts" JSONB NOT NULL,
    "optionalFacts" JSONB,
    "blockingFacts" JSONB,
    "unknownFactPolicy" TEXT NOT NULL,
    "citationLocatorRefs" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "authoredBy" TEXT NOT NULL,

    CONSTRAINT "LegalRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleApprovalRecord" (
    "id" TEXT NOT NULL,
    "legalRuleCatalogVersionId" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "scopeDescription" TEXT NOT NULL,
    "comments" TEXT,
    "approvalDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleApprovalRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TechnicalProfile_evidenceReportId_key" ON "TechnicalProfile"("evidenceReportId");

-- CreateIndex
CREATE INDEX "TechnicalProfile_assessmentId_idx" ON "TechnicalProfile"("assessmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AIUsageFlow_technicalProfileId_key" ON "AIUsageFlow"("technicalProfileId");

-- CreateIndex
CREATE INDEX "AIUsageFlow_assessmentId_idx" ON "AIUsageFlow"("assessmentId");

-- CreateIndex
CREATE INDEX "ConflictRecord_assessmentId_status_idx" ON "ConflictRecord"("assessmentId", "status");

-- CreateIndex
CREATE INDEX "LegalRuleCatalogVersion_status_idx" ON "LegalRuleCatalogVersion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LegalRule_legalRuleId_key" ON "LegalRule"("legalRuleId");

-- CreateIndex
CREATE INDEX "LegalRule_legalRuleCatalogVersionId_idx" ON "LegalRule"("legalRuleCatalogVersionId");

-- CreateIndex
CREATE INDEX "RuleApprovalRecord_legalRuleCatalogVersionId_idx" ON "RuleApprovalRecord"("legalRuleCatalogVersionId");

-- RenameIndex
ALTER INDEX "DocumentRequest_assessmentId_organizationId_documentType_status" RENAME TO "DocumentRequest_assessmentId_organizationId_documentType_st_idx";
