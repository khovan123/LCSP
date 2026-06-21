# Contract and Integration Test Design

## Purpose

Define API, async event, worker, data and integration contract test design for LCSP. This document does not create Pact files, test code, CI jobs or framework projects.

## Scope

Contract tests validate request/response shape, state preconditions, permission boundaries, async event payloads, job envelopes, worker node IO, database versioning, LLM Gateway redaction, object storage metadata, citation rendering and audit events.

## Contract Groups

| Contract Group | Boundary | Required Coverage | Linked Requirements |
| --- | --- | --- | --- |
| AUTH_CONTRACT | Web/API/Auth/OAuth/MFA | login, OAuth start/callback, safe linking, MFA challenge/reset, session revocation | UC-M01-01..UC-M01-14, FR-001..FR-011, FR-074..FR-076 |
| ASSESSMENT_CONTRACT | API/DB | create/list/open assessment, Manager ownership | UC-M03-01, FR-018, FR-077 |
| WIZARD_CONTRACT | API/DB | save/submit WizardProfile, validation, versioning | UC-M03-02..UC-M03-04, FR-019..FR-021 |
| GITHUB_CONNECTION_CONTRACT | API/GitHub App | installation, repo/branch/commit selection, no OAuth inheritance | UC-M04-02, UC-M04-08, FR-025, FR-066, FR-076 |
| SCAN_JOB_CONTRACT | API/Queue/Worker | scan request, job envelope, idempotency, progress | UC-M04-08, FR-066, NFR-022 |
| TECHNICAL_EVIDENCE_CONTRACT | Worker/API | TechnicalEvidenceReport, findings, refs, Schema Gate | UC-M05-01..UC-M05-05, FR-031..FR-035 |
| AI_USAGE_FLOW_CONTRACT | Worker/API/RAG | claim-level evidence, confidence, uncertainty, source type | UC-M05-04, UC-M06-01, UC-M07-01, FR-069..FR-073 |
| CONFLICT_RESOLUTION_CONTRACT | API/Workflow | Manager conflict task, resolution, re-run reconciliation | UC-M06-01..UC-M06-06, FR-036..FR-041 |
| VERIFIED_PROFILE_CONTRACT | API/Worker | versioned snapshot, approval, invalidation | UC-M06-07, UC-M06-08, FR-042, FR-067 |
| CLASSIFICATION_CONTRACT | Worker/RAG/API | classification request, blocking rules, result shape | UC-M07-02..UC-M07-05, FR-044..FR-047 |
| LEGAL_CITATION_CONTRACT | RAG/Worker | rule id, citation id, corpus version, guardrail | UC-M07-01, UC-M07-03, UC-M07-04, FR-043, FR-045, FR-046 |
| DOCUMENT_CONTRACT | Worker/Object Storage/API | final report gate, document metadata, evidence appendix | UC-M08-02..UC-M08-05, FR-049..FR-052 |
| AUDIT_EVENT_CONTRACT | API/Worker/Audit | critical transition events, redacted context | UC-M09-01..UC-M09-05, FR-053..FR-057 |

## API Request/Response Contract Validation

| API Area | Positive Contract | Negative Contract |
| --- | --- | --- |
| Auth/OAuth/MFA | Valid login/callback/MFA returns session state | Invalid state/nonce/MFA rejected |
| Repository Scan | Valid Manager scan request returns job/status | Missing repo, invalid actor or duplicate mismatch blocked |
| Conflict Resolution | Manager resolution accepted with traceable refs | Developer final resolution rejected |
| Classification | VerifiedProfile-ready request accepted | Missing VerifiedProfile/conflict/usage/citation blocks |
| Documents | Valid final gate request accepted | Unresolved conflict/missing citation blocks |

## Permission and State-Precondition Testing

- Manager can perform all active MVP actions.
- Developer is optional and cannot perform final compliance actions.
- State transitions must reject out-of-order requests.
- OAuth/OIDC session does not grant repository access without GitHub App connection.

## Async Event Contract Testing

Validate event id, type, assessment id, workflow run id, actor/role when applicable, correlation id, source component, timestamp, input refs and redacted context.

## Queue Job Envelope Validation

Validate `job_id`, `job_type`, `assessment_id`, `workflow_run_id`, `correlation_id`, `idempotency_key`, `input_refs`, `attempt` and no raw source/full prompt/secrets.

## Worker/Orchestrator Node IO Schema Validation

Validate node inputs/outputs for Repository Scan, Evidence Normalization, Schema Gate, Quality Gate, TechnicalProfile, AIUsageFlow, Reconciliation, Manager wait, VerifiedProfile, Legal Retrieval, Risk Classification, Citation Guardrail, Gap Analysis, Document Generation and Output Guardrail.

## Database Transaction and Versioning Behavior

Tests must cover state transition + audit atomicity, outbox/job creation durability, immutable report/profile/result snapshots and invalidation after evidence/profile changes.

## Idempotency Key Behavior

Duplicate scan/classification/document requests with matching input versions return existing job/result. Mismatched inputs under same key are rejected.

## GitHub App Boundary

Contract tests must verify GitHub App installation/repo refs are required for scan and OAuth/OIDC identity alone is insufficient.

## LLM Gateway Schema and Redaction Contract

Validate sanitized metadata-only input, schema-constrained output, timeout behavior, invalid output rejection and model run metadata. Raw source, full prompts, secrets and raw AST bodies must be rejected.

## Object Storage Metadata Contract

Validate document storage ref, hash, template version, assessment id and access policy. Raw source artifacts must not be stored.

## Citation and Document Rendering Contract

Validate citation id/rule id/corpus version presence in classification and rendered document sections. Missing critical citation blocks or degrades output.

## Testability Labels

| Contract Group | Label |
| --- | --- |
| AUTH_CONTRACT, GITHUB_CONNECTION_CONTRACT, SCAN_JOB_CONTRACT | TESTABLE_AFTER_IMPLEMENTATION |
| TECHNICAL_EVIDENCE_CONTRACT, AI_USAGE_FLOW_CONTRACT | TESTABLE_WITH_FIXTURE |
| LEGAL_CITATION_CONTRACT | TESTABLE_WITH_FIXTURE / MANUAL_VALIDATION_REQUIRED |
| AUDIT_EVENT_CONTRACT | TESTABLE_AFTER_IMPLEMENTATION |

