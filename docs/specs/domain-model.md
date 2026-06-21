# LCSP Domain Model

## Purpose

This document is the domain-level source of truth for LCSP business entities, object lifecycles, relationships and service ownership. Physical Prisma schema remains owned by `docs/implementation/persistence-implementation.md`.

## Domain Object Flow

```text
Organization
-> User
-> Assessment
-> WizardProfile
-> RepositoryConnection
-> RepositorySnapshot
-> ScanJob
-> SourceFile
-> TechnicalFinding
-> TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Conflict
-> VerifiedProfile
-> LegalRuleMatch
-> ClassificationResult
-> GapAnalysis
-> GeneratedDocument
-> AuditEvent
```

## Entity Catalog

### Organization

| Aspect | Value |
|---|---|
| Purpose | Tenant boundary for users, assessments and repository connections. |
| Owner Service | Organization / Backend API |
| Lifecycle | Created, active, archived by operating policy. |
| State Machine | No active domain state beyond lifecycle policy. |
| Relationships | Has Users through membership; owns Assessments, RepositoryConnections and AuditEvents. |
| Business Rules | BR-014, BR-015 |

| Field | Type | Required | Description |
|---|---|---:|---|
| organizationId | UUIDv7 | Yes | Organization identity. |
| name | string | Yes | Organization display name. |
| createdAt | datetime | Yes | Creation timestamp. |
| updatedAt | datetime | Yes | Last update timestamp. |

### User

| Aspect | Value |
|---|---|
| Purpose | Human account that can act as Manager or Developer. |
| Owner Service | Identity & Access / Backend API |
| Lifecycle | Created, authenticated, active, disabled by policy. |
| State Machine | Auth/session state is separate from assessment state. |
| Relationships | Belongs to OrganizationMembership; may own Assessments; may create AuditEvents. |
| Business Rules | BR-001..BR-013, BR-086..BR-088, BR-094 |

| Field | Type | Required | Description |
|---|---|---:|---|
| userId | UUIDv7 | Yes | User identity. |
| email | string | Yes | Unique login/contact identity. |
| displayName | string | No | Human-readable name. |
| createdAt | datetime | Yes | Creation timestamp. |
| updatedAt | datetime | Yes | Last update timestamp. |

### Assessment

| Aspect | Value |
|---|---|
| Purpose | Central work unit for evaluating one AI system or AI-enabled business process. |
| Owner Service | Assessment / Backend API |
| Lifecycle | Created by Manager and progresses through evidence, reconciliation, classification and reporting states. |
| State Machine | `CREATED -> WIZARD_PROFILE_READY -> REPOSITORY_CONNECTED -> SNAPSHOT_CREATED -> SCAN_REQUESTED -> SCAN_RUNNING -> SCAN_COMPLETED -> TECHNICAL_PROFILE_READY -> AI_USAGE_FLOW_READY -> RECONCILIATION_REQUIRED or VERIFIED_PROFILE_READY -> LEGAL_MATCHING_READY -> CLASSIFICATION_READY or CLASSIFICATION_BLOCKED -> DOCUMENT_GENERATED or DOCUMENT_BLOCKED`. |
| Relationships | Owns WizardProfiles, RepositoryConnections, Snapshots, ScanJobs, profiles, conflicts, legal matches, classifications, documents and audit events. |
| Business Rules | BR-018, BR-023..BR-025, BR-089, BR-093 |

| Field | Type | Required | Description |
|---|---|---:|---|
| assessmentId | UUIDv7 | Yes | Assessment identity. |
| organizationId | UUIDv7 | Yes | Tenant boundary. |
| ownerManagerId | UUIDv7 | Yes | Manager owner. |
| title | string | Yes | Assessment label. |
| state | AssessmentState | Yes | Current lifecycle state. |
| createdAt | datetime | Yes | Creation timestamp. |
| updatedAt | datetime | Yes | Last state/content update. |

### RepositoryConnection

| Aspect | Value |
|---|---|
| Purpose | Records selected GitHub repository authorization for an assessment. |
| Owner Service | Repository Integration / Backend API |
| Lifecycle | Created after GitHub App authorization; used to create snapshots; revocable by policy. |
| State Machine | Connected or unavailable by external authorization state. |
| Relationships | Belongs to Organization and Assessment; creates RepositorySnapshots. |
| Business Rules | BR-032, BR-077, BR-088 |

| Field | Type | Required | Description |
|---|---|---:|---|
| repositoryConnectionId | UUIDv7 | Yes | Connection identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| provider | string | Yes | Repository provider, currently GitHub. |
| installationId | string | Yes | GitHub App installation reference. |
| repositoryOwner | string | Yes | Repository owner/org. |
| repositoryName | string | Yes | Repository name. |
| repositoryId | string | Yes | Provider repository identity. |
| selectedBranch | string | No | Default branch selected for scan. |

### ScanJob

| Aspect | Value |
|---|---|
| Purpose | Tracks request and execution status for repository scan. |
| Owner Service | Scan API + Scanner Worker |
| Lifecycle | REQUESTED, RUNNING, COMPLETED, FAILED, CANCELED. |
| State Machine | `REQUESTED -> RUNNING -> COMPLETED` or `FAILED/CANCELED`. |
| Relationships | Belongs to Assessment and RepositorySnapshot; produces TechnicalEvidenceReport and graph metadata. |
| Business Rules | BR-077 |

| Field | Type | Required | Description |
|---|---|---:|---|
| scanJobId | UUIDv7 | Yes | Scan job identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| repositorySnapshotId | UUIDv7 | Yes | Commit-pinned snapshot. |
| status | ScanJobStatus | Yes | Job status. |
| idempotencyKey | string | Yes | Duplicate scan prevention. |
| scannerVersion | string | Yes | Scanner version. |
| rulesetVersion | string | Yes | Detection ruleset version. |
| requestedBy | UUIDv7 | Yes | Actor who requested scan. |
| failureCode | string | No | Failure code if failed. |
| failureMessage | string | No | Redacted failure reason. |

### RepositorySnapshot

| Aspect | Value |
|---|---|
| Purpose | Commit-pinned repository state used as evidence source. |
| Owner Service | Repository Integration / Scanner Worker |
| Lifecycle | Created once per selected repository/commit; immutable for traceability. |
| State Machine | Snapshot created; downstream scan may run or fail. |
| Relationships | Belongs to RepositoryConnection and Assessment; owns SourceFiles and ScanJobs. |
| Business Rules | BR-032, BR-077 |

| Field | Type | Required | Description |
|---|---|---:|---|
| repositorySnapshotId | UUIDv7 | Yes | Snapshot identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| repositoryConnectionId | UUIDv7 | Yes | Source connection. |
| branch | string | Yes | Branch name. |
| commitSha | string | Yes | Pinned commit. |
| fileCount | number | Yes | Source inventory count. |
| totalBytes | number | Yes | Total bytes inventoried. |
| metadata | JSON | Yes | Redacted snapshot metadata. |

### SourceFile

| Aspect | Value |
|---|---|
| Purpose | Metadata record for a file in a repository snapshot. |
| Owner Service | Scanner Worker |
| Lifecycle | Created during repository inventory; immutable for the snapshot. |
| State Machine | Classified as supported, syntax-only, basic-signal-only, ignored or unsupported. |
| Relationships | Belongs to RepositorySnapshot; may have EvidenceReferences. |
| Business Rules | BR-057..BR-061 |

| Field | Type | Required | Description |
|---|---|---:|---|
| sourceFileId | UUIDv7 | Yes | Source file metadata identity. |
| repositorySnapshotId | UUIDv7 | Yes | Snapshot scope. |
| relativePath | string | Yes | Repository-relative path, not source body. |
| extension | string | Yes | File extension. |
| language | string | Yes | Detected language. |
| supportLevel | AnalysisSupportLevel | Yes | Analysis support level. |
| sizeBytes | number | Yes | File size. |
| contentHash | string | Yes | Hash for integrity/ref only. |
| ignored | boolean | Yes | Whether scanner skipped file. |
| coverageLimitations | JSON | No | Skip/coverage reasons. |

### TechnicalFinding

| Aspect | Value |
|---|---|
| Purpose | Atomic technical evidence item produced by static analysis. |
| Owner Service | Scanner Worker |
| Lifecycle | Created with TechnicalEvidenceReport; immutable. |
| State Machine | No independent state. |
| Relationships | Belongs to TechnicalEvidenceReport and EvidenceReference. |
| Business Rules | BR-035, BR-080 |

| Field | Type | Required | Description |
|---|---|---:|---|
| findingId | UUIDv7 | Yes | Finding identity. |
| reportId | UUIDv7 | Yes | Evidence report owner. |
| evidenceRefId | UUIDv7 | Yes | Evidence reference. |
| findingType | FindingType | Yes | Signal category. |
| confidence | number | Yes | 0.0 to 1.0 confidence. |
| severity | string | Yes | Redacted severity/category label. |
| metadata | JSON | Yes | No raw source, secrets, full prompts or full AST. |

### TechnicalEvidenceReport

| Aspect | Value |
|---|---|
| Purpose | Versioned scan report containing evidence metadata and findings. |
| Owner Service | Scanner Worker |
| Lifecycle | DRAFT, SCHEMA_VALID, QUALITY_VALID, QUALITY_INSUFFICIENT, FAILED. |
| State Machine | Created after scan; gates determine validity and downstream eligibility. |
| Relationships | Belongs to Assessment and ScanJob; owns TechnicalFindings; feeds TechnicalProfile. |
| Business Rules | BR-036..BR-040, BR-056, BR-069 |

| Field | Type | Required | Description |
|---|---|---:|---|
| technicalEvidenceReportId | UUIDv7 | Yes | Report identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| scanJobId | UUIDv7 | Yes | Scan job source. |
| status | EvidenceReportStatus | Yes | Report lifecycle state. |
| qualityStatus | EvidenceQualityStatus | Yes | Evidence gate result. |
| reportHash | string | Yes | Integrity hash. |
| scannerVersion | string | Yes | Scanner version. |
| rulesetVersion | string | Yes | Ruleset version. |
| schemaVersion | string | Yes | Report schema version. |
| coverageSummary | JSON | Yes | Coverage and limitation summary. |
| privacyFlags | JSON | Yes | Source/privacy controls. |

### TechnicalProfile

| Aspect | Value |
|---|---|
| Purpose | Normalized technical summary derived from accepted technical evidence. |
| Owner Service | Technical Profile Worker |
| Lifecycle | Created after evidence gates pass; immutable snapshot per evidence report. |
| State Machine | Ready when evidence is accepted and profile dimensions are generated. |
| Relationships | Belongs to Assessment and TechnicalEvidenceReport; feeds AIUsageFlow and VerifiedProfile. |
| Business Rules | BR-039, BR-080, BR-081 |

| Field | Type | Required | Description |
|---|---|---:|---|
| technicalProfileId | UUIDv7 | Yes | Profile identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| technicalEvidenceReportId | UUIDv7 | Yes | Evidence source. |
| source | enum/string | Yes | `GITHUB_REPOSITORY_SCAN`. |
| aiDetected | enum/string | Yes | none, possible or confirmed. |
| providers | JSON | Yes | Detected providers. |
| frameworks | JSON | Yes | Detected frameworks. |
| modelInvocationCount | number | Yes | Evidence-backed invocation count. |
| inputCategories | JSON | Yes | Input signal categories. |
| outputCategories | JSON | Yes | Output signal categories. |
| decisionFlowSignals | JSON | Yes | Decision-flow evidence. |
| humanReviewSignals | JSON | Yes | Human review evidence. |
| confidence | number | Yes | Profile confidence. |
| evidenceRefs | JSON | Yes | Evidence references. |

### WizardProfile

| Aspect | Value |
|---|---|
| Purpose | Manager-declared business/legal context for the assessment. |
| Owner Service | Wizard / Backend API |
| Lifecycle | Drafted, submitted, versioned on changes. |
| State Machine | Wizard submission moves assessment to readiness/evidence-required state. |
| Relationships | Belongs to Assessment; reconciled with TechnicalProfile and AIUsageFlow. |
| Business Rules | BR-026..BR-031 |

| Field | Type | Required | Description |
|---|---|---:|---|
| wizardProfileId | UUIDv7 | Yes | Wizard profile identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| version | number | Yes | Version number. |
| answers | JSON | Yes | Structured Manager answers. |
| submittedBy | UUIDv7 | Yes | Manager actor. |
| createdAt | datetime | Yes | Submission timestamp. |

### Conflict

| Aspect | Value |
|---|---|
| Purpose | Records mismatch between WizardProfile, TechnicalProfile and AIUsageFlow. |
| Owner Service | Reconciliation Worker + Backend API |
| Lifecycle | CONFLICT_OPEN, RESOLVED, VERIFIED. |
| State Machine | Open conflict blocks classification; Manager resolution can close it. |
| Relationships | Belongs to Assessment and AIUsageFlow; may be resolved by Manager. |
| Business Rules | BR-041..BR-048, BR-083, BR-093 |

| Field | Type | Required | Description |
|---|---|---:|---|
| conflictId | UUIDv7 | Yes | Conflict identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| aiUsageFlowId | UUIDv7 | Yes | Related usage flow. |
| conflictType | string | Yes | Field/type of disagreement. |
| status | ReconciliationStatus | Yes | Conflict status. |
| evidenceRefs | JSON | Yes | Evidence references. |
| managerResolution | JSON | No | Manager decision, stored separately from scanner evidence. |
| resolvedBy | UUIDv7 | No | Manager actor. |
| resolvedAt | datetime | No | Resolution time. |

### VerifiedProfile

| Aspect | Value |
|---|---|
| Purpose | Reconciled profile used as prerequisite for legal matching and classification. |
| Owner Service | Reconciliation Worker |
| Lifecycle | Created after no conflict or resolved conflict; versioned snapshot. |
| State Machine | `VERIFIED_PROFILE_READY` enables legal matching. |
| Relationships | Combines WizardProfile, TechnicalProfile, AIUsageFlow and Manager resolutions; feeds LegalRuleMatch and ClassificationResult. |
| Business Rules | BR-045, BR-078 |

| Field | Type | Required | Description |
|---|---|---:|---|
| verifiedProfileId | UUIDv7 | Yes | Verified profile identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| technicalProfileId | UUIDv7 | Yes | Technical profile source. |
| aiUsageFlowId | UUIDv7 | Yes | Usage-flow source. |
| profileVersion | number | Yes | Version. |
| mergedProfile | JSON | Yes | Reconciled facts. |
| evidenceRefs | JSON | Yes | Evidence references. |
| createdAt | datetime | Yes | Creation timestamp. |

### LegalRuleMatch

| Aspect | Value |
|---|---|
| Purpose | Citation-backed match between VerifiedProfile facts and legal corpus rules. |
| Owner Service | Legal Matching Worker |
| Lifecycle | Created after VerifiedProfile; status reflects match and citation coverage. |
| State Machine | Completed legal matching triggers classification command. |
| Relationships | Belongs to Assessment, VerifiedProfile and LegalCorpusVersion; feeds ClassificationResult. |
| Business Rules | BR-050, BR-051, BR-084 |

| Field | Type | Required | Description |
|---|---|---:|---|
| legalRuleMatchId | UUIDv7 | Yes | Rule match identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| verifiedProfileId | UUIDv7 | Yes | Verified profile source. |
| legalCorpusVersionId | UUIDv7 | Yes | Corpus version. |
| ruleId | string | Yes | Legal rule identifier. |
| citationRefs | JSON | Yes | Citation references. |
| matchRationale | JSON | Yes | Structured rationale. |
| status | string | Yes | Match/citation status. |

### ClassificationResult

| Aspect | Value |
|---|---|
| Purpose | Risk classification result or blocked state. |
| Owner Service | Classification Worker |
| Lifecycle | REQUESTED, RUNNING, COMPLETED, BLOCKED, FAILED. |
| State Machine | Can complete only after VerifiedProfile and LegalRuleMatch. |
| Relationships | Belongs to Assessment and VerifiedProfile; may reference LegalRuleMatch; feeds GapAnalysis and GeneratedDocument. |
| Business Rules | BR-049..BR-051, BR-082, BR-084 |

| Field | Type | Required | Description |
|---|---|---:|---|
| classificationResultId | UUIDv7 | Yes | Classification identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| verifiedProfileId | UUIDv7 | Yes | Verified basis. |
| legalRuleMatchId | UUIDv7 | No | Citation-backed legal match. |
| status | ClassificationStatus | Yes | Classification state. |
| riskLevel | string | No | Risk level when classification completes. |
| blockingReasons | JSON | Yes | Reasons for blocked/degraded output. |
| citationCoverage | string | Yes | COMPLETE, PARTIAL or MISSING. |
| confidence | number | No | Classification confidence. |

### GapAnalysis

| Aspect | Value |
|---|---|
| Purpose | Identifies compliance gaps based on classification and legal basis. |
| Owner Service | Gap Analysis Worker |
| Lifecycle | Created after valid or explicitly degraded classification. |
| State Machine | No independent active state in current physical schema; it is a domain result before document generation. |
| Relationships | Derived from ClassificationResult and LegalRuleMatch; feeds GeneratedDocument. |
| Business Rules | BR-062, BR-079 |

| Field | Type | Required | Description |
|---|---|---:|---|
| gapAnalysisId | UUIDv7 | Yes | Gap analysis identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| classificationResultId | UUIDv7 | Yes | Classification source. |
| gapItems | JSON | Yes | Gap list, obligation refs and priority. |
| evidenceRefs | JSON | Yes | Evidence and legal references. |
| createdAt | datetime | Yes | Creation timestamp. |

### GeneratedDocument

| Aspect | Value |
|---|---|
| Purpose | Generated report or readiness output artifact metadata. |
| Owner Service | Document Worker |
| Lifecycle | REQUESTED, GENERATED, BLOCKED, FAILED. |
| State Machine | Final document generated only when output guardrails pass. |
| Relationships | Belongs to Assessment and ClassificationResult; references storage artifact. |
| Business Rules | BR-063..BR-066, BR-079 |

| Field | Type | Required | Description |
|---|---|---:|---|
| generatedDocumentId | UUIDv7 | Yes | Document identity. |
| assessmentId | UUIDv7 | Yes | Assessment scope. |
| classificationResultId | UUIDv7 | Yes for final report | Classification basis. |
| status | DocumentStatus | Yes | Document lifecycle state. |
| templateVersion | string | Yes | Template version. |
| storageRef | string | No | Object storage reference when generated. |
| documentHash | string | No | Artifact hash. |
| blockingReasons | JSON | Yes | Reasons if blocked. |

### AuditEvent

| Aspect | Value |
|---|---|
| Purpose | Append-oriented record of material workflow, security, evidence and output actions. |
| Owner Service | Audit domain; written by all state-changing services. |
| Lifecycle | Created once; append-oriented and not silently overwritten. |
| State Machine | No state transitions. |
| Relationships | May belong to Organization, Assessment and actor User. |
| Business Rules | BR-067..BR-070, BR-094 |

| Field | Type | Required | Description |
|---|---|---:|---|
| auditEventId | UUIDv7 | Yes | Audit event identity. |
| organizationId | UUIDv7 | No | Organization scope. |
| assessmentId | UUIDv7 | No | Assessment scope. |
| actorUserId | UUIDv7 | No | User actor, if applicable. |
| eventType | AuditEventType | Yes | Canonical audit event type. |
| correlationId | UUIDv7 | Yes | Cross-service trace. |
| causationId | UUIDv7 | No | Causing event/action. |
| beforeState | JSON | No | Redacted prior state. |
| afterState | JSON | No | Redacted resulting state. |
| metadata | JSON | Yes | Redacted metadata. |
| createdAt | datetime | Yes | Event timestamp. |
