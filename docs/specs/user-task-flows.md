# LCSP User Task Flows

## Purpose

This document explains what users and system workers do in LCSP. It is domain-level workflow documentation, not implementation guidance, backlog, story creation, validation planning, or architecture rewrite.

## Flow Conventions

- API route names use active controlled MVP route names.
- Queue names use canonical `command.*` and `event.*` names.
- Database changes list domain objects, not physical schema details.
- Events emitted means persisted domain event or outbox event, depending on whether async work follows.

## Manager Flows

### Create Assessment

| Field | Content |
|---|---|
| Goal | Start an assessment owned by Manager. |
| Preconditions | Manager is authenticated and belongs to an organization. |
| Happy path | 1. Manager opens assessment workspace. 2. Manager creates assessment. 3. System records owner and state. |
| System behavior | Validates Manager role and organization scope. |
| Database changes | Creates `Assessment`; writes `AuditEvent`. |
| Events emitted | `ASSESSMENT_CREATED`; no async queue required. |
| Resulting state | `CREATED` or first Wizard-ready state depending on UI flow. |
| Failure path | Unauthorized or missing organization scope blocks creation and writes security/audit event where applicable. |
| State transitions | None -> `CREATED`. |

### Connect Repository

| Field | Content |
|---|---|
| Goal | Authorize selected repository for evidence collection. |
| Preconditions | Assessment exists; Manager has `CONNECT_REPOSITORY`; OAuth/OIDC login boundary is already separate from GitHub App. |
| Happy path | 1. Manager starts GitHub App connection. 2. Manager selects repository/branch. 3. System stores selected repository authorization metadata. |
| System behavior | Verifies repository access and assessment ownership. |
| Database changes | Creates `RepositoryConnection`; writes `AuditEvent`. |
| Events emitted | `REPOSITORY_CONNECTED`. |
| Resulting state | `REPOSITORY_CONNECTED`. |
| Failure path | Missing GitHub authorization, wrong repository scope or user authorization failure blocks connection. |
| State transitions | `WIZARD_PROFILE_READY` or active assessment state -> `REPOSITORY_CONNECTED`. |

### Start Scan

| Field | Content |
|---|---|
| Goal | Request static repository scan for selected snapshot. |
| Preconditions | RepositoryConnection exists; RepositorySnapshot exists or can be created; Manager has `RUN_REPOSITORY_SCAN`. |
| Happy path | 1. Manager selects commit/branch. 2. System creates `RepositorySnapshot`. 3. Manager starts scan. 4. System creates `ScanJob` and outbox command. |
| System behavior | Validates repo/commit scope and idempotency. |
| Database changes | Creates/uses `RepositorySnapshot`; creates `ScanJob`; writes `AuditEvent`; writes `OutboxEvent`. |
| Events emitted | `SNAPSHOT_CREATED`, `SCAN_REQUESTED`, `command.scan.requested.v1`. |
| Resulting state | `SNAPSHOT_CREATED` then `SCAN_REQUESTED`. |
| Failure path | Invalid snapshot or unauthorized actor blocks scan. |
| State transitions | `REPOSITORY_CONNECTED -> SNAPSHOT_CREATED -> SCAN_REQUESTED`. |

### Review Findings

| Field | Content |
|---|---|
| Goal | Understand technical evidence and AI usage signals before reconciliation/classification. |
| Preconditions | Scan completed and TechnicalEvidenceReport/TechnicalProfile are available. |
| Happy path | 1. Manager opens findings/progress view. 2. System shows normalized findings, evidence refs, confidence and coverage limitations. |
| System behavior | Never shows raw source body, full prompt, secret value or full AST body. |
| Database changes | Optional `AuditEvent` for findings review. |
| Events emitted | `TECHNICAL_FINDINGS_REVIEWED` audit event if tracked. |
| Resulting state | No state change by review alone. |
| Failure path | Missing report or insufficient evidence shows blocked/actionable state. |
| State transitions | None. |

### Resolve Conflict

| Field | Content |
|---|---|
| Goal | Resolve mismatch between WizardProfile, TechnicalProfile and AIUsageFlow. |
| Preconditions | Conflict exists; Manager owns assessment. |
| Happy path | 1. Manager opens conflict. 2. Manager reviews compared values and evidence refs. 3. Manager records resolution. 4. System stores resolution separately from scanner evidence. 5. Reconciliation resumes. |
| System behavior | Does not overwrite scanner evidence; validates Manager authority. |
| Database changes | Updates `Conflict`; writes `AuditEvent`; writes `OutboxEvent` for reconciliation resume if needed. |
| Events emitted | `RECONCILIATION_RESOLVED`, `command.reconciliation.requested.v1`. |
| Resulting state | Conflict resolved; may become `VERIFIED_PROFILE_READY` after reconciliation. |
| Failure path | Missing resolution rationale, unresolved required conflict or unauthorized actor keeps classification blocked. |
| State transitions | `RECONCILIATION_REQUIRED -> VERIFIED_PROFILE_READY` only after all blocking conflicts resolve. |

### Approve Classification

| Field | Content |
|---|---|
| Goal | Request classification once VerifiedProfile and legal matching prerequisites are satisfied. |
| Preconditions | VerifiedProfile exists; legal matching has completed; no unresolved conflict remains. |
| Happy path | 1. Manager requests classification or system triggers based on workflow. 2. System validates prerequisites. 3. Classification command is queued. |
| System behavior | Blocks classification before VerifiedProfile or legal matching. |
| Database changes | Creates/updates `RiskClassification` request state; writes `AuditEvent`; writes `OutboxEvent`. |
| Events emitted | `command.classification.requested.v1`; later `event.classification.completed.v1` or `event.classification.blocked.v1`. |
| Resulting state | `CLASSIFICATION_READY`, `CLASSIFICATION_BLOCKED`, or completed classification state. |
| Failure path | Missing citation, missing legal match, unresolved conflict or unknown critical usage blocks/degrades classification. |
| State transitions | `LEGAL_MATCHING_READY -> CLASSIFICATION_READY` or `CLASSIFICATION_BLOCKED`. |

### Generate Report

| Field | Content |
|---|---|
| Goal | Generate final compliance document or blocked/readiness output. |
| Preconditions | Valid classification and gap basis exist for final report; readiness-only output can exist without risk level. |
| Happy path | 1. Manager requests document. 2. System validates citation, conflict and classification guardrails. 3. Document command is queued. 4. Document metadata/artifact is persisted. |
| System behavior | Blocks final output when citation or conflict prerequisites fail. |
| Database changes | Creates `GeneratedDocument`; writes `AuditEvent`; writes `OutboxEvent`. |
| Events emitted | `command.document.requested.v1`; later `event.document.generated.v1` or `event.document.blocked.v1`. |
| Resulting state | `DOCUMENT_GENERATED` or `DOCUMENT_BLOCKED`. |
| Failure path | Missing citation, unresolved conflict or unsupported classification basis blocks document. |
| State transitions | `CLASSIFICATION_READY -> DOCUMENT_GENERATED` or `DOCUMENT_BLOCKED`. |

## Developer Flows

### Accept Task

| Field | Content |
|---|---|
| Goal | Developer accepts scoped delegated technical task. |
| Preconditions | Manager invited Developer and assigned scoped policy/task. |
| Happy path | Developer opens task, accepts, and receives only assigned context. |
| System behavior | Enforces Developer policy scope and records audit. |
| Database changes | Updates task/policy status; writes `AuditEvent`. |
| Events emitted | `DEVELOPER_TASK_CREATED` / task status audit event. |
| Resulting state | No Manager workflow dependency; task is active. |
| Failure path | Revoked/expired policy blocks access. |
| State transitions | None for assessment lifecycle. |

### Review Technical Findings

| Field | Content |
|---|---|
| Goal | Developer reviews assigned technical findings when delegated. |
| Preconditions | Developer has `VIEW_TECHNICAL_FINDINGS` or equivalent scoped task. |
| Happy path | Developer views redacted findings and may prepare clarification. |
| System behavior | Shows limited context and excludes raw source/secrets/full prompts/full AST. |
| Database changes | Optional `AuditEvent`. |
| Events emitted | Findings review audit event if tracked. |
| Resulting state | No state change by review alone. |
| Failure path | Missing permission or revoked delegation blocks access. |
| State transitions | None. |

### Submit Attestation

| Field | Content |
|---|---|
| Goal | Developer submits structured technical attestation as supplemental input. |
| Preconditions | Developer has scoped attestation task; attestation cannot replace machine-generated metadata. |
| Happy path | Developer submits role, claim, scope, reason, supporting evidence refs and timestamp. |
| System behavior | Validates structure and stores as supplemental evidence only. |
| Database changes | Creates attestation-related record or metadata; writes `AuditEvent`. |
| Events emitted | `HUMAN_ATTESTATION_SUBMITTED` / attestation audit event. |
| Resulting state | May support Manager review or reconciliation, but does not unlock classification by itself. |
| Failure path | Free text, missing scope, missing role or attempt to bypass evidence gates is rejected. |
| State transitions | None unless Manager later uses it in conflict resolution. |

## System Flows

### Run Repository Scan

| Field | Content |
|---|---|
| Goal | Convert repository snapshot into static technical evidence. |
| Preconditions | `command.scan.requested.v1` exists; RepositorySnapshot and ScanJob exist. |
| Happy path | 1. Scanner Worker consumes command. 2. Marks scan running. 3. Inventories files. 4. Performs static analysis. 5. Creates findings, evidence refs, report and audit. 6. Emits scan completed. |
| System behavior | Never executes customer code, installs dependencies, runs scripts, sends raw source to LLM or persists raw source long-term. |
| Database changes | Updates `ScanJob`; creates `SourceFile`, `TechnicalFinding`, `TechnicalEvidenceReport`, evidence refs and graph metadata. |
| Events emitted | `event.scan.completed.v1` or `event.scan.failed.v1`. |
| Resulting state | `SCAN_COMPLETED` or failed scan state. |
| Failure path | Parse failure, unsupported language or coverage limits are recorded; invalid schema or privacy failure blocks downstream. |
| State transitions | `SCAN_REQUESTED -> SCAN_RUNNING -> SCAN_COMPLETED` or failed. |

### Build Technical Profile

| Field | Content |
|---|---|
| Goal | Normalize accepted technical evidence into profile dimensions. |
| Preconditions | TechnicalEvidenceReport exists and passes schema/quality gates. |
| Happy path | Technical Profile Worker reads findings and creates TechnicalProfile. |
| System behavior | Provider package only means possible AI use; model invocation confirms AI detection. |
| Database changes | Creates `TechnicalProfile`; writes `AuditEvent`; writes downstream outbox command. |
| Events emitted | `event.technical-profile.completed.v1`, `command.ai-usage-flow.requested.v1`. |
| Resulting state | `TECHNICAL_PROFILE_READY`. |
| Failure path | Insufficient or invalid evidence blocks profile or marks explicit reason. |
| State transitions | `SCAN_COMPLETED -> TECHNICAL_PROFILE_READY`. |

### Reconcile Profiles

| Field | Content |
|---|---|
| Goal | Compare Manager declaration, technical profile and AI usage claims. |
| Preconditions | WizardProfile, TechnicalProfile and AIUsageFlow exist. |
| Happy path | Reconciliation Worker compares critical fields. If no conflict, VerifiedProfile can be created. |
| System behavior | Creates conflict instead of guessing when material mismatch exists. |
| Database changes | Creates/updates `Conflict` or creates `VerifiedProfile`; writes audit/outbox. |
| Events emitted | `event.reconciliation.conflict-detected.v1` or `event.reconciliation.verified-profile-ready.v1`. |
| Resulting state | `RECONCILIATION_REQUIRED` or `VERIFIED_PROFILE_READY`. |
| Failure path | Missing profile, unclear critical usage or unresolved conflict blocks classification. |
| State transitions | `AI_USAGE_FLOW_READY -> RECONCILIATION_REQUIRED` or `VERIFIED_PROFILE_READY`. |

### Generate Verified Profile

| Field | Content |
|---|---|
| Goal | Create reconciled source for legal matching. |
| Preconditions | Evidence is ready; AIUsageFlow exists; all conflicts resolved or no conflict exists. |
| Happy path | System merges WizardProfile, TechnicalProfile, AIUsageFlow and Manager resolutions into VerifiedProfile. |
| System behavior | Preserves scanner evidence immutably and stores Manager resolution separately. |
| Database changes | Creates `VerifiedProfile`; writes `AuditEvent`; writes legal matching command. |
| Events emitted | `event.reconciliation.verified-profile-ready.v1`, `command.legal-matching.requested.v1`. |
| Resulting state | `VERIFIED_PROFILE_READY`, then legal matching begins. |
| Failure path | Any unresolved material conflict blocks creation. |
| State transitions | `RECONCILIATION_REQUIRED -> VERIFIED_PROFILE_READY` only after resolution. |

### Execute Classification

| Field | Content |
|---|---|
| Goal | Produce evidence-backed risk result or blocked state. |
| Preconditions | VerifiedProfile exists; legal matching completed; citations available where required. |
| Happy path | Legal Matching Worker creates LegalRuleMatch; Classification Worker creates RiskClassification. |
| System behavior | Does not classify from provider/model/framework presence alone. |
| Database changes | Creates `LegalRuleMatch`; creates `RiskClassification`; writes audit/outbox. |
| Events emitted | `event.legal-matching.completed.v1`, `command.classification.requested.v1`, `event.classification.completed.v1` or `event.classification.blocked.v1`. |
| Resulting state | `CLASSIFICATION_READY` or `CLASSIFICATION_BLOCKED`. |
| Failure path | Missing citation, policy-only source without binding basis, unresolved conflict or unknown critical usage blocks/degrades. |
| State transitions | `VERIFIED_PROFILE_READY -> LEGAL_MATCHING_READY -> CLASSIFICATION_READY` or blocked. |

### Generate Documents

| Field | Content |
|---|---|
| Goal | Create gap analysis and document artifact under output guardrails. |
| Preconditions | RiskClassification exists; final report requires completed GapAnalysis, legal trace and no unresolved conflict. |
| Happy path | Gap Analysis Worker creates `GapAnalysis`; Document Worker uses RiskClassification, GapAnalysis, legal matches, evidence refs and template version to persist document metadata and artifact ref. |
| System behavior | Blocks or degrades output when legal citation or conflict prerequisites fail. |
| Database changes | Creates `GapAnalysis` domain result and `GeneratedDocument`; writes audit/outbox. |
| Events emitted | `command.gap-analysis.requested.v1`, `event.gap-analysis.completed.v1`, `command.document.requested.v1`, `event.document.generated.v1` or `event.document.blocked.v1`. |
| Resulting state | `DOCUMENT_GENERATED` or `DOCUMENT_BLOCKED`. |
| Failure path | Missing citation, missing classification, unresolved conflict or output guardrail failure blocks final document. |
| State transitions | `CLASSIFICATION_READY -> GAP_ANALYSIS_READY -> DOCUMENT_GENERATED` or blocked. |
