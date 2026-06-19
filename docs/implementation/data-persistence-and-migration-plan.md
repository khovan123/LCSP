# Data Persistence and Migration Plan

## Purpose

Define design-level persistence ownership, entity lifecycle, constraints, indexing, retention and migration sequencing. This document does not define Prisma schema or database code.

## Scope

PostgreSQL is the authoritative store for LCSP domain state, workflow metadata, evidence metadata, graph metadata, results and audit metadata. Object Storage stores generated documents and allowed non-source artifacts.

## Dependencies / Source References

- [Data Model Draft](../specs/data-model-draft.md)
- [Domain Model](../specs/domain-model.md)
- [Repository and Module Layout](repository-and-module-layout.md)

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
| GitHubRepositoryConnection | API | installation_ref, repo_ref, selected repo | scoped to org/assessment | revocable | external repo metadata |
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
| ClassificationRun | Worker | run_id, profile_id, corpus version | VerifiedProfile required | immutable run | model metadata refs |
| RiskClassificationResult | Worker | result_id, risk, citations | citation guardrail | immutable result | risk rationale |
| GapAnalysisResult | Worker | gap_id, classification_id | valid classification required | immutable result | gap rationale |
| ComplianceDocument | Worker/API | document_id, template version | final gate pass | versioned | report contents |
| GeneratedDocumentFile | Worker/API | storage_ref, hash | object exists | retention policy | generated artifact |
| WorkflowRun | Worker/API | run_id, assessment_id, state | state machine constraints | retain workflow trace | state metadata |
| ModelRunMetadata | LLM Gateway | node, provider, model, prompt_version | no raw prompt/source | retain metadata | provider/model refs |
| AuditEvent | API/Worker | event_id, actor, action, correlation_id | append-oriented | retention/export policy | redacted context |
| PermissionGrant | API Post-MVP | grant_id, scope, permission_code | scoped/revocable | audit grant/revoke | grantee/grantor refs |

## Indexing Strategy

Prioritize indexes on organization/assessment scope, workflow state, job status, report hash, scan id, conflict status, VerifiedProfile version, classification run id, audit correlation id and repository commit SHA.

## Tenant Isolation

Every assessment-scoped entity must be queryable through organization/assessment boundaries. API authorization must verify tenant boundary before returning evidence, findings, AIUsageFlow, documents or audit events.

## Snapshot and Version Policy

WizardProfile, TechnicalEvidenceReport, TechnicalProfile, AIUsageFlow, VerifiedProfile, ClassificationRun, GapAnalysisResult and ComplianceDocument are versioned or immutable snapshots. New evidence invalidates dependent downstream snapshots.

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

Use transactions for state transition + audit event, conflict resolution + workflow resume signal and document metadata + storage ref registration. Queue publishing should use outbox or equivalent durable handoff.

## Security and Privacy Considerations

Sensitive values must be encrypted or hashed where applicable. Do not persist raw source, full prompt, full AST, secret or raw provider token.

## Audit Requirements

All critical writes must include correlation id, actor, role, workflow run id and before/after state where safe.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Physical graph metadata schema | Logical node/edge/path contract only | Implementation |
| Retention periods | Retention categories defined; exact periods deferred | Implementation/security review |

