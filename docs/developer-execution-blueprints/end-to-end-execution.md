# LCSP End-to-End System Execution Blueprint

## Purpose

Show how the canonical Manager journey becomes an evidence-backed assessment, citation-backed classification, gap analysis, generated document, and audit export. This blueprint is runtime documentation, not backlog or implementation authorization.

## Mandatory Invariants

- Manager completes the active MVP without Developer participation.
- OAuth/OIDC login is separate from GitHub App repository authorization.
- GitHub App Repository Scan is the only active MVP technical-evidence path.
- Python Worker solely owns Repository Scan lifecycle.
- Scanner is static-analysis only and never executes customer code.
- Raw source, secrets, full prompts, and full AST bodies do not enter LLM, queue payloads, ordinary logs, or long-term persistence.
- Classification requires VerifiedProfile and citation-backed LegalRuleMatch.
- Approved indexed LegalCorpusVersion is required for legal matching.
- Real configured LLM/embedding providers are required for A-to-Z acceptance.
- Structured Developer attestation is optional supplemental input only.
- Internal legal corpus operations are not Manager/Developer product UX.

## Internal Acceptance Preconditions

Before a Manager can complete the golden path, internal operations prepare:

```text
validated official source URL
-> legal snapshot + hash
-> normalized legal hierarchy
-> Internal Legal Operator review/approval
-> immutable LegalCorpusVersion APPROVED
-> Vietnamese FTS + pgvector index build
-> corpus available to Legal Matching
```

This is an operational prerequisite, not a customer navigation flow.

## Canonical 18-Step Manager Journey

| Step | User/System Action | Visible Result |
|---:|---|---|
| 1 | User authenticates | Authorized organization workspace |
| 2 | Manager creates assessment | Assessment `CREATED` |
| 3 | Manager completes/submits WizardProfile | Business context and readiness state |
| 4 | Manager connects GitHub App repository | Read-only RepositoryConnection |
| 5 | Manager selects branch/commit | Immutable RepositorySnapshot |
| 6 | Manager starts repository scan | ScanJob requested |
| 7 | Python Worker scans Python/TS/JS and verifies cleanup | TechnicalEvidenceReport or explicit failure |
| 8 | TechnicalProfile Worker normalizes accepted evidence | TechnicalProfile |
| 9 | AIUsageFlow Worker builds evidence-backed claims | AIUsageFlow |
| 10 | Reconciliation compares declared and detected facts | Conflict or VerifiedProfile-ready path |
| 11 | Manager resolves conflict when present | Audited resolution and reconciliation rerun |
| 12 | System creates/Manager reviews VerifiedProfile | VerifiedProfile |
| 13 | Legal Matching performs hybrid retrieval | Citation-backed LegalRuleMatch records |
| 14 | Classification runs through guarded real LLM path | RiskClassification or blocked state |
| 15 | Gap Analysis derives obligations/gaps | GapAnalysis |
| 16 | Manager requests final document | Document job status |
| 17 | System stores artifact; Manager downloads | GeneratedDocument and secure download |
| 18 | Manager reviews/exports audit trail | Audit export with versions/correlation refs |

## Execution Trace

| Step | Transport / Trigger | Handler | Reads | Writes | Message / Output |
|---:|---|---|---|---|---|
| 1 | auth HTTP/OAuth callback | AuthService | user/membership/session | session, AuditEvent | authenticated actor |
| 2 | `POST /api/v1/assessments` | AssessmentService | membership | Assessment, AuditEvent | AssessmentDto |
| 3 | Wizard HTTP | WizardProfileService | Assessment | WizardProfile, AuditEvent | readiness projection |
| 4 | GitHub App HTTP | RepositoryConnectionService | Assessment, installation metadata | RepositoryConnection, AuditEvent | connection DTO |
| 5 | snapshot HTTP | RepositorySnapshotService | connection, GitHub commit metadata | RepositorySnapshot, AuditEvent | snapshot DTO |
| 6 | scan HTTP | ScanJobService | Assessment, snapshot | ScanJob, AuditEvent, OutboxEvent | `command.scan.requested.v1` |
| 7 | RabbitMQ `lcsp.scan-worker.v1` | Python Scanner Worker | job, snapshot | source/graph/evidence/findings/report, audit, outbox | scan completed/failed event |
| 8 | scan-completed projection + worker queue | TechnicalProfileWorker | quality-valid report/findings | TechnicalProfile, audit, outbox | technical-profile completed/failed |
| 9 | technical-profile projection + worker queue | AIUsageFlowWorker | WizardProfile, profile, findings | AIUsageFlow/claims/links, audit, outbox | AIUsageFlow completed/failed |
| 10 | AIUsageFlow projection + worker queue | ReconciliationWorker | WizardProfile, profile, flow | Conflict or VerifiedProfile, audit, outbox | conflict-detected or verified-profile-ready |
| 11 | conflict resolution HTTP | ReconciliationService | conflict/evidence/optional attestation | Manager resolution, audit, outbox | reconciliation command |
| 12 | reconciliation worker/query | ReconciliationWorker | resolved inputs | VerifiedProfile, audit, outbox | verified-profile-ready |
| 13 | legal-matching queue | LegalMatchingWorker + HybridRetriever | VerifiedProfile, approved corpus/index | LegalRuleMatch, RetrievalAuditLog, audit, outbox | legal-matching completed/failed |
| 14 | classification queue | ClassificationWorker + LLM Gateway | profile, legal matches | RiskClassification, ModelRunMetadata, audit, outbox | classification completed/blocked |
| 15 | gap-analysis queue | GapAnalysisWorker | classification, legal matches | GapAnalysis, audit, outbox | gap-analysis completed/blocked/failed |
| 16 | document request HTTP | DocumentRequestService | assessment/gap/classification | GeneratedDocument REQUESTED, audit, outbox | document command |
| 17 | document queue + storage | DocumentWorker | classification, gap, citations, template | artifact, metadata, model run, audit/outbox | generated/blocked event |
| 18 | audit query/export HTTP | AuditQuery/ExportService | AuditEvent/version refs | export metadata/artifact if applicable | audit view/export |

## Scanner Runtime Detail

```text
command.scan.requested.v1
-> Python Worker job lock
-> restricted workspace
-> snapshot materialization
-> file inventory
-> Python ast/libcst analysis
-> Node ts-morph subprocess for TS/JS
-> normalized graph/findings/evidence refs
-> TechnicalEvidenceReport gates
-> workspace delete + verification
-> terminal job + outbox transaction
```

No Node scanner worker consumes the scan command. Completed event is impossible before cleanup verification.

## Queue Choreography

```text
command.scan.requested.v1
-> event.scan.completed.v1
-> command.technical-profile.requested.v1
-> event.technical-profile.completed.v1
-> command.ai-usage-flow.requested.v1
-> event.ai-usage-flow.completed.v1
-> command.reconciliation.requested.v1
-> event.reconciliation.conflict-detected.v1
   or event.reconciliation.verified-profile-ready.v1
-> command.legal-matching.requested.v1
-> event.legal-matching.completed.v1
-> command.classification.requested.v1
-> event.classification.completed.v1 or event.classification.blocked.v1
-> command.gap-analysis.requested.v1
-> event.gap-analysis.completed.v1 / blocked / failed
-> command.document.requested.v1
-> event.document.generated.v1 or event.document.blocked.v1
```

Internal corpus preparation uses separate ingestion/index commands and must finish before legal matching.

## Database Journey

| Stage | Created/Updated Objects |
|---|---|
| Auth | User/session/membership state, AuditEvent |
| Assessment/Wizard | Assessment, WizardProfile, AuditEvent |
| Repository | RepositoryConnection, RepositorySnapshot, AuditEvent |
| Scan request | RepositoryScanJob, OutboxEvent, AuditEvent |
| Python scanner | SourceFile, graph metadata, EvidenceReference, TechnicalFinding, TechnicalEvidenceReport, terminal job, audit/outbox |
| Technical profile | TechnicalProfile, audit/outbox |
| AI usage | AIUsageFlow, AIUsageFlowClaim, evidence links, audit/outbox |
| Reconciliation | ReconciliationConflict or VerifiedProfile, audit/outbox |
| Legal matching | RetrievalAuditLog, LegalRuleMatch, audit/outbox |
| Classification | RiskClassification, ModelRunMetadata, audit/outbox |
| Gap | GapAnalysis, audit/outbox |
| Document | GeneratedDocument, storage ref/hash, ModelRunMetadata, audit/outbox |
| Audit export | export record/artifact metadata where implemented |

## Optional Developer Path

```text
Manager invites Developer
-> Developer accepts scoped task
-> Developer reviews redacted findings
-> Developer submits structured attestation
-> Manager may consider it during conflict review
```

The attestation does not alter scanner evidence, resolve conflict, approve profile, or unlock classification. `FR-052` free-form delegated clarification is Deferred and absent from active runtime.

## Failure Scenarios

| Failure | Runtime Result | UX Result |
|---|---|---|
| auth/permission denied | no state mutation; security audit | safe denial/recovery |
| repository unavailable | ScanJob FAILED | reconnect/retry action |
| parser/dynamic limitation | bounded continuation or insufficient evidence | coverage limitation |
| privacy/schema/redaction failure | fail closed | blocked with correlation ID |
| workspace cleanup failure | terminal scan failure | no downstream; rescan after remediation |
| conflict unresolved | no VerifiedProfile/classification | Manager conflict task |
| corpus unapproved/index unavailable | legal matching blocked | corpus unavailable reason |
| zero citations | no unsupported match | blocked/degraded legal basis |
| LLM unavailable/invalid schema | bounded retry then fail closed | actionable classification/document failure |
| document guardrail failure | no artifact publication | document blocked reason |
| duplicate message | idempotent no-op/resume | no duplicate visible artifact |

## UX State Requirements

Every asynchronous stage has:

- not started;
- queued/loading/running;
- completed;
- empty/insufficient;
- blocked;
- failed;
- retry/rerun action where safe;
- correlation/audit reference;
- plain-language explanation.

## Completion Condition

A successful acceptance record includes assessment, repository commit, scanner/ruleset/report versions, verified profile, corpus version, retrieval audit, LLM/embedding provider/model metadata, classification, gap analysis, document hash/storage ref, and audit export.

## Planning Status

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```