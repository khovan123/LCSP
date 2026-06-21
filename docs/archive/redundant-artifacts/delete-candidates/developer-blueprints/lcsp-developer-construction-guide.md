# LCSP Developer Construction Guide

## Purpose

This guide converts the existing LCSP architecture, contracts, implementation artifacts and developer blueprints into a construction-ready plan for senior engineers.

It does not create a new PRD, rewrite the architecture, claim validation completion, claim formal legal reliability, claim production readiness, claim runtime scanner accuracy or claim A2-b2 completion.

Canonical source priority used:

1. `docs/specs/implementation-contract.md`
2. `docs/architecture/architecture-decision-records.md`
3. `docs/architecture/architecture.md`
4. `docs/implementation/system-runtime-and-component-contracts.md`
5. `docs/implementation/repository-and-module-layout.md`
6. `docs/developer-blueprints/*`
7. `docs/specs/*`
8. `docs/qa/*`

## Readiness Summary

| Subsystem | Readiness | Main Blockers | Recommendation |
|---|---|---|---|
| Scanner Service | Conditionally ready for controlled prototype | Runtime scanner accuracy is not validated; Python semantic analysis is deferred by current prototype docs | Build static, fixture-driven TypeScript scanner first; keep A2-b2 as post-implementation acceptance |
| Reconciliation Service | Ready for controlled prototype | Final conflict UX and resolution reason taxonomy need implementation detail | Implement deterministic comparison and Manager-only conflict resolution first |
| Classification Service | Conditionally ready | Formal legal reliability and final rule corpus validation are incomplete | Build blocking workflow shell with citation guardrail; do not claim legal reliability |
| Gap Analysis Service | Ready as shell | Obligation/prioritization formula needs owner-approved thresholds | Implement deterministic shell driven by classification and citation refs |
| Document Service | Ready as shell | Production legal output is not authorized | Generate prototype-only documents with warnings and citation appendix |
| Legal Monitor Service | Not ready for MVP implementation | Legal monitoring crawler is explicitly deferred in current controlled MVP scope | Keep out of controlled MVP backlog unless architecture/scope is amended |

## Section 1 - Implementation Readiness Review

### Cross-Cutting Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Runtime conflict between requested Python/LangGraph worker and current TypeScript-first prototype docs | High | Engineers may build two worker stacks or violate ADR/prototype docs | Use TypeScript-first worker for controlled MVP unless ADR is amended; keep Python/LangGraph as future adapter decision |
| Physical Prisma schema is not yet authored | High | Developers need concrete migrations before persistence work | Implement Prisma schema from `docs/specs/data-model-draft.md` and `docs/developer-blueprints/04-database-migration-plan.md` in Sprint 1 |
| OpenAPI source is not generated yet | Medium | Contract testing cannot bind to executable API contract | Use NestJS decorators as source and generate OpenAPI during API implementation |
| Object storage bucket and path conventions are only prototype-defaulted | Medium | Document output storage may drift | Adopt MinIO/S3-compatible keys: `documents/{assessmentId}/{documentId}/{version}` |
| Legal rule corpus hashes and formal reviewer validation are incomplete | High | Classification cannot be presented as formal legal reliability | Build rule/citation traceability, but label outputs internal/prototype until A2 passes |
| Legal Monitor Service lacks active MVP scope | High | Building it now would exceed controlled MVP authorization | Create no Monitor implementation story until scope reopened |

### Scanner Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Exact normalized scanner finding enum list is incomplete | High | AIUsageFlow mapping and tests may diverge | Define `FindingType` in `packages/contracts/src/scanner/finding-types.ts`: `AI_SDK_DEPENDENCY`, `AI_INVOCATION`, `AI_INPUT_SOURCE`, `AI_OUTPUT_USE`, `DOWNSTREAM_ACTION`, `HUMAN_REVIEW_SIGNAL`, `COVERAGE_LIMITATION`, `SECRET_REDACTED` |
| Repository size/file limits are not numeric | Medium | Scanner may run unbounded locally | Add prototype defaults: max 5,000 files, max 200 MB checkout, max 2 MB per parsed file, overridable by config |
| Sidecar protocol for TypeScript semantic analysis is not executable | Medium | TS semantic layer can drift from scanner worker | Define JSON request/response schema in contracts before implementation |
| A2-b2 runtime scanner accuracy is not available | High | Scanner cannot be marketed as validated | Keep explicit non-claim and run empirical acceptance only after scanner exists |

### Reconciliation Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Conflict severity score formula is not finalized | Medium | UI prioritization can vary | Prototype default: material workflow fields are High, explanation-only mismatches are Medium, wording mismatches Low |
| Conflict resolution reason enum is incomplete | Medium | Audit records may be inconsistent | Use `CONFIRM_WIZARD`, `CONFIRM_TECHNICAL_EVIDENCE`, `UPDATE_BUSINESS_DECLARATION`, `MARK_UNCLEAR`, `REQUEST_RESCAN` |
| VerifiedProfile invalidation rules need implementation detail | High | Classification may run on stale profile | Invalidate VerifiedProfile when WizardProfile, TechnicalEvidenceReport, AIUsageFlow or ConflictResolution version changes |

### Classification Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Legal corpus and Decree mapping are not implementation-complete | High | Legal rule matching may be incomplete | Build corpus version model and citation guardrail first; block final output on missing citation |
| Risk scoring thresholds are not owner-approved | Medium | Risk labels may be disputed | Use deterministic provisional score only in prototype; require legal-rule citations for final classification |
| Confidence formula is not canonical | Medium | Outputs may overstate certainty | Use min confidence across material claims and citations; downgrade/block when uncertainty exists |

### Gap Analysis Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Compliance score formula is not canonical | Medium | Gap ranking can be inconsistent | Prototype formula: obligation coverage 50%, evidence coverage 30%, remediation criticality 20% |
| Obligation taxonomy is incomplete | Medium | Generated gaps may be too generic | Start with citation-linked obligations from `LegalRule` and `RiskClassificationResult` only |

### Document Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Template version registry is not defined | Medium | Regeneration may not be reproducible | Add `DocumentTemplateVersion` or template metadata JSON with `templateId`, `version`, `hash` |
| PDF renderer choice is not canonical | Low | Team may pick inconsistent library | Prototype default: server-side HTML template to PDF through a single adapter; do not hardcode renderer into domain |
| Output guardrail field list is incomplete | High | Documents may omit warnings or citations | Require VerifiedProfile, classification, gap analysis, citation coverage and prototype warning before generation |

### Legal Monitor Service Gaps

| Missing Item | Severity | Impact | Recommendation |
|---|---|---|---|
| Legal monitoring is deferred in current MVP scope | High | Implementation would exceed authorization | Do not build in controlled MVP; define future architecture only |
| Source authority and diff policy are absent | High | Monitor could ingest unauthoritative legal changes | Future decision must define source registry, retrieval schedule, hash, reviewer approval and alert policy |
| Event/API contracts are absent | Medium | No safe worker contract exists | Keep proposed contracts in this guide as future scope, not current sprint work |

## Section 2 - System Responsibilities

| Subsystem | Business Purpose | Inputs | Outputs | Dependencies | External Integrations |
|---|---|---|---|---|---|
| Scanner Service | Produce static technical evidence from a commit-pinned repository snapshot | `assessmentId`, `repositoryConnectionId`, `commitSha`, `rulesetVersion` | `TechnicalEvidenceReport`, `TechnicalFinding`, `EvidenceReference`, coverage limitations | GitHub App connection, repository snapshot, RabbitMQ, PostgreSQL | GitHub App API only |
| Reconciliation Service | Compare declared WizardProfile with TechnicalProfile and AIUsageFlow | `WizardProfile`, `TechnicalProfile`, `AIUsageFlow` | `ConflictRecord`, `ConflictResolution`, `VerifiedProfile` | Evidence gates, AIUsageFlow, Manager auth, Audit | None |
| Classification Service | Produce blocked or citation-backed risk classification | `VerifiedProfile`, `AIUsageFlow`, `LegalRuleMatch[]` | `RiskClassificationResult` or `CLASSIFICATION_BLOCKED` | Legal RAG, citation guardrail, reconciliation | ChromaDB/local legal corpus |
| Gap Analysis Service | Convert classification into prioritized compliance obligations | `RiskClassificationResult`, `LegalCitation[]` | `GapAnalysisResult` | Classification, legal citations | None |
| Document Service | Generate prototype-only report artifacts | `VerifiedProfile`, `RiskClassificationResult`, `GapAnalysisResult`, citations | `ComplianceDocument`, `GeneratedDocumentFile` | Object storage, citation guardrail, output guardrail | MinIO/S3-compatible storage |
| Legal Monitor Service | Future legal update monitoring and corpus change alerts | Legal source registry, previous corpus version | Diff summary, review task, corpus update candidate | Legal corpus governance | Future official source retrieval |

## Section 3 - Database Design

### Core Tables

| Table | Relationships | Indexes | Constraints |
|---|---|---|---|
| `users` | one-to-many `oauth_identities`, `sessions`, `assessment_members` | unique `email`; index `organization_id` | UUIDv7 PK; PII protected |
| `organizations` | one-to-many `assessments`, `users` | index `status` | tenant boundary |
| `assessments` | many profiles/evidence/results/audit | index `organization_id,status,current_state` | Manager-owned aggregate root |
| `wizard_profiles` | belongs to assessment | unique `(assessment_id, version)` | immutable submitted versions |
| `github_repository_connections` | belongs to assessment/org | unique `(organization_id, github_repository_id)` | no raw GitHub token persisted |
| `repository_snapshots` | belongs to connection/assessment | unique `(repository_connection_id, commit_sha)` | commit SHA required |
| `repository_scan_jobs` | belongs to assessment/snapshot | unique `idempotency_key`; index `status` | command payload refs only |
| `technical_evidence_reports` | belongs to scan job/assessment | unique `report_hash`; index `assessment_id` | `source_type = GITHUB_REPOSITORY_SCAN` |
| `technical_findings` | belongs to report | index `finding_type, confidence` | evidence ref required |
| `evidence_references` | belongs to report/finding | index `assessment_id, evidence_type` | redacted metadata only |
| `technical_profiles` | belongs to report | unique `report_id` | no legal conclusions |
| `ai_usage_flows` | belongs to assessment/report/profile | index `assessment_id, status` | material claims require evidence refs |
| `ai_usage_flow_claims` | belongs to AIUsageFlow | index `claim_type, confidence` | claim with no evidence is ineligible for legal matching |
| `conflict_records` | belongs to assessment/AIUsageFlow | index `status,severity` | unresolved material conflict blocks classification |
| `conflict_resolutions` | belongs to conflict | index `actor_id, created_at` | Manager final resolution only |
| `verified_profiles` | belongs to assessment | unique `(assessment_id, version)` | approved only when conflicts resolved |
| `legal_document_versions` | has legal rules | unique `(source, version)` | hash and effective date required |
| `legal_rules` | belongs to legal document version | unique `rule_id`; GIN/search index for metadata | rule mapping is versioned |
| `legal_citations` | belongs to rule | index `legal_source, section_ref` | required for legal conclusion |
| `classification_runs` | belongs to verified profile | index `status, created_at` | blocked state preserved |
| `risk_classification_results` | belongs to classification run | index `risk_level` | citation refs required |
| `gap_analysis_results` | belongs to classification | index `assessment_id` | no Wizard-only generation |
| `compliance_documents` | belongs to assessment | index `status, document_type` | prototype warning required |
| `generated_document_files` | belongs to document | unique `content_hash` | object storage ref only |
| `audit_events` | belongs to assessment/user | index `assessment_id,event_type,timestamp`; index `correlation_id` | append-only |
| `legal_monitor_runs` | future | index `status, source_id` | deferred scope |

### Prisma Model Recommendations

- Use native PostgreSQL `uuid` for all LCSP internal IDs.
- Use `Json` only for versioned snapshots where the schema is also represented by DTO/Pydantic/Zod contracts.
- Add `createdAt`, `updatedAt` to mutable workflow state tables.
- Add `createdAt` only to immutable evidence/audit versions; do not update immutable records.
- Add optimistic version fields to `WizardProfile`, `AIUsageFlow`, `VerifiedProfile`, `LegalDocumentVersion`, `ComplianceDocument`.

### Migration Strategy

1. Foundation: user, org, assessment, membership, audit, outbox.
2. Auth/GitHub: OAuth identity, session, repository connection, snapshot.
3. Scan/evidence: scan job, evidence report, findings, evidence refs, gate results.
4. AIUsageFlow/reconciliation: technical profile, AIUsageFlow, claims, conflicts, resolutions, VerifiedProfile.
5. Legal/classification: legal corpus, rules, citations, classification runs/results.
6. Gap/document: gap results, document metadata, generated files.
7. Future: legal monitor tables after scope amendment.

## Section 4 - API Contracts

All endpoints use:

- Prefix: `/api/v1`
- Auth: `JwtAuthGuard` after login except public OAuth callback/start.
- Scope: `OrganizationMembershipGuard`, `PermissionGuard`, `StateTransitionGuard`.
- Headers: `Authorization`, `x-correlation-id`, optional `Idempotency-Key`.
- Error DTO:

```json
{
  "code": "GATE_PRECONDITION_FAILED",
  "message": "VerifiedProfile is required before classification.",
  "correlationId": "uuidv7",
  "details": []
}
```

### Scanner Service Endpoints

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/assessments/:assessmentId/github/repository-connections` | POST | `ConnectRepositoryDto { githubInstallationId, githubRepositoryId }` | `RepositoryConnectionDto` | Manager; valid UUIDv7 assessment; GitHub App installation authorized | 403 `PERMISSION_DENIED`, 422 `GITHUB_REPOSITORY_AUTHORIZATION_FAILED` |
| `/assessments/:assessmentId/github/repository-snapshots` | POST | `CreateRepositorySnapshotDto { repositoryConnectionId, branchName, commitSha? }` | `RepositorySnapshotDto` | commit must resolve to authorized repo | 422 `GITHUB_COMMIT_RESOLUTION_FAILED` |
| `/assessments/:assessmentId/scans` | POST | `StartScanDto { repositorySnapshotId, rulesetVersion }` | `RepositoryScanJobDto` | Manager; snapshot exists; idempotency key accepted | 409 `SCAN_ALREADY_RUNNING`, 422 `GATE_PRECONDITION_FAILED` |
| `/assessments/:assessmentId/scans/:scanJobId` | GET | path only | `RepositoryScanStatusDto` | assessment scope | 404 `RESOURCE_NOT_FOUND` |
| `/assessments/:assessmentId/technical-evidence-reports/:reportId` | GET | path only | `TechnicalEvidenceReportDto` | metadata only; no raw source | 403, 404 |

### Reconciliation Service Endpoints

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/assessments/:assessmentId/ai-usage-flow` | POST | `BuildAIUsageFlowDto { technicalEvidenceReportId }` | `WorkflowJobAcceptedDto` | report passed schema/quality gate | 422 `EVIDENCE_QUALITY_INSUFFICIENT` |
| `/assessments/:assessmentId/reconciliation` | POST | `RunReconciliationDto { aiUsageFlowId }` | `WorkflowJobAcceptedDto` | WizardProfile and AIUsageFlow exist | 422 `AI_USAGE_FLOW_REQUIRED` |
| `/assessments/:assessmentId/reconciliation/conflicts` | GET | query `status?` | `ConflictListDto` | Manager scope | 403, 404 |
| `/assessments/:assessmentId/reconciliation/conflicts/:conflictId/resolution` | POST | `ResolveConflictDto { resolutionType, rationale, evidenceRefs[] }` | `ConflictResolutionDto` | Manager only; cannot mutate scanner evidence | 422 `SCANNER_EVIDENCE_IMMUTABLE` |
| `/assessments/:assessmentId/verified-profile` | GET | path only | `VerifiedProfileDto` | all conflicts resolved | 409 `VERIFIED_PROFILE_NOT_READY` |

### Classification Service Endpoints

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/assessments/:assessmentId/classification` | POST | `RequestClassificationDto { verifiedProfileId }` | `WorkflowJobAcceptedDto` | VerifiedProfile approved; no unresolved conflict | 422 `VERIFIED_PROFILE_REQUIRED`, `UNRESOLVED_CONFLICT` |
| `/assessments/:assessmentId/classification/:classificationId` | GET | path only | `RiskClassificationResultDto` | Manager scope | 404 |
| `/assessments/:assessmentId/classification/:classificationId/rule-trace` | GET | path only | `RuleTraceDto` | citation refs required | 422 `CITATION_REQUIRED` |

### Gap Analysis Service Endpoints

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/assessments/:assessmentId/gap-analysis` | POST | `RequestGapAnalysisDto { classificationId }` | `WorkflowJobAcceptedDto` | classification completed and not blocked | 422 `CLASSIFICATION_REQUIRED` |
| `/assessments/:assessmentId/gap-analysis/:gapAnalysisId` | GET | path only | `GapAnalysisResultDto` | Manager scope | 404 |

### Document Service Endpoints

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/assessments/:assessmentId/documents` | POST | `RequestDocumentGenerationDto { classificationId, gapAnalysisId, documentType, templateVersion }` | `WorkflowJobAcceptedDto` | VerifiedProfile, valid classification, gap analysis, citations | 422 `DOCUMENT_GENERATION_BLOCKED` |
| `/assessments/:assessmentId/documents/:documentId` | GET | path only | `ComplianceDocumentDto` | Manager scope | 404 |
| `/assessments/:assessmentId/documents/:documentId/download` | GET | path only | signed object ref or stream | document generated; prototype warning retained | 409 `DOCUMENT_NOT_READY` |

### Legal Monitor Service Endpoints - Deferred

| URL | Method | Request DTO | Response DTO | Validation Rules | Errors |
|---|---|---|---|---|---|
| `/legal-monitor/runs` | POST | `StartLegalMonitorRunDto { sourceRegistryVersion }` | `MonitorRunDto` | Future scope only; admin/system | 403 `FEATURE_NOT_ENABLED` |
| `/legal-monitor/runs/:runId` | GET | path only | `MonitorRunDto` | Future scope only | 403 `FEATURE_NOT_ENABLED` |

## Section 5 - RabbitMQ Contracts

### Topology

- Command exchange: `lcsp.commands.v1`
- Event exchange: `lcsp.events.v1`
- Dead-letter exchange: `lcsp.deadletter.v1`
- Retry: maximum 3 attempts, exponential backoff, DLQ on retry exhaustion.
- Non-retryable validation/auth/invariant failures are acknowledged, persisted as blocked state and audited.

### Event Envelope

```json
{
  "eventId": "uuidv7",
  "eventType": "command.scan.requested.v1",
  "schemaVersion": 1,
  "occurredAt": "2026-06-20T00:00:00.000Z",
  "correlationId": "uuidv7",
  "causationId": "uuidv7",
  "aggregateType": "Assessment",
  "aggregateId": "uuidv7",
  "producer": "apps/api",
  "payload": {}
}
```

### Commands and Events

| Event Name | Producer | Consumer | Payload Schema | Retry Strategy | DLQ |
|---|---|---|---|---|---|
| `command.scan.requested.v1` | API ScanService | Scanner worker | `{ scanJobId, assessmentId, repositorySnapshotId, commitSha, scannerVersion, rulesetVersion }` | retry clone/transient parser failures; not auth/limit failures | `lcsp.scan-worker.dlq.v1` |
| `event.scan.completed.v1` | Scanner worker | Evidence projector/API | `{ scanJobId, reportId, reportHash, findingCount, coverageSummary }` | retry DB projection | DLQ if projection fails |
| `event.scan.failed.v1` | Scanner worker | API/status projector | `{ scanJobId, failureCode, retryable, coverageLimitations }` | no retry after final failure | none |
| `command.ai-usage-flow.requested.v1` | API/Evidence service | AIUsageFlow worker | `{ assessmentId, technicalEvidenceReportId, technicalProfileId }` | retry transient DB/worker errors | `lcsp.ai-usage-flow-worker.dlq.v1` |
| `event.ai-usage-flow.completed.v1` | AIUsageFlow worker | Reconciliation trigger | `{ assessmentId, aiUsageFlowId, claimCount, uncertaintyCount }` | retry projection | DLQ |
| `command.reconciliation.requested.v1` | API/worker | Reconciliation worker | `{ assessmentId, wizardProfileId, technicalProfileId, aiUsageFlowId }` | retry transient DB errors | `lcsp.reconciliation-worker.dlq.v1` |
| `event.reconciliation.conflict-detected.v1` | Reconciliation worker | API/UI projector | `{ assessmentId, conflictIds, materialBlocker }` | retry projection | DLQ |
| `event.reconciliation.verified-profile-created.v1` | Reconciliation worker | Classification readiness projector | `{ assessmentId, verifiedProfileId, version }` | retry projection | DLQ |
| `command.classification.requested.v1` | API ClassificationService | Classification worker | `{ assessmentId, verifiedProfileId, legalCorpusVersion }` | retry legal retrieval transient failures | `lcsp.classification-worker.dlq.v1` |
| `event.classification.completed.v1` | Classification worker | Gap readiness projector | `{ assessmentId, classificationId, riskLevel, citationRefs }` | retry projection | DLQ |
| `event.classification.blocked.v1` | Classification worker | API/UI projector | `{ assessmentId, reasonCode, missingRefs }` | no retry for invariant block | none |
| `command.gap-analysis.requested.v1` | API GapAnalysisService | Gap worker | `{ assessmentId, classificationId }` | retry transient DB errors | `lcsp.gap-analysis-worker.dlq.v1` |
| `event.gap-analysis.completed.v1` | Gap worker | Document readiness projector | `{ assessmentId, gapAnalysisId, gapCount }` | retry projection | DLQ |
| `command.document.requested.v1` | API DocumentService | Document worker | `{ assessmentId, classificationId, gapAnalysisId, documentType, templateVersion }` | retry object storage/render transient failures | `lcsp.document-worker.dlq.v1` |
| `event.document.generated.v1` | Document worker | API/UI projector | `{ assessmentId, documentId, fileId, contentHash }` | retry projection | DLQ |
| `command.legal-monitor.requested.v1` | Future admin/API | Future monitor worker | `{ monitorRunId, sourceRegistryVersion }` | future | future |

## Section 6 - Application Structure

Use npm workspaces only.

```text
apps/
  web/
    src/app/(app)/assessments/
    src/features/scanner/
    src/features/reconciliation/
    src/features/classification/
    src/features/gap-analysis/
    src/features/documents/
  api/
    src/main.ts
    src/common/guards/
    src/common/interceptors/
    src/common/errors/
    src/modules/auth/
    src/modules/assessment/
    src/modules/github/
    src/modules/scanner/
      scanner.module.ts
      controllers/scan.controller.ts
      services/scan.service.ts
      repositories/scan.repository.ts
      dtos/start-scan.dto.ts
      events/scan.events.ts
    src/modules/reconciliation/
    src/modules/classification/
    src/modules/gap-analysis/
    src/modules/document/
    src/modules/legal-corpus/
    src/modules/audit/
    src/modules/outbox/
  worker/
    src/main.ts
    src/queues/rabbitmq.consumer.ts
    src/handlers/scan/
    src/handlers/ai-usage-flow/
    src/handlers/reconciliation/
    src/handlers/classification/
    src/handlers/gap-analysis/
    src/handlers/document/
    src/handlers/legal-monitor/        # deferred
packages/
  contracts/src/
    ids/
    events/
    scanner/
    reconciliation/
    classification/
    gap-analysis/
    document/
  scanner/src/
    snapshot/
    detectors/
    parsers/
    graph/
    findings/
    redaction/
  ai-usage-flow/src/
  reconciliation/src/
  legal-rag/src/
  audit/src/
  config/src/
  logger/src/
prisma/
  schema.prisma
  migrations/
legal-corpus/
  sources/
  rules/
generated-artifacts/
  documents/
```

## Section 7 - Core Algorithms

### Scanner - Static Evidence Pipeline

```text
1. Load scan job by scanJobId.
2. Verify assessment and repository snapshot are active.
3. Mint GitHub App installation token in memory only.
4. Create temporary isolated workspace.
5. Fetch selected commit SHA only.
6. Apply file count, size, ignore and language support policies.
7. Parse dependency manifests and config files.
8. Detect AI SDK dependencies.
9. Parse TS/JS/Python syntax with static parser.
10. Run TS semantic pass only where supported by prototype.
11. Detect invocation, input source, output use, downstream action and human-review signals.
12. Build bounded evidence graph node/edge/path metadata.
13. Redact secret-like values.
14. Persist TechnicalEvidenceReport, findings and evidence refs.
15. Delete temporary workspace and audit cleanup.
16. Publish scan completed or failed event.
```

Detection rules:

- `SDK_DEPENDENCY_ONLY` -> finding only; no legal risk.
- `MODEL_INVOCATION + OUTPUT_USED_IN_IF + STATUS_UPDATE` -> automated decision candidate.
- `MODEL_INVOCATION + SEND_TO_MANAGER_REVIEW` -> human review present candidate.
- Unsupported dynamic config -> coverage limitation and abstention.

### Reconciliation - Conflict Detection

```text
for each material field in [ai_purpose, downstream_action, human_review, automation_level, affected_subjects]:
  wizard_value = WizardProfile[field]
  technical_value = AIUsageFlow[field]
  if technical_value is UNKNOWN or UNCLEAR:
    create informational or blocking uncertainty record
  else if values materially conflict:
    create ConflictRecord(status=OPEN, severity=HIGH when classification-affecting)
if no open material conflicts:
  create VerifiedProfileCandidate
else:
  set assessment state = MANAGER_CONFLICT_RESOLUTION_REQUIRED
```

Manager resolution cannot edit original scanner evidence. It creates `ConflictResolution` and triggers reconciliation rerun.

### Classification - Rule and Confidence

```text
1. Require approved VerifiedProfile.
2. Reject if unresolved material conflict exists.
3. Reject if any material AIUsageFlow claim lacks evidence_refs.
4. Retrieve legal rule candidates by business process, AI purpose, affected subjects, automation level and harm category.
5. Require citation coverage for each legal conclusion.
6. Evaluate deterministic rule predicates.
7. Compute confidence = min(claim_confidence, retrieval_confidence, citation_coverage_confidence).
8. If confidence below threshold or citation missing, emit CLASSIFICATION_BLOCKED.
9. Persist RiskClassificationResult with rule_refs and citation_refs.
```

Provider/model/framework presence alone is never a risk classification input.

### Gap Analysis - Compliance Score and Priority

Prototype formula:

```text
coverage_score = satisfied_obligations / total_applicable_obligations
evidence_score = obligations_with_evidence_refs / total_applicable_obligations
criticality_score = 1 - normalized_open_high_priority_gaps
compliance_score = (coverage_score * 0.50) + (evidence_score * 0.30) + (criticality_score * 0.20)
priority = legal_severity_weight + missing_evidence_weight + operational_effort_weight
```

If classification is blocked, gap analysis is blocked.

### Document - Generation Pipeline

```text
1. Require VerifiedProfile, completed classification, gap analysis and citation coverage.
2. Load template metadata by documentType/templateVersion.
3. Map profile, classification, gap and citation data to template view model.
4. Add prototype limitation warning.
5. Render HTML.
6. Convert to PDF or store HTML through renderer adapter.
7. Calculate content hash.
8. Store in MinIO/S3-compatible object storage.
9. Persist ComplianceDocument and GeneratedDocumentFile.
10. Publish document generated event.
```

### Legal Monitor - Future Diff Engine

```text
1. Load approved source registry.
2. Fetch source metadata and content.
3. Hash normalized content.
4. Compare against previous LegalDocumentVersion hash.
5. If changed, create LegalMonitorChangeSet.
6. Require reviewer approval before LegalRule extraction.
7. Never auto-promote legal corpus without human review.
```

This is future scope and must not be implemented in controlled MVP without scope approval.

## Section 8 - Security

| Concern | Requirement |
|---|---|
| Authentication | OAuth/OIDC login with backend-verifiable session; validate state, nonce, issuer, audience, expiry, redirect URI and PKCE where applicable |
| Authorization | Deny-by-default RBAC through `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard`, `StateTransitionGuard` |
| RBAC | Manager can complete MVP alone; Developer cannot block or finalize MVP transitions |
| Encryption | DB at-rest through PostgreSQL environment; MFA secrets encrypted/reference-only; object storage private |
| Audit logging | Append-only `AuditEvent`; metadata only; correlation ID required |
| Secrets management | `.env` placeholders locally; no secret in logs, audit, queue, prompt, evidence or document output |
| Source privacy | Raw source exists only in temporary scanner workspace; no raw source to LLM or long-term persistence |
| LLM boundary | LLM Gateway accepts sanitized structured metadata only |
| Queue safety | Payload refs only; no GitHub token, raw source, secret or prompt |

## Section 9 - Test Strategy

Use risk-based depth: unit for algorithms, integration for DB/API/queue boundaries, contract tests for DTO/event compatibility, E2E only for Manager golden path.

| Service | Unit Tests | Integration Tests | Contract Tests | E2E Tests |
|---|---|---|---|---|
| Scanner | detector functions, redaction, coverage limitation, evidence graph builder | scan job -> report persistence with synthetic fixture | `command.scan.requested.v1`, `TechnicalEvidenceReportDto` | Manager requests scan and sees completed/blocked status |
| Reconciliation | field comparison, conflict severity, VerifiedProfile invalidation | Wizard + AIUsageFlow -> conflicts/resolution/Profile | conflict and resolution DTOs/events | Manager resolves conflict; classification remains blocked until resolved |
| Classification | rule predicate, confidence, citation guardrail | VerifiedProfile + legal rules -> result/block | classification command/result/error DTOs | classification blocked when citation missing |
| Gap Analysis | score formula and priority ranking | classification -> gap result | gap request/result DTOs | Manager sees gap list after valid classification |
| Document | template mapping, output guardrail | document job -> object metadata | document command/result DTOs | document generation blocked on unresolved conflict/missing citation |
| Legal Monitor | diff normalization future tests | future source registry test | future monitor event contract | none in MVP |

Required fixture families:

- Internal summarization.
- Customer chatbot without material decision.
- Loan approval/credit scoring.
- HR screening/ranking.
- Human-reviewed loan.
- Automated approval/rejection.
- Dynamic runtime prompt.
- Provider SDK only.
- Wizard/source conflict.
- Missing citation.

## Section 10 - Acceptance Criteria

### Scanner Service

- Given a Manager selected a repository snapshot, when scan is requested, then API creates `RepositoryScanJob` and publishes `command.scan.requested.v1`.
- Given a scan runs on unsupported/dynamic source, when evidence is persisted, then the report includes coverage limitation and no unsupported certainty.
- Given provider SDK is detected without invocation, when AIUsageFlow is built, then no high-impact or legal-risk conclusion is inferred.
- Given secret-like content is detected, when findings are persisted, then redacted output is stored and audit metadata contains no secret.

### Reconciliation Service

- Given WizardProfile says assistive use and AIUsageFlow shows automatic approve/reject, when reconciliation runs, then a material conflict is created.
- Given conflict is unresolved, when classification is requested, then request is blocked.
- Given Manager resolves conflict, when reconciliation reruns, then original scanner evidence remains immutable and a separate resolution is audited.

### Classification Service

- Given VerifiedProfile is absent, when classification is requested, then API returns 422 `VERIFIED_PROFILE_REQUIRED`.
- Given material claim lacks evidence refs, when legal matching runs, then claim is ineligible and classification is blocked/degraded.
- Given legal citation is missing, when classification tries to produce final result, then citation guardrail blocks output.

### Gap Analysis Service

- Given classification is completed with citation refs, when gap analysis runs, then gaps are ranked with obligation, citation and evidence basis.
- Given classification is blocked, when gap analysis is requested, then request returns 422 `CLASSIFICATION_REQUIRED`.

### Document Service

- Given VerifiedProfile, classification, gap analysis and citations exist, when document generation runs, then document metadata and file ref are persisted with prototype warning.
- Given unresolved conflict or missing citation exists, when document generation is requested, then output is blocked.

### Legal Monitor Service

- Given legal monitor feature is disabled, when monitor run is requested, then API returns 403 `FEATURE_NOT_ENABLED`.
- Given future legal source changes are detected, when monitor runs after scope approval, then changes require reviewer approval before corpus promotion.

## Section 11 - Development Plan

### Sprint 1 - Foundation, Auth, DB and Contracts

Deliverables:

- npm workspace runtime, shared contracts, UUIDv7, logger, config.
- Prisma schema baseline and migrations through audit/outbox.
- OAuth/OIDC session boundary and Manager super-role guards.
- RabbitMQ exchanges/queues/outbox publisher.

Dependencies:

- Current developer blueprints 00-15.

Risks:

- Stack conflict around Python/LangGraph vs TypeScript-first worker. Resolve before worker implementation.

### Sprint 2 - GitHub, Scanner and Evidence

Deliverables:

- GitHub App connection and repository snapshot metadata.
- Scan job lifecycle and idempotency.
- Static scanner prototype with synthetic fixtures.
- TechnicalEvidenceReport, findings, evidence refs, schema/quality gate shells.

Dependencies:

- Sprint 1 auth, DB, queue.

Risks:

- Scanner accuracy must remain non-claimed until A2-b2.

### Sprint 3 - AIUsageFlow, Reconciliation and VerifiedProfile

Deliverables:

- AIUsageFlow claim builder with evidence refs and uncertainty.
- Human review and automation mapping.
- Reconciliation engine, Manager conflict workspace, VerifiedProfile builder.
- Immutable audit flow.

Dependencies:

- Sprint 2 evidence and profile outputs.

Risks:

- Conflict severity and reason taxonomy must stay deterministic.

### Sprint 4 - Legal, Classification, Gap and Document Shells

Deliverables:

- Legal corpus metadata ingestion and Chroma retrieval boundary.
- Citation guardrail.
- Risk classification shell with blocked states.
- Gap analysis shell.
- Document generation shell with MinIO object refs and prototype warning.

Dependencies:

- Sprint 3 VerifiedProfile.

Risks:

- Formal legal reliability validation remains incomplete; all legal outputs must stay prototype/internal unless A2 passes.

## Implementation Start Checklist

- `npm install` works with npm workspaces and `package-lock.json`.
- PostgreSQL, RabbitMQ, ChromaDB and MinIO local services are available by approved local method.
- `.env.example` contains placeholders only.
- `npm run db:generate`, `npm run db:migrate`, `npm run db:seed` are implemented before service features.
- `GET /api/v1/health` returns `{ "status": "ok" }`.
- Every material write emits `AuditEvent`.
- Every async command uses outbox + RabbitMQ envelope.
- No queue, audit record, log, LLM request or document stores raw source, secrets, full prompts or full AST bodies.
