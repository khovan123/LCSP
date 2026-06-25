# LCSP Domain Model

## Purpose

This document is the domain-level source of truth for LCSP entities, ownership, relationships, and lifecycle semantics. Physical Prisma definitions remain owned by `docs/implementation/persistence-implementation.md`.

## Domain Object Flow

```text
Organization
-> User / OrganizationMembership
-> Policy / PolicyVersion / AuthorizationDecision
-> Assessment
-> WizardProfile
-> RepositoryConnection
-> TrustedScanTrigger / ScanMappingResolution
-> RepositorySnapshot
-> RepositoryScanJob
-> SourceFile / EvidenceReference / CodeGraph
-> TechnicalFinding / TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow / AIUsageFlowClaim
-> ReconciliationConflict or VerifiedProfile
-> LegalRuleMatch
-> RiskClassification
-> GapAnalysis
-> GeneratedDocument
-> AuditEvent
```

Legal corpus preparation is a parallel internal operations flow:

```text
LegalSource
-> LegalDocument
-> LegalCorpusItem
-> CorpusApprovalRecord
-> LegalCorpusVersion APPROVED
-> LegalDocumentChunk / ChromaDB legal index records
-> RetrievalAuditLog
-> LegalRuleMatch
```

## Ownership Principles

- Manager owns assessment business truth and final conflict resolution.
- Developer is optional and may perform scoped tasks with independent product value. Structured attestation is `SUPERSEDED_FOR_ACTIVE_MVP`.
- PBAC is the authorization source of truth. Roles are subject attributes/templates only.
- Python Worker Platform owns all asynchronous domain workloads.
- Python Scanner Worker owns Repository Scan lifecycle and scanner evidence entities.
- Internal Legal Operator owns corpus review/approval actions through internal API/CLI for MVP.
- Approved LegalCorpusVersion is immutable.
- All material transitions create AuditEvent and asynchronous transitions use OutboxEvent.
- Raw source, secrets, full prompts, and full AST bodies are not persistent domain data.

## Identity and Administration

### Organization

| Field | Type | Required | Meaning |
|---|---|---:|---|
| organizationId | UUIDv7 | Yes | Tenant identity |
| name | string | Yes | Display name |
| createdAt / updatedAt | datetime | Yes | Lifecycle timestamps |

Relationships: has memberships, users, assessments, repository connections, and audit events.

### User

| Field | Type | Required | Meaning |
|---|---|---:|---|
| userId | UUIDv7 | Yes | User identity |
| email | string | Yes | Login/contact identity |
| displayName | string | No | Human-readable name |
| status | enum | Yes | active/disabled lifecycle |

### OrganizationMembership

| Field | Type | Required | Meaning |
|---|---|---:|---|
| membershipId | UUIDv7 | Yes | Membership identity |
| organizationId / userId | UUIDv7 | Yes | Tenant/user link |
| role | enum | Yes | Manager or Developer subject label only |
| policyScope | JSON | No | PBAC policy scope references for delegated tasks |
| status | enum | Yes | invited/active/revoked |

### Policy / PolicyVersion

| Field | Type | Required | Meaning |
|---|---|---:|---|
| policyId | UUIDv7/string | Yes | Policy identity |
| version | integer/string | Yes | Immutable policy version |
| organizationId | UUIDv7 | Yes | Tenant boundary |
| subjectSelector | JSON | Yes | Subject attributes/service identity selector |
| resourceSelector | JSON | Yes | Resource scope |
| actions | JSON | Yes | Allowed/denied action set |
| status | enum | Yes | active/superseded/revoked |

Concrete PBAC engine, storage, cache, invalidation, evaluation topology and failure behavior are `TECHNICAL_DECISION_REQUIRED`.

### AuthorizationDecision

| Field | Type | Required | Meaning |
|---|---|---:|---|
| authorizationDecisionId | UUIDv7 | Yes | Decision identity |
| actorOrServiceIdentity | string/UUID | Yes | Subject/service evaluated |
| organizationId | UUIDv7 | Yes | Tenant boundary |
| resourceRef | JSON | Yes | Safe resource reference |
| action | string | Yes | Requested action |
| policyId / policyVersion | string | Yes | Policy basis |
| decision | enum | Yes | ALLOW/DENY |
| contextRefs | JSON | Yes | Safe request/runtime context refs |
| correlationId | UUIDv7/string | Yes | Trace correlation |
| createdAt | datetime | Yes | Decision time |

## Assessment and Repository

### Assessment

| Field | Type | Required | Meaning |
|---|---|---:|---|
| assessmentId | UUIDv7 | Yes | Assessment identity |
| organizationId | UUIDv7 | Yes | Tenant boundary |
| ownerManagerId | UUIDv7 | Yes | Final accountable actor |
| title | string | Yes | Assessment label |
| state | AssessmentState | Yes | Canonical lifecycle state |
| createdAt / updatedAt | datetime | Yes | Timestamps |

Lifecycle:

```text
CREATED -> WIZARD_PROFILE_READY -> REPOSITORY_CONNECTED
-> TRUSTED_SCAN_TRIGGERED or PENDING_MAPPING/BLOCKED_MAPPING/WAITING_FOR_CONTEXT
-> SNAPSHOT_CREATED
-> SCAN_REQUESTED -> SCAN_RUNNING -> SCAN_COMPLETED
-> TECHNICAL_PROFILE_READY -> AI_USAGE_FLOW_READY
-> RECONCILIATION_REQUIRED or VERIFIED_PROFILE_READY
-> LEGAL_MATCHING_READY -> CLASSIFICATION_READY/BLOCKED
-> GAP_ANALYSIS_READY/BLOCKED -> DOCUMENT_GENERATED/BLOCKED
```

### WizardProfile

| Field | Type | Required | Meaning |
|---|---|---:|---|
| wizardProfileId | UUIDv7 | Yes | Profile identity |
| assessmentId | UUIDv7 | Yes | Owner assessment |
| version | integer | Yes | Immutable version |
| answers | JSON | Yes | Structured Manager answers |
| submittedBy | UUIDv7 | Yes | Manager actor |
| createdAt | datetime | Yes | Submission time |

### RepositoryConnection

| Field | Type | Required | Meaning |
|---|---|---:|---|
| repositoryConnectionId | UUIDv7 | Yes | Connection identity |
| assessmentId | UUIDv7 | Yes | Assessment scope |
| installationId | string | Yes | GitHub App installation ref |
| repositoryOwner / repositoryName / repositoryId | string | Yes | Selected repository identity |
| selectedBranch | string | No | Default branch |
| status | enum | Yes | connected/revoked/unavailable |

### RepositorySnapshot

| Field | Type | Required | Meaning |
|---|---|---:|---|
| repositorySnapshotId | UUIDv7 | Yes | Snapshot identity |
| assessmentId / repositoryConnectionId | UUIDv7 | Yes | Scope/source |
| branch / commitSha | string | Yes | Pinned source |
| fileCount / totalBytes | integer | Yes | Inventory summary |
| metadata | JSON | Yes | Redacted provider metadata |
| createdAt | datetime | Yes | Snapshot time |

Snapshot is immutable and historical reruns create new ScanJob/evidence versions.

### TrustedScanTrigger

| Field | Type | Required | Meaning |
|---|---|---:|---|
| trustedScanTriggerId | UUIDv7 | Yes | Trigger identity |
| organizationId | UUIDv7 | Yes | Tenant boundary |
| sourceType | enum | Yes | GITHUB_WEBHOOK/SCHEDULED_TRIGGER/BACKEND_TRIGGER/MANAGER_ACTION |
| sourceIdentity | string | Yes | Verified source/service/actor identity |
| sourceDeliveryId | string | No | External delivery id where available |
| repositoryConnectionId / repositoryId | UUID/string | No | Repository mapping context |
| assessmentId | UUIDv7 | No | Assessment mapping if known |
| branch / commitSha | string | No | Trusted ref context |
| status | enum | Yes | RECEIVED/CONTEXT_VALIDATING/READY_TO_SNAPSHOT/PENDING_MAPPING/BLOCKED_MAPPING/WAITING_FOR_CONTEXT/REJECTED |
| idempotencyKey | string | Yes | Duplicate handling |
| correlationId / causationId | string | Yes | Trace refs |

### ScanMappingResolution

| Field | Type | Required | Meaning |
|---|---|---:|---|
| mappingResolutionId | UUIDv7 | Yes | Mapping decision identity |
| trustedScanTriggerId | UUIDv7 | Yes | Source trigger |
| status | enum | Yes | READY/PENDING_MAPPING/BLOCKED_MAPPING/WAITING_FOR_CONTEXT |
| reasonCode | string | Yes | Safe reason |
| resolvedRefs | JSON | No | Safe org/repo/assessment refs |
| managerVisible | boolean | Yes | Whether UI recovery is required |

Missing or ambiguous mapping must not create RepositorySnapshot or RepositoryScanJob.

## Scanner Evidence

### RepositoryScanJob

| Field | Type | Required | Meaning |
|---|---|---:|---|
| scanJobId | UUIDv7 | Yes | Job identity |
| assessmentId / repositorySnapshotId | UUIDv7 | Yes | Scope |
| status | ScanJobStatus | Yes | REQUESTED/RUNNING/COMPLETED/FAILED/CANCELED |
| workerRuntime | enum | Yes | `PYTHON` for active MVP |
| idempotencyKey | string | Yes | Duplicate protection |
| scannerVersion / rulesetVersion | string | Yes | Reproducibility |
| cleanupVerifiedAt | datetime | No | Required for COMPLETED |
| failureCode / failureMessage | string | No | Redacted failure |

### SourceFile

| Field | Type | Required | Meaning |
|---|---|---:|---|
| sourceFileId / repositorySnapshotId | UUIDv7 | Yes | Identity/scope |
| relativePath / extension / language | string | Yes | Metadata only |
| supportLevel | AnalysisSupportLevel | Yes | BOUNDED_STATIC_L0_L3/BASIC_SIGNAL_ONLY/UNSUPPORTED |
| sizeBytes | integer | Yes | File size |
| contentHash | string | Yes | Integrity reference |
| ignored | boolean | Yes | Skip state |
| coverageLimitations | JSON | No | Bounded analysis gaps |

### EvidenceReference

| Field | Type | Required | Meaning |
|---|---|---:|---|
| evidenceRefId | UUIDv7 | Yes | Reference identity |
| sourceType | enum | Yes | STATIC_SCAN/WIZARD/MANAGER_RESOLUTION/LEGAL_CORPUS/SYSTEM_DERIVED |
| sourceFileId | UUIDv7 | No | File source |
| relativePath / symbolRef | string | No | Redacted location |
| lineRange | JSON | No | Location only |
| evidenceHash | string | Yes | Integrity hash |
| redactionStatus | enum | Yes | No source stored/redacted metadata |

### CodeGraphNode / CodeGraphEdge

Metadata-only scan graph. Nodes/edges contain identifiers, types, file/symbol refs, evidence hashes, confidence, scanner/ruleset versions, and no source bodies.

### TechnicalFinding

| Field | Type | Required | Meaning |
|---|---|---:|---|
| findingId | UUIDv7 | Yes | Finding identity |
| technicalEvidenceReportId | UUIDv7 | Yes | Report owner |
| findingType | FindingType | Yes | Canonical signal type |
| confidence | number | Yes | 0.0-1.0 |
| evidenceRefs | relation/JSON refs | Yes | One or more references where required |
| metadata | JSON | Yes | Redacted normalized metadata |

### TechnicalEvidenceReport

| Field | Type | Required | Meaning |
|---|---|---:|---|
| technicalEvidenceReportId | UUIDv7 | Yes | Report identity |
| assessmentId / scanJobId | UUIDv7 | Yes | Scope/source |
| status | EvidenceReportStatus | Yes | DRAFT/SCHEMA_VALID/QUALITY_VALID/QUALITY_INSUFFICIENT/FAILED |
| reportHash | string | Yes | Integrity |
| scannerVersion / rulesetVersion / schemaVersion | string | Yes | Reproducibility |
| coverageSummary / privacyFlags | JSON | Yes | Gates and limitations |

Only `QUALITY_VALID` report linked to COMPLETED ScanJob with verified cleanup is downstream eligible.

## Intelligence and Reconciliation

### TechnicalProfile

Immutable summary derived from accepted evidence. Core fields: identity/scope, source report, AI detection state, providers/frameworks, invocation count, input/output categories, decision/human-review/domain signals, coverage limitations, confidence, and evidence refs.

### AIUsageFlow / AIUsageFlowClaim

AIUsageFlow groups claim-level records for business process, AI purpose, inputs, outputs, downstream action, affected subjects, human review, automation level, harms, uncertainty, and conflict candidates. Every material claim used for legal matching has evidence refs.

### StructuredTechnicalAttestation

`SUPERSEDED_FOR_ACTIVE_MVP`. This entity must not be created for active MVP UX, API, persistence, events, reports, epics, stories or delivery tasks. Historical decision records may retain prior discussion.

### ReconciliationConflict

| Field | Type | Required | Meaning |
|---|---|---:|---|
| conflictId / assessmentId / aiUsageFlowId | UUIDv7 | Yes | Identity/scope |
| conflictType | string | Yes | Material mismatch |
| status | enum | Yes | CONFLICT_OPEN/RESOLVED/VERIFIED |
| evidenceRefs | JSON/relation | Yes | Compared evidence |
| managerResolution / rationale | JSON | No | Separate final decision |
| resolvedBy / resolvedAt | UUIDv7/datetime | No | Manager resolution audit |

### VerifiedProfile

Immutable reconciled profile combining WizardProfile, TechnicalProfile, AIUsageFlow, and Manager resolutions. It is required before legal matching.

## Legal Corpus and Retrieval

### LegalSource

| Field | Type | Required | Meaning |
|---|---|---:|---|
| legalSourceId | UUIDv7 | Yes | Source identity |
| name / authority | string | Yes | Source label/authority |
| baseUrl | string | Yes | Approved source boundary |
| sourceTier | enum | Yes | PRIMARY/SUPPLEMENTARY |
| validationStatus | enum | Yes | pending/validated/rejected |
| validatedBy / validatedAt | string/datetime | No | Internal validation record |

### LegalDocument

| Field | Type | Required | Meaning |
|---|---|---:|---|
| legalDocumentId / legalSourceId | UUIDv7 | Yes | Identity/source |
| documentNumber / documentType / issuingAuthority / title | string | Yes | Official identity |
| issueDate / effectiveStartDate / effectiveEndDate | date | Yes/No | Legal effect |
| sourceUrl / snapshotRef | string | Yes | Provenance and immutable object storage ref |
| retrievedAt / contentHash | datetime/string | Yes | Capture provenance |
| status | enum | Yes | DRAFT/APPROVED/SUPERSEDED |
| supersedes / supersededBy / amends | JSON | No | Legal relationships |

### LegalCorpusItem

Represents a normalized legal hierarchy unit tied to a document and corpus version. Required fields: corpusItemId, legalDocumentId, corpusVersionId, sectionIdentifier, article/clause/point metadata, normalized content, contentHash.

### LegalDocumentChunk

| Field | Type | Required | Meaning |
|---|---|---:|---|
| chunkId / corpusItemId | UUIDv7 | Yes | Identity/owner |
| chunkIndex | integer | Yes | Stable order |
| content | text | Yes | Approved normalized legal text |
| hierarchicalPath | string | Yes | Stable document/article/clause/point path |
| contextRole | enum | Yes | PRIMARY_MATCH/PARENT_CONTEXT/REFERENCED_CONTEXT at retrieval time |
| outgoingRefIds / incomingRefIds | JSON | No | Cross-reference graph edges |
| chromaCollectionId / chromaRecordId | string | Yes after indexing | ChromaDB collection/record identity |
| supersedesChunkId | string | No | Versioned legal text history |

### LegalCorpusVersion

| Field | Type | Required | Meaning |
|---|---|---:|---|
| legalCorpusVersionId | UUIDv7 | Yes | Version identity |
| version | string | Yes | Human/system version |
| status | enum | Yes | DRAFT/APPROVED/SUPERSEDED |
| sourceRefs | JSON | Yes | Included source/document/hash refs |
| createdAt / approvedAt | datetime | Yes/No | Lifecycle timestamps |

Approved versions are immutable. New changes create a new version; existing assessments retain pinned versions.

### CorpusApprovalRecord

| Field | Type | Required | Meaning |
|---|---|---:|---|
| approvalRecordId / corpusVersionId | UUIDv7 | Yes | Identity/version |
| approvedBy | string/actor ref | Yes | Internal Legal Operator |
| status | enum | Yes | APPROVED/REJECTED |
| scopeDescription / comments | string | Yes/No | Review scope/notes |
| approvalDate | datetime | Yes | Decision time |

### RetrievalAuditLog

Records assessment/query reference, corpus version, effective-date filters, ChromaDB collection/version, result refs, context roles, citation allowlist refs, result count, correlation ID, and timestamp. It must not persist sensitive raw assessment content beyond approved normalized query metadata.

### ModelRunMetadata

Records provider, model, prompt version, sanitized input reference, output hash, status, token/cost metadata, optional corpus version, retrieval audit refs, and correlation ID. Secrets and raw source are excluded. Embedding model metadata is future-only unless a later semantic/reranker path is approved.

### LegalRuleMatch

| Field | Type | Required | Meaning |
|---|---|---:|---|
| legalRuleMatchId | UUIDv7 | Yes | Identity |
| assessmentId / verifiedProfileId / legalCorpusVersionId | UUIDv7 | Yes | Scope/basis |
| ruleId | string | Yes | Rule identity |
| citationRefs | JSON/relation | Yes | Document/article/clause/point/source/hash/version refs |
| rationale / coverage | JSON | Yes | Structured applicability/citation coverage |
| confidence | number | Yes | Deterministic support score |
| status | enum | Yes | applicable/not-applicable/blocked/degraded |

## Classification and Reporting

### RiskClassification

Requires VerifiedProfile and applicable LegalRuleMatch basis. Core fields: identity/scope, status, riskLevel when completed, blockingReasons, citationCoverage, confidence, legal match links, model run metadata reference.

### GapAnalysis

Derived from completed/eligible classification and legal basis. Core fields: identity/scope, status, gap items, obligation refs, evidence refs, priorities, blocking reasons, timestamps.

### GeneratedDocument

Core fields: identity/scope, optional classification/gap basis for readiness-only vs final output, document type, status, template version, storage ref, document hash, blocking reasons, model run metadata ref.

## Governance and Messaging

### AuditEvent

Append-oriented record with organization/assessment/actor, event type, correlation/causation, before/after state where safe, redacted metadata, and timestamp.

### OutboxEvent

Transactional message record with event/command type, schema version, aggregate reference, reference-only payload, correlation/idempotency keys, status, attempts, next-attempt timestamp, and published timestamp.

## UX Boundary

Manager/Developer UX may expose assessment, evidence, conflict, profile, classification, gap, document, and audit entities. LegalSource, LegalDocument, LegalCorpusItem, LegalDocumentChunk, CorpusApprovalRecord, and corpus administration are internal operations/API/CLI entities for MVP. Manager UX may display only the pinned corpus version and citation provenance relevant to an assessment.

## Canonical Status

```text
DOMAIN_MODEL_ALIGNED_WITH_A_TO_Z_MVP
LEGAL_CORPUS_DOMAIN_OBJECTS_INCLUDED
INTERNAL_LEGAL_OPERATOR_UX_BOUNDARY_LOCKED
PYTHON_WORKER_SCANNER_OWNERSHIP_ALIGNED
```
