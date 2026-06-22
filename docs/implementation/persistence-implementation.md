# Persistence Implementation

## Status

AUTHORITATIVE IMPLEMENTATION DOCUMENT

## Purpose

Single source for PostgreSQL, Prisma, migrations, object metadata, retention, configuration and persistence recovery.


---

## Data Persistence and Migration Plan

## Purpose

Define design-level persistence ownership, entity lifecycle, constraints, indexing, retention and migration sequencing. This document is the only authoritative physical Prisma schema source for the controlled MVP prototype.

## Scope

PostgreSQL is the authoritative store for LCSP domain state, workflow metadata, evidence metadata, graph metadata, results and audit metadata. Object Storage stores generated documents and allowed non-source artifacts.

## Active References

- `docs/specs/domain-model.md`
- `docs/specs/domain-state-machines.md`
- `docs/specs/event-catalog.md`
- `docs/implementation/backend-implementation.md`
- `docs/implementation/queue-implementation.md`

## Implementation Boundaries

- Do not persist raw source, full prompts, full AST bodies, secrets or raw provider tokens.
- Persist code graph metadata, evidence refs, hashes and paths only.
- Use versioned snapshots for profiles, classification and generated documents.
- Tenant/organization boundaries must be enforceable server-side.

## Entity Contract

| Entity | Ownership | Key Fields | Constraints | Versioning / Retention | Sensitive Fields |
| --- | --- | --- | --- | --- | --- |
| User | Auth/API | id, email, status | unique verified identity policy | retain per account policy | email |
| OAuthIdentity | Auth/API | provider, subject, user_id | provider+subject unique | unlink/audit lifecycle | provider email, token metadata ref |
| UserMfaMethod | Auth/API | user_id, method, status | one active TOTP policy | rotate/reset | encrypted secret metadata |
| Session | Auth/API | user_id, expires_at, revoked_at | active session policy | expire/revoke | session token hash |
| Organization | API | id, name, owner | membership constraints | active/archived | org metadata |
| Assessment | API | id, org_id, owner_manager_id, state | Manager owner required | versioned workflow state | business metadata |
| WizardProfile | API | assessment_id, version, answers | one active per assessment version | snapshot | declared business data |
| RepositoryConnection | API | installation_ref, repo_ref, selected repo | scoped to org/assessment | revocable | external repo metadata |
| RepositoryScanJob | API/Worker | job_id, assessment_id, commit_sha, status | idempotency key unique | retain job history | no raw source |
| RepositorySnapshot | Worker | repo_id, branch, commit_sha | pinned commit required | immutable metadata | repo path metadata |
| TechnicalEvidenceReport | Worker | report_id, scan_id, hash, version | schema version valid | immutable by report hash | metadata only |
| TechnicalFinding | Worker | finding_id, type, confidence | finding ids unique per report | immutable | redacted metadata |
| EvidenceReference | Worker | ref_id, file_path, symbol_ref, hash | no source body | immutable | path/symbol may be sensitive |
| CodeGraphNode | Worker | scan_id, node_type, symbol_ref | no full AST/source | retain graph metadata | file path/symbol |
| CodeGraphEdge | Worker | scan_id, edge_type, source, target | normalized ids | retain graph metadata | path refs |
| TechnicalProfile | Worker | profile_id, assessment_id, version | report prerequisite | snapshot | technical summary |
| AIUsageFlow | Worker | flow_id, assessment_id, confidence | TechnicalProfile prerequisite | snapshot | usage claims |
| AIUsageFlowClaim | Worker | claim_id, value, confidence, refs | evidence_refs required for legal use | snapshot | claim metadata |
| ConflictRecord | API/Worker | conflict_id, type, status | blocks classification while open | lifecycle | conflict summary |
| ConflictResolution | API | conflict_id, actor, resolution | Manager final resolver | immutable audit-linked | resolution text |
| VerifiedProfile | Worker/API | profile_id, source versions | no unresolved conflict | snapshot/versioned | merged profile |
| LegalDocumentVersion | Legal/RAG | document_id, version, source | approved version required | immutable version | legal metadata |
| LegalRule | Legal/RAG | rule_id, corpus version | citation refs required | versioned | none expected |
| LegalCitation | Legal/RAG | citation_id, rule_id, source refs | source version required | immutable | none expected |
| RiskClassification | Worker | result_id, risk, citations | VerifiedProfile and legal matching required | immutable result | risk rationale |
| GapAnalysis | Worker | gap_id, classification_id, status | completed classification required | immutable result | gap rationale |
| GeneratedDocument | Worker/API | document_id, template version, storage_ref, hash | gap analysis and output guardrails required | versioned | generated artifact |
| WorkflowRun | Worker/API | run_id, assessment_id, state | state machine constraints | retain workflow trace | state metadata |
| ModelRunMetadata | LLM Gateway | node, provider, model, prompt_version | no raw prompt/source | retain metadata | provider/model refs |
| AuditEvent | API/Worker | event_id, actor, action, correlation_id | append-oriented | retention/export policy | redacted context |
| PermissionGrant | API Post-MVP | grant_id, scope, permission_code | scoped/revocable | audit grant/revoke | grantee/grantor refs |

## Indexing Strategy

Prioritize indexes on organization/assessment scope, workflow state, job status, report hash, scan id, conflict status, VerifiedProfile version, classification run id, audit correlation id and repository commit SHA.

## Tenant Isolation

Every assessment-scoped entity must be queryable through organization/assessment boundaries. API authorization must verify tenant boundary before returning evidence, findings, AIUsageFlow, documents or audit events.

## Snapshot and Version Policy

WizardProfile, TechnicalEvidenceReport, TechnicalProfile, AIUsageFlow, VerifiedProfile, RiskClassification, GapAnalysis and GeneratedDocument are versioned or immutable snapshots. New evidence invalidates dependent downstream snapshots.

## Migration Ordering

1. Identity/session entities.
2. Organization/assessment/WizardProfile.
3. GitHub repository connection and scan job entities.
4. Evidence report, findings, refs and graph metadata.
5. Profiles, AIUsageFlow and reconciliation entities.
6. Legal corpus/citation entities.
7. Classification, gaps and documents.
8. Workflow, model run and audit entities.
9. Post-MVP PermissionGrant.

## Transaction Boundaries

Use transactions for state transition + audit event, conflict resolution + workflow resume signal and document metadata + storage ref registration. Queue publishing must use the canonical `OutboxEvent` durable handoff defined in this document and `queue-implementation.md`.

## Security and Privacy Considerations

Sensitive values must be encrypted or hashed where applicable. Do not persist raw source, full prompt, full AST, secret or raw provider token.

## Audit Requirements

All critical writes must include correlation id, actor, role, workflow run id and before/after state where safe.

## Locked Retention Policy for Controlled MVP

| Artifact | MVP Retention | Rule |
| --- | ---: | --- |
| Raw temporary scanner workspace | Delete immediately after scan completion/failure; maximum 24 hours only for crashed-process cleanup recovery. | No raw source long-term persistence. |
| SourceFile metadata | 12 months | Path/hash/size/language/support metadata only. |
| EvidenceReference | 12 months | Metadata/hash/path/symbol refs only. |
| TechnicalFinding | 12 months | Metadata only; immutable. |
| TechnicalEvidenceReport | 12 months | Report metadata/findings/coverage only. |
| CodeGraphNode/CodeGraphEdge | 12 months | Metadata-only graph. |
| ScannerEvidencePath embedded metadata | 12 months | Stored inside TechnicalFinding metadata only. |
| AuditEvent | 12 months minimum for controlled MVP. | Redacted context only; no raw source/secrets/full prompts. |
| GeneratedDocument metadata | 12 months | Metadata/hash/storage ref only. |
| Generated artifact | 12 months or until manual deletion in local MVP. | Artifact body may contain generated report content; no production compliance claim. |
| OutboxEvent | 30 days after `PUBLISHED`; 90 days for `FAILED`. | Payload reference-only. |



---

## Configuration, Secrets and Environments

## Purpose

Define configuration groups, secret handling and environment expectations for LCSP.

## Scope

Applies to local, development, staging and production environments. This document does not provide real secret values or runnable configuration.

## Dependencies / Source References

- [Security and Privacy Implementation](security-privacy-implementation.md)
- [Infrastructure Deployment Implementation](infrastructure-deployment-implementation.md)

## Implementation Boundaries

- No secret values in docs, code, logs, audit records or frontend.
- Concrete production OAuth/OIDC provider configuration is an environment concern, not Future scope.
- Enterprise SSO/SAML/SCIM/domain federation remains Future/Enterprise.

## Environment Expectations

| Environment | Purpose | Notes |
| --- | --- | --- |
| local | Developer documentation/testing environment | May use mocks for external providers |
| development | Shared integration validation | Non-production data only |
| staging | Release candidate validation | Production-like controls |
| production | Live LCSP environment | Strict secret, audit, backup and retention controls |

## Configuration Groups

| Config Group | Example Key Category | Owner | Storage Location | Rotation | Never Log? |
| --- | --- | --- | --- | --- | --- |
| database | host, db name, connection ref | DevOps | Secret/config store | per policy | Yes for password |
| queue | broker URL/ref, exchange/queue names | DevOps | Secret/config store | per policy | Yes for credential |
| object storage | bucket/container, access ref | DevOps | Secret/config store | per policy | Yes |
| OAuth/OIDC | issuer, client id, secret ref, callback URL | Security | Secret/config store | provider policy | Yes for secret/token |
| MFA encryption | key reference | Security | KMS/secret store | security policy | Yes |
| GitHub App | app id, installation refs, private key ref | Security/DevOps | Secret store | GitHub policy | Yes |
| LLM Gateway | provider refs, model labels, rate limits | Architecture/Security | Secret/config store | provider policy | Yes for API keys |
| legal corpus | active corpus version, ingestion refs | Legal/RAG owner | Config/DB | versioned | No secrets expected |
| scanner rulesets | ruleset version, feature flags | Scanner owner | versioned artifact/config | release policy | No |
| observability | metrics/logging endpoints | DevOps | Secret/config store | per policy | Yes for tokens |
| application URLs | base URLs, callback URLs | DevOps | config store | deployment policy | No secrets |
| feature flags | optional capabilities | Product/DevOps | config store | release policy | No secrets |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Environment config | Bootstrapped API/Web/Worker |
| Secret refs | Runtime provider credentials without log exposure |
| Feature flags | Enabled/disabled UI/API capabilities |

## State / Error / Failure Handling

Missing required production secrets must prevent service startup. Invalid callback URLs must block OAuth/OIDC login configuration. Missing GitHub App config must block repository connection.

## Security and Privacy Considerations

Secret injection must avoid frontend exposure. Logs and audit records must use references or redacted labels.

## Audit Requirements

Audit configuration-sensitive changes where LCSP supports admin operations, including provider config changes, corpus version activation and ruleset version changes.

## Locked Local Configuration Decisions for Controlled MVP

| Decision | Controlled MVP Value |
| --- | --- |
| OAuth/OIDC provider | Local mock OIDC with provider-agnostic interface. |
| Required OIDC keys | `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET_REF`, `OIDC_CALLBACK_URL`, `OIDC_MOCK_ENABLED`, `SESSION_SECRET_REF`. |
| Secret manager/KMS tooling | Secret values are represented by secret references in local MVP; concrete production secret manager is a release-environment concern, not a controlled MVP coding prerequisite. |
| Object storage | Local filesystem artifact store with S3-compatible adapter boundary. |
| Artifact root | `${LCSP_ARTIFACT_STORE_ROOT:-.lcsp/artifacts}`. |
| LLM provider | Deterministic mock LLM gateway by default with provider adapter interface. |
| Legal corpus seed | Local JSONL seed with required citation fields. |



---

## Operational Failure Recovery Runbook

## Purpose

Define expected detection, automatic response, operator action, user-visible result and audit/alert behavior for LCSP failure modes.

## Scope

This is an operations design runbook, not executable automation.

## Dependencies / Source References

- [Audit and Observability Implementation](audit-observability-implementation.md)
- [Queue Jobs, Retry and Idempotency](queue-jobs-retry-idempotency.md)

## Failure Matrix

| Failure | Detection | Automatic Response | Operator Action | User-visible Result | Audit / Alert |
| --- | --- | --- | --- | --- | --- |
| OAuth provider outage | callback/start failure rate | Show login unavailable/retry | Verify provider/config | Login unavailable | Alert auth outage |
| OAuth callback validation failure | invalid state/nonce/issuer/audience | Reject callback | Investigate abuse/config | Login failed | Audit failure |
| GitHub App token failure | API/clone auth failure | Mark scan blocked/failed | Reconnect/rotate app creds | Repository access issue | Audit + alert if repeated |
| Repository clone failure | worker clone error | Retry if transient | Inspect repo access/network | Scan failed/retryable | Audit scan failure |
| Scanner failure | worker node failure | Retry or fail job | Inspect scanner/ruleset | Scan failed | Audit + metric |
| Report hash mismatch | gate validation | Reject report | Investigate integrity | Evidence rejected | Security alert |
| Schema invalid | Schema Gate fail | Reject report | Fix scanner contract/rules | Classification locked | Audit gate fail |
| Quality insufficient | Quality Gate fail | Request re-scan/correction | Review coverage | Classification locked | Audit insufficient |
| AIUsageFlow uncertain | critical claim unknown | Block final classification or create Manager clarification | Review evidence/fixtures | Needs clarification | Audit uncertainty |
| Unresolved conflict | conflict status open | Pause workflow | Manager resolves | Classification locked | Audit conflict age |
| RAG failure | retrieval error | Retry/degrade/block | Inspect corpus/vector store | Classification unavailable | Alert if repeated |
| Missing citation | citation guardrail fail | Block/degrade output | Review corpus/rules | Legal output blocked/degraded | Audit citation missing |
| LLM timeout | gateway timeout | Retry then fail closed | Inspect provider/rate limits | Step delayed/blocked | Audit model timeout |
| LLM invalid output | schema validation fail | Retry then fail closed | Inspect prompt/model | Step blocked/degraded | Audit invalid output |
| Queue outage | broker health | Stop enqueue/consume | Restore queue | Async actions unavailable | Alert queue outage |
| Worker crash | heartbeat/job timeout | Requeue/resume checkpoint | Restart worker | Job delayed | Audit retry |
| Database outage | DB health | Fail requests closed | Restore DB | Service unavailable | Critical alert |
| Object-storage failure | storage write/read error | Retry then fail | Restore storage | Document unavailable | Audit storage failure |
| Document generation failure | job failure | Retry if safe | Inspect template/data | Document failed | Audit failure |
| Audit write failure | audit service error | Fail closed for critical transitions | Restore audit path | Action blocked | Critical alert |

## Security and Privacy Considerations

Operator diagnostics must use redacted metadata. Do not pull raw source or secrets into support tickets/logs.

## Audit Requirements

Each failure and recovery action should be traceable through audit event and correlation id.

## Locked Operational Defaults for Controlled MVP

| Decision | Controlled MVP Value |
| --- | --- |
| Alerting backend | Structured logs and audit events are sufficient for controlled MVP local execution. External alerting backend selection is a release-environment concern. |
| Escalation policy | Security-sensitive failures such as workspace cleanup failure, audit write failure and secret redaction failure are recorded as `SECURITY_EVENT` or critical audit metadata. |

<!-- PHASE-5-5-CANONICAL-PRISMA-SCHEMA:START -->

## Phase 5.5 Canonical Physical Prisma Schema

`docs/implementation/persistence-implementation.md` is the only authoritative physical schema source for the controlled MVP prototype. Other documents may reference these models but must not redefine them.

### Schema Fragment

```prisma
enum AssessmentState {
  CREATED
  WIZARD_PROFILE_READY
  REPOSITORY_CONNECTED
  SNAPSHOT_CREATED
  SCAN_REQUESTED
  SCAN_RUNNING
  SCAN_COMPLETED
  TECHNICAL_PROFILE_READY
  AI_USAGE_FLOW_READY
  RECONCILIATION_REQUIRED
  VERIFIED_PROFILE_READY
  LEGAL_MATCHING_READY
  CLASSIFICATION_READY
  CLASSIFICATION_BLOCKED
  DOCUMENT_GENERATED
  DOCUMENT_BLOCKED
}

enum ScanJobStatus { REQUESTED RUNNING COMPLETED FAILED CANCELED }
enum EvidenceReportStatus { DRAFT SCHEMA_VALID QUALITY_VALID QUALITY_INSUFFICIENT FAILED }
enum EvidenceQualityStatus { PASS INSUFFICIENT FAILED }
enum FindingType { AI_PROVIDER_USAGE AI_FRAMEWORK_USAGE AI_MODEL_INVOCATION AI_INPUT_SIGNAL AI_OUTPUT_SIGNAL AI_DECISION_FLOW_SIGNAL AUTOMATED_DECISION_SIGNAL HUMAN_REVIEW_SIGNAL RANKING_SIGNAL RECOMMENDATION_SIGNAL STATUS_UPDATE_SIGNAL USER_IMPACT_SIGNAL SENSITIVE_DATA_SIGNAL DOMAIN_CONTEXT_SIGNAL SYSTEM_PROMPT_DETECTED DYNAMIC_SYSTEM_PROMPT_REFERENCE RAG_USAGE_SIGNAL MODEL_OUTPUT_PARSER_SIGNAL SCAN_COVERAGE_LIMITATION UNSUPPORTED_DYNAMIC_FLOW }
enum EvidenceSourceType { STATIC_SCAN WIZARD_DECLARATION MANAGER_RESOLUTION LEGAL_CORPUS SYSTEM_DERIVED }
enum AnalysisSupportLevel { FULL_STATIC SYNTAX_ONLY BASIC_SIGNAL_ONLY UNSUPPORTED }
enum AIUsageFlowStatus { DRAFT READY UNCLEAR CONFLICTED BLOCKED }
enum HumanReviewState { PRESENT ABSENT_WITH_BOUNDED_PATH UNCLEAR NOT_APPLICABLE }
enum AutomationLevel { ASSISTIVE SEMI_AUTOMATED FULLY_AUTOMATED UNKNOWN }
enum ReconciliationStatus { NOT_REQUIRED CONFLICT_OPEN RESOLVED VERIFIED }
enum ClassificationStatus { REQUESTED RUNNING COMPLETED BLOCKED FAILED }
enum GapAnalysisStatus { REQUESTED RUNNING COMPLETED BLOCKED FAILED }
enum DocumentStatus { REQUESTED GENERATED BLOCKED FAILED }
enum OutboxStatus { PENDING LOCKED PUBLISHED FAILED }
enum AuditEventType { AUTH_EVENT ASSESSMENT_CREATED WIZARD_PROFILE_SAVED REPOSITORY_CONNECTED SNAPSHOT_CREATED SCAN_REQUESTED SCAN_STARTED SCAN_COMPLETED SCAN_FAILED TECHNICAL_PROFILE_CREATED AI_USAGE_FLOW_CREATED RECONCILIATION_CONFLICT_DETECTED RECONCILIATION_RESOLVED VERIFIED_PROFILE_CREATED LEGAL_MATCHING_COMPLETED CLASSIFICATION_COMPLETED CLASSIFICATION_BLOCKED GAP_ANALYSIS_COMPLETED GAP_ANALYSIS_BLOCKED DOCUMENT_GENERATED DOCUMENT_BLOCKED OUTBOX_PUBLISH_FAILED SECURITY_EVENT }

model Organization {
  id          String   @id @db.Uuid
  name        String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  members     OrganizationMembership[]
  assessments Assessment[]
  repositoryConnections RepositoryConnection[]
  auditEvents AuditEvent[]
  @@index([name])
}

model User {
  id          String   @id @db.Uuid
  email       String   @unique
  displayName String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  memberships OrganizationMembership[]
  ownedAssessments Assessment[] @relation("AssessmentOwner")
  auditEvents AuditEvent[]
}

model OrganizationMembership {
  id             String @id @db.Uuid
  organizationId String @db.Uuid
  userId         String @db.Uuid
  role           String
  createdAt      DateTime @default(now())
  organization   Organization @relation(fields: [organizationId], references: [id])
  user           User @relation(fields: [userId], references: [id])
  @@unique([organizationId, userId])
  @@index([userId, role])
}

model Assessment {
  id             String @id @db.Uuid
  organizationId String @db.Uuid
  ownerManagerId String @db.Uuid
  state          AssessmentState @default(CREATED)
  title          String
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  ownerManager   User @relation("AssessmentOwner", fields: [ownerManagerId], references: [id])
  wizardProfiles WizardProfile[]
  repositoryConnections RepositoryConnection[]
  snapshots      RepositorySnapshot[]
  scanJobs       RepositoryScanJob[]
  technicalProfiles TechnicalProfile[]
  aiUsageFlows AIUsageFlow[]
  conflicts ReconciliationConflict[]
  verifiedProfiles VerifiedProfile[]
  legalRuleMatches LegalRuleMatch[]
  classifications RiskClassification[]
  gapAnalyses GapAnalysis[]
  documents GeneratedDocument[]
  auditEvents AuditEvent[]
  @@index([organizationId, state])
  @@index([ownerManagerId])
}

model WizardProfile {
  id           String @id @db.Uuid
  assessmentId String @db.Uuid
  version      Int
  answers      Json
  submittedBy  String @db.Uuid
  createdAt    DateTime @default(now())
  assessment   Assessment @relation(fields: [assessmentId], references: [id])
  @@unique([assessmentId, version])
  @@index([assessmentId])
}

model RepositoryConnection {
  id             String @id @db.Uuid
  organizationId String @db.Uuid
  assessmentId   String @db.Uuid
  provider       String
  installationId String
  repositoryOwner String
  repositoryName String
  repositoryId   String
  selectedBranch String?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  organization   Organization @relation(fields: [organizationId], references: [id])
  assessment     Assessment @relation(fields: [assessmentId], references: [id])
  snapshots      RepositorySnapshot[]
  @@unique([assessmentId, repositoryId])
  @@index([organizationId])
}

model RepositorySnapshot {
  id                     String @id @db.Uuid
  assessmentId           String @db.Uuid
  repositoryConnectionId String @db.Uuid
  branch                 String
  commitSha              String
  fileCount              Int
  totalBytes             Int
  metadata               Json
  createdAt              DateTime @default(now())
  assessment             Assessment @relation(fields: [assessmentId], references: [id])
  repositoryConnection   RepositoryConnection @relation(fields: [repositoryConnectionId], references: [id])
  scanJobs               RepositoryScanJob[]
  sourceFiles            SourceFile[]
  @@unique([repositoryConnectionId, commitSha])
  @@index([assessmentId, commitSha])
}

model RepositoryScanJob {
  id                   String @id @db.Uuid
  assessmentId          String @db.Uuid
  repositorySnapshotId  String @db.Uuid
  status                ScanJobStatus @default(REQUESTED)
  idempotencyKey        String @unique
  scannerVersion        String
  rulesetVersion        String
  requestedBy           String @db.Uuid
  startedAt             DateTime?
  completedAt           DateTime?
  failureCode           String?
  failureMessage        String?
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  assessment            Assessment @relation(fields: [assessmentId], references: [id])
  repositorySnapshot    RepositorySnapshot @relation(fields: [repositorySnapshotId], references: [id])
  evidenceReports       TechnicalEvidenceReport[]
  graphNodes            CodeGraphNode[]
  graphEdges            CodeGraphEdge[]
  @@index([assessmentId, status])
  @@index([repositorySnapshotId])
}

model SourceFile {
  id                   String @id @db.Uuid
  repositorySnapshotId String @db.Uuid
  relativePath          String
  extension             String
  language              String
  supportLevel          AnalysisSupportLevel
  sizeBytes             Int
  contentHash           String
  ignored               Boolean @default(false)
  coverageLimitations   Json?
  createdAt             DateTime @default(now())
  repositorySnapshot    RepositorySnapshot @relation(fields: [repositorySnapshotId], references: [id])
  evidenceReferences    EvidenceReference[]
  @@unique([repositorySnapshotId, relativePath])
  @@index([repositorySnapshotId, supportLevel])
}

model CodeGraphNode {
  id          String @id @db.Uuid
  scanJobId   String @db.Uuid
  nodeType    String
  filePath    String?
  symbolRef   String?
  lineStart   Int?
  lineEnd     Int?
  evidenceHash String
  metadata    Json?
  confidence  Float
  createdAt   DateTime @default(now())
  scanJob     RepositoryScanJob @relation(fields: [scanJobId], references: [id])
  outgoing    CodeGraphEdge[] @relation("GraphEdgeSource")
  incoming    CodeGraphEdge[] @relation("GraphEdgeTarget")
  @@index([scanJobId, nodeType])
  @@index([scanJobId, symbolRef])
}

model CodeGraphEdge {
  id           String @id @db.Uuid
  scanJobId    String @db.Uuid
  sourceNodeId String @db.Uuid
  targetNodeId String @db.Uuid
  edgeType     String
  evidenceHash String
  metadata     Json?
  confidence   Float
  createdAt    DateTime @default(now())
  scanJob      RepositoryScanJob @relation(fields: [scanJobId], references: [id])
  sourceNode   CodeGraphNode @relation("GraphEdgeSource", fields: [sourceNodeId], references: [id])
  targetNode   CodeGraphNode @relation("GraphEdgeTarget", fields: [targetNodeId], references: [id])
  @@index([scanJobId, edgeType])
  @@index([sourceNodeId])
  @@index([targetNodeId])
}

model EvidenceReference {
  id            String @id @db.Uuid
  assessmentId  String @db.Uuid
  scanJobId     String? @db.Uuid
  sourceFileId  String? @db.Uuid
  sourceType    EvidenceSourceType
  filePath      String?
  symbolRef     String?
  lineStart     Int?
  lineEnd       Int?
  evidenceHash  String
  redactionStatus String
  metadata      Json?
  createdAt     DateTime @default(now())
  sourceFile    SourceFile? @relation(fields: [sourceFileId], references: [id])
  findings      TechnicalFinding[]
  claims        AIUsageFlowClaim[]
  @@unique([evidenceHash])
  @@index([assessmentId, sourceType])
}

model TechnicalFinding {
  id            String @id @db.Uuid
  reportId      String @db.Uuid
  evidenceRefId String @db.Uuid
  findingType   FindingType
  confidence    Float
  severity      String
  metadata      Json
  createdAt     DateTime @default(now())
  report        TechnicalEvidenceReport @relation(fields: [reportId], references: [id])
  evidenceRef   EvidenceReference @relation(fields: [evidenceRefId], references: [id])
  @@index([reportId, findingType])
  @@index([evidenceRefId])
}

model TechnicalEvidenceReport {
  id              String @id @db.Uuid
  assessmentId    String @db.Uuid
  scanJobId       String @db.Uuid
  status          EvidenceReportStatus
  qualityStatus   EvidenceQualityStatus
  reportHash      String @unique
  scannerVersion  String
  rulesetVersion  String
  schemaVersion   String
  coverageSummary Json
  privacyFlags    Json
  createdAt       DateTime @default(now())
  assessment      Assessment @relation(fields: [assessmentId], references: [id])
  scanJob         RepositoryScanJob @relation(fields: [scanJobId], references: [id])
  findings        TechnicalFinding[]
  technicalProfiles TechnicalProfile[]
  @@index([assessmentId, status])
  @@index([scanJobId])
}

model TechnicalProfile {
  id                        String @id @db.Uuid
  assessmentId              String @db.Uuid
  technicalEvidenceReportId String @db.Uuid
  source                    String
  aiDetected                String
  providers                 Json
  frameworks                Json
  modelInvocationCount      Int
  inputCategories           Json
  outputCategories          Json
  decisionFlowSignals       Json
  humanReviewSignals        Json
  sensitiveDataSignals      Json
  domainSignals             Json
  coverageLimitations       Json
  confidence                Float
  evidenceRefs              Json
  createdAt                 DateTime @default(now())
  assessment                Assessment @relation(fields: [assessmentId], references: [id])
  technicalEvidenceReport   TechnicalEvidenceReport @relation(fields: [technicalEvidenceReportId], references: [id])
  aiUsageFlows              AIUsageFlow[]
  verifiedProfiles          VerifiedProfile[]
  @@index([assessmentId, createdAt])
  @@unique([technicalEvidenceReportId])
}

model AIUsageFlow {
  id                 String @id @db.Uuid
  assessmentId       String @db.Uuid
  technicalProfileId String @db.Uuid
  status             AIUsageFlowStatus
  confidence         Float
  uncertaintyReasons Json
  coverageLimitations Json
  createdAt          DateTime @default(now())
  assessment         Assessment @relation(fields: [assessmentId], references: [id])
  technicalProfile   TechnicalProfile @relation(fields: [technicalProfileId], references: [id])
  claims             AIUsageFlowClaim[]
  conflicts          ReconciliationConflict[]
  verifiedProfiles   VerifiedProfile[]
  @@index([assessmentId, status])
  @@unique([technicalProfileId])
}

model AIUsageFlowClaim {
  id              String @id @db.Uuid
  aiUsageFlowId   String @db.Uuid
  claimField      String
  claimValue      Json
  confidence      Float
  evidenceRefId   String @db.Uuid
  confidenceBreakdown Json
  createdAt       DateTime @default(now())
  aiUsageFlow     AIUsageFlow @relation(fields: [aiUsageFlowId], references: [id])
  evidenceRef     EvidenceReference @relation(fields: [evidenceRefId], references: [id])
  @@index([aiUsageFlowId, claimField])
  @@index([evidenceRefId])
}

model ReconciliationConflict {
  id            String @id @db.Uuid
  assessmentId  String @db.Uuid
  aiUsageFlowId String @db.Uuid
  conflictType  String
  status        ReconciliationStatus
  evidenceRefs  Json
  managerResolution Json?
  resolvedBy    String? @db.Uuid
  resolvedAt    DateTime?
  createdAt     DateTime @default(now())
  assessment    Assessment @relation(fields: [assessmentId], references: [id])
  aiUsageFlow   AIUsageFlow @relation(fields: [aiUsageFlowId], references: [id])
  @@index([assessmentId, status])
}

model VerifiedProfile {
  id                 String @id @db.Uuid
  assessmentId       String @db.Uuid
  technicalProfileId String @db.Uuid
  aiUsageFlowId      String @db.Uuid
  profileVersion     Int
  mergedProfile      Json
  evidenceRefs       Json
  createdAt          DateTime @default(now())
  assessment         Assessment @relation(fields: [assessmentId], references: [id])
  technicalProfile   TechnicalProfile @relation(fields: [technicalProfileId], references: [id])
  aiUsageFlow        AIUsageFlow @relation(fields: [aiUsageFlowId], references: [id])
  legalRuleMatches   LegalRuleMatch[]
  classifications    RiskClassification[]
  @@unique([assessmentId, profileVersion])
  @@index([assessmentId, createdAt])
}

model LegalCorpusVersion {
  id          String @id @db.Uuid
  version     String @unique
  sourceRefs  Json
  status      String
  createdAt   DateTime @default(now())
  ruleMatches LegalRuleMatch[]
}

model LegalRuleMatch {
  id                   String @id @db.Uuid
  assessmentId          String @db.Uuid
  verifiedProfileId     String @db.Uuid
  legalCorpusVersionId  String @db.Uuid
  ruleId                String
  citationRefs          Json
  matchRationale        Json
  status                String
  createdAt             DateTime @default(now())
  assessment            Assessment @relation(fields: [assessmentId], references: [id])
  verifiedProfile       VerifiedProfile @relation(fields: [verifiedProfileId], references: [id])
  legalCorpusVersion    LegalCorpusVersion @relation(fields: [legalCorpusVersionId], references: [id])
  classifications       RiskClassification[]
  @@index([assessmentId, ruleId])
  @@index([verifiedProfileId])
}

model RiskClassification {
  id                 String @id @db.Uuid
  assessmentId       String @db.Uuid
  verifiedProfileId  String @db.Uuid
  legalRuleMatchId   String? @db.Uuid
  status             ClassificationStatus
  riskLevel          String?
  blockingReasons    Json
  citationCoverage   String
  confidence         Float?
  createdAt          DateTime @default(now())
  assessment         Assessment @relation(fields: [assessmentId], references: [id])
  verifiedProfile    VerifiedProfile @relation(fields: [verifiedProfileId], references: [id])
  legalRuleMatch     LegalRuleMatch? @relation(fields: [legalRuleMatchId], references: [id])
  gapAnalyses        GapAnalysis[]
  documents          GeneratedDocument[]
  @@index([assessmentId, status])
  @@index([verifiedProfileId])
}

model GapAnalysis {
  id                   String @id @db.Uuid
  assessmentId          String @db.Uuid
  riskClassificationId  String @db.Uuid
  status                GapAnalysisStatus
  gapItems              Json
  evidenceRefs          Json
  legalRuleMatchRefs    Json
  blockingReasons       Json
  createdAt             DateTime @default(now())
  assessment            Assessment @relation(fields: [assessmentId], references: [id])
  riskClassification    RiskClassification @relation(fields: [riskClassificationId], references: [id])
  documents             GeneratedDocument[]
  @@index([assessmentId, status])
  @@index([riskClassificationId])
}

model GeneratedDocument {
  id                    String @id @db.Uuid
  assessmentId           String @db.Uuid
  riskClassificationId   String @db.Uuid
  gapAnalysisId          String @db.Uuid
  status                 DocumentStatus
  templateVersion        String
  storageRef             String?
  documentHash           String?
  blockingReasons        Json
  createdAt              DateTime @default(now())
  assessment             Assessment @relation(fields: [assessmentId], references: [id])
  riskClassification     RiskClassification @relation(fields: [riskClassificationId], references: [id])
  gapAnalysis            GapAnalysis @relation(fields: [gapAnalysisId], references: [id])
  @@index([assessmentId, status])
  @@index([gapAnalysisId])
}

model OutboxEvent {
  id            String @id @db.Uuid
  eventType     String
  exchange      String
  routingKey    String
  payload       Json
  status        OutboxStatus @default(PENDING)
  attempts      Int @default(0)
  nextAttemptAt DateTime @default(now())
  lockedAt      DateTime?
  lockedBy      String?
  publishedAt   DateTime?
  lastError     String?
  correlationId String @db.Uuid
  causationId   String? @db.Uuid
  aggregateType String
  aggregateId   String @db.Uuid
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@index([status, nextAttemptAt])
  @@index([aggregateType, aggregateId])
  @@index([correlationId])
}

model AuditEvent {
  id             String @id @db.Uuid
  organizationId String? @db.Uuid
  assessmentId   String? @db.Uuid
  actorUserId    String? @db.Uuid
  eventType      AuditEventType
  correlationId  String @db.Uuid
  causationId    String? @db.Uuid
  beforeState    Json?
  afterState     Json?
  metadata       Json
  createdAt      DateTime @default(now())
  organization   Organization? @relation(fields: [organizationId], references: [id])
  assessment     Assessment? @relation(fields: [assessmentId], references: [id])
  actorUser      User? @relation(fields: [actorUserId], references: [id])
  @@index([organizationId, createdAt])
  @@index([assessmentId, createdAt])
  @@index([correlationId])
}
```

### Retention and Privacy Rules

- `SourceFile`, `EvidenceReference`, `CodeGraphNode`, `CodeGraphEdge`, `TechnicalFinding` and `TechnicalEvidenceReport` store metadata, refs, hashes and paths only; no raw source and no full AST bodies.
- `AIUsageFlowClaim`, `LegalRuleMatch`, `RiskClassification` and `GeneratedDocument` store structured results and references only; no full prompts or secrets.
- `OutboxEvent.payload` is reference-only and must not contain source bodies, tokens, secrets, full prompts or raw AST payloads.
- `AuditEvent.metadata`, `beforeState` and `afterState` must be redacted before persistence.
- `ScannerEvidencePath` is not a separate physical table in the controlled MVP. Store it as structured JSON in `TechnicalFinding.metadata.evidencePath` with `pathType`, ordered `nodeIds`, ordered `edgeIds`, `evidenceRefIds`, `confidence` and optional `coverageLimitations`.

### Migration Order

1. Identity and organization: `Organization`, `User`, `OrganizationMembership`.
2. Assessment and declarations: `Assessment`, `WizardProfile`.
3. Repository and scan foundation: `RepositoryConnection`, `RepositorySnapshot`, `RepositoryScanJob`, `SourceFile`.
4. Evidence graph and findings: `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalEvidenceReport`, `TechnicalFinding`.
5. Lifecycle analysis: `TechnicalProfile`, `AIUsageFlow`, `AIUsageFlowClaim`, `ReconciliationConflict`, `VerifiedProfile`.
6. Legal and output: `LegalCorpusVersion`, `LegalRuleMatch`, `RiskClassification`, `GeneratedDocument`.
7. Reliability and audit: `OutboxEvent`, `AuditEvent`.
<!-- PHASE-5-5-CANONICAL-PRISMA-SCHEMA:END -->
