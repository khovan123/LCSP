# Implementation Wave Plan

This plan orders controlled MVP prototype implementation only. It does not authorize production deployment, validation completion, formal legal reliability validation, runtime scanner accuracy claims or A2-b2 completion.

## Critical Path

STORY-01-01 -> STORY-01-02 -> STORY-01-03 -> STORY-02-01 -> STORY-02-03 -> STORY-03-01 -> STORY-03-02 -> STORY-04-01 -> STORY-04-02 -> STORY-04-03 -> STORY-04-04 -> STORY-05-01 -> STORY-05-02 -> STORY-05-03 -> STORY-06-01 -> STORY-06-02 -> STORY-06-03 -> STORY-07-01 -> STORY-07-02 -> STORY-07-03 -> STORY-08-01 -> STORY-08-02 -> STORY-08-03 -> STORY-08-04

## Waves

### Wave 1: runtime/config/shared contracts

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-01-01 | Prototype Runtime Boundary Setup | Starts the wave after prior wave outputs exist | prototype boundaries |
| STORY-01-02 | Shared Prototype Status and Guardrail Vocabulary | May run after direct predecessor contracts exist | prototype status constants |
| STORY-01-03 | Prototype Configuration and Environment Boundary | May run after direct predecessor contracts exist | prototype config boundaries |

### Wave 2: auth/organization/assessment foundation

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-02-01 | OAuth/OIDC Login Boundary | Starts the wave after prior wave outputs exist | LCSP session |
| STORY-02-02 | Session, MFA Hooks, and Account Safety | May run after direct predecessor contracts exist | session and MFA audit |
| STORY-02-03 | Manager Super-role Authorization | May run after direct predecessor contracts exist | authorization decision |

### Wave 3: GitHub connection plus scan-job foundation

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-03-01 | GitHub App Installation and Repository Connection | Starts the wave after prior wave outputs exist | GitHubRepositoryConnection metadata and audit event |
| STORY-03-02 | Repository, Branch, and Commit Selection | May run after direct predecessor contracts exist | RepositorySnapshot metadata and scan-ready state |
| STORY-04-01 | Scan Job Lifecycle and Idempotency | Starts the wave after prior wave outputs exist | RepositoryScanJob, RabbitMQ job, progress states |

### Wave 4: technical evidence, AIUsageFlow and reconciliation

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-04-02 | Synthetic Fixture-driven Scanner Prototype | May run after direct predecessor contracts exist | Normalized TechnicalFinding and scanner limitations |
| STORY-04-03 | TechnicalEvidenceReport Contract Persistence | May run after direct predecessor contracts exist | TechnicalEvidenceReport with hash and evidence refs |
| STORY-04-04 | Evidence Gates and TechnicalProfile Builder | May run after direct predecessor contracts exist | Schema Gate, Quality Gate, TechnicalProfile |
| STORY-05-01 | AIUsageFlow Claim Model | Starts the wave after prior wave outputs exist | AIUsageFlow claims with evidence refs |
| STORY-05-02 | Uncertainty and Abstention Handling | May run after direct predecessor contracts exist | Uncertainty reasons and blocked eligibility |
| STORY-05-03 | Human Review and Automation Level Mapping | May run after direct predecessor contracts exist | human_review and automation_level claims |
| STORY-06-01 | Reconciliation Engine Shell | Starts the wave after prior wave outputs exist | ConflictRecord or reconciled profile draft |
| STORY-06-02 | Manager Conflict Resolution Workspace | May run after direct predecessor contracts exist | ConflictResolution and audit event |
| STORY-06-03 | VerifiedProfile Builder and Approval Gate | May run after direct predecessor contracts exist | VerifiedProfile version and classification-ready gate |
| STORY-06-04 | Immutable Audit Trail Foundation | May run after direct predecessor contracts exist | Append-only AuditEvent with correlation ID |

### Wave 5: legal corpus, classification, gap and document shells

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-07-01 | Legal Corpus Version and Source Metadata | Starts the wave after prior wave outputs exist | LegalDocumentVersion and LegalRule metadata |
| STORY-07-02 | Legal Rule and Citation Retrieval Boundary | May run after direct predecessor contracts exist | Citation candidates and retrieval trace |
| STORY-07-03 | Citation Guardrail Shell | May run after direct predecessor contracts exist | Guardrail pass or citation-missing block |
| STORY-08-01 | Risk Classification Workflow Shell | Starts the wave after prior wave outputs exist | RiskClassificationResult or blocked state |
| STORY-08-02 | Gap Analysis Workflow Shell | May run after direct predecessor contracts exist | GapAnalysisResult or blocked state |
| STORY-08-03 | Document Generation Workflow Shell | May run after direct predecessor contracts exist | ComplianceDocument metadata and GeneratedDocumentFile ref |
| STORY-08-04 | Readiness-only Export Shell | May run after direct predecessor contracts exist | Prototype-only export with readiness warning |

### Wave 6: security hardening, observability and integration verification

| Story ID | Title | Parallelization Note | Blocking Output |
|---|---|---|---|
| STORY-09-01 | Secret Redaction and Evidence Sanitization | Starts the wave after prior wave outputs exist | Redacted evidence payload and audit metadata |
| STORY-09-02 | No Raw Source to LLM Boundary | May run after direct predecessor contracts exist | LLM request without raw source/full prompts/secrets/AST bodies |
| STORY-09-03 | Workspace Cleanup and Retention Boundary | May run after direct predecessor contracts exist | Cleanup confirmation and retention audit |
| STORY-09-04 | Prototype Observability and Manual Verification Support | May run after direct predecessor contracts exist | Structured logs, metrics plan, audit records |

## First Eligible Story for Coding

`STORY-01-01 Prototype Runtime Boundary Setup` remains the first eligible story because it establishes folders and boundaries used by every later implementation story.

## Blocking Dependencies

- Auth and Manager authorization block GitHub connection.
- GitHub repository snapshot blocks scan orchestration.
- TechnicalEvidenceReport and gates block AIUsageFlow.
- AIUsageFlow and TechnicalProfile block reconciliation.
- VerifiedProfile and citation traceability block classification.
- Classification blocks gap analysis and document generation.
- Security and observability stories can harden earlier slices but must not weaken privacy invariants.
