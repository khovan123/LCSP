# LCSP System Context

## Purpose

This document defines what LCSP is, who uses it, and how an assessment moves from Manager intent to evidence-backed classification, reporting, and audit. It is a domain-level source of truth, not backlog, story, implementation, or validation material.

## Problem Statement

Vietnamese businesses using AI need a traceable way to understand and document compliance posture without relying only on self-declared checklists or free-form legal chatbot answers. LCSP combines Manager-provided business context, repository-derived technical evidence, reconciliation, citation-backed legal matching, classification, gap analysis, document generation, and audit trail.

## Product Vision

LCSP is an evidence-based compliance support platform for businesses using AI in Vietnam. It supports compliance work but does not replace professional legal advice, certify compliance, or create unsupported legal conclusions.

## Product Scope

```text
Manager intent
-> WizardProfile
-> Repository Scan
-> TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> LegalRuleMatch
-> RiskClassification
-> GapAnalysis
-> GeneratedDocument
-> AuditEvent
```

## In Scope

- Manager-led assessment lifecycle.
- OAuth/OIDC login separated from GitHub App repository authorization.
- Optional Developer collaboration through scoped tasks.
- Optional structured Developer attestation under `FR-046` as supplemental input only.
- Read-only GitHub repository connection and commit-pinned Repository Scan.
- Python Worker-owned static analysis with first-class bounded Python support and TS/JS subprocess analysis.
- Evidence gates, TechnicalProfile, AIUsageFlow, reconciliation, and Manager-only conflict resolution.
- Provenance-preserving legal corpus ingestion from approved official-source URLs.
- Internal corpus review/approval and immutable LegalCorpusVersion management.
- Hybrid PostgreSQL FTS + pgvector retrieval with citation and effective-date filters.
- Real configured LLM provider for A-to-Z acceptance; deterministic mock only for tests/offline development.
- Risk classification only after VerifiedProfile and legal matching.
- Gap analysis, final report, readiness-only export, artifact download, and audit export.

## Out of Scope

- Production compliance certification or formal legal opinion.
- Direct regulator submission or public auditor/regulator portal.
- Enterprise SSO/SAML/SCIM and advanced identity administration.
- Local/CI scanner upload and manual evidence JSON as active MVP paths (`FR-050`, `FR-051` are Deferred).
- Delegated free-form technical clarification workflow (`FR-052` is Deferred).
- Customer-facing legal corpus administration.
- Runtime scanner accuracy claims before post-implementation empirical acceptance.
- Risk level based only on Wizard answers, provider package, model name, or framework detection.
- Final report when critical conflict, insufficient evidence, missing approved corpus, or missing citation remains unresolved.

## Primary Product Actors

| Actor | Responsibility | Key Tasks |
|---|---|---|
| Manager | Owns assessment, business/legal truth, final MVP conflict resolution, VerifiedProfile approval where required, classification request, report generation, and audit review. | Create assessment, complete Wizard, connect repository, start scan, review evidence, resolve conflicts, request classification, generate/download report, export audit. |
| Developer | Optional scoped technical collaborator. | Accept task, review redacted findings, submit structured technical attestation when allowed. |
| LCSP System | Enforces workflow gates, state transitions, evidence handling, queue choreography, retrieval, audit, and output guardrails. | Execute workers, persist domain objects, publish commands/events, block unsafe output. |

Manager can complete the active MVP golden path without Developer participation. Developer absence is never a workflow blocker.

## Internal Operations Actor

| Actor | Responsibility | UX Boundary |
|---|---|---|
| Internal Legal Operator | Validates official-source URLs, reviews normalized legal documents, approves or rejects corpus versions, and audits corpus changes. | Internal operations/API/CLI only for MVP. No Manager/Developer product screen is required by `bmad-ux`. |

This boundary is locked for the MVP. A future dedicated Legal Operator web console would require a separate scope decision and stories.

## External Systems

| System | Used For | Boundary |
|---|---|---|
| OAuth/OIDC Provider | User login and identity verification. | Does not grant repository access. |
| GitHub App | Read-only selected repository access and commit snapshot. | Separate from user login. |
| Official Legal Sources | Legal document ingestion and provenance. | Source candidates require validation before ingestion is accepted. |
| Legal Corpus / Hybrid Retriever | Versioned legal retrieval and citation traceability. | Approved immutable corpus only. |
| LLM Provider | Structured assisted classification/generation. | No raw source, secrets, full prompts, or full AST bodies. |
| Object Storage | Legal source snapshots and generated document artifacts. | Real S3-compatible storage for A-to-Z acceptance. |

## High-Level Manager Journey

```text
Login
-> Create Assessment
-> Complete WizardProfile
-> Connect Repository
-> Select Commit
-> Run Repository Scan
-> Review Findings and AIUsageFlow
-> Resolve Conflict if present
-> Verify Profile readiness
-> Run Legal Matching and Classification
-> Review Gap Analysis
-> Generate and Download Report
-> Review and Export Audit Trail
```

## Optional Developer Journey

```text
Receive invitation/task
-> Accept scoped task
-> Review redacted technical findings
-> Submit structured attestation
-> Stop at delegated scope
```

The active Developer path does not include a free-form clarification workflow. Structured attestation:

- is stored separately from scanner evidence;
- cannot replace machine-generated metadata;
- cannot resolve a conflict;
- cannot approve VerifiedProfile;
- cannot unlock classification by itself;
- must disclose role, scope, claim, reason, evidence refs, and timestamp.

## Internal Legal Operations Journey

```text
Validate source URL
-> Ingest PDF/HTML snapshot
-> Compute hash and extract metadata
-> Normalize legal hierarchy
-> Review document and relationships
-> Approve LegalCorpusVersion
-> Build FTS and vector index
-> Make approved version available to retrieval
```

This journey is not part of the Manager/Developer product UX deliverable.

## Assessment Lifecycle

```text
CREATED
-> WIZARD_PROFILE_READY
-> REPOSITORY_CONNECTED
-> SNAPSHOT_CREATED
-> SCAN_REQUESTED
-> SCAN_RUNNING
-> SCAN_COMPLETED
-> TECHNICAL_PROFILE_READY
-> AI_USAGE_FLOW_READY
-> RECONCILIATION_REQUIRED or VERIFIED_PROFILE_READY
-> LEGAL_MATCHING_READY
-> CLASSIFICATION_READY or CLASSIFICATION_BLOCKED
-> GAP_ANALYSIS_READY or GAP_ANALYSIS_BLOCKED
-> DOCUMENT_GENERATED or DOCUMENT_BLOCKED
```

## Classification Gates

Classification is blocked or explicitly degraded when:

- VerifiedProfile does not exist;
- any material conflict remains unresolved;
- critical AI usage is unknown or unsupported;
- approved legal corpus is unavailable;
- required legal citation coverage is missing;
- provider/model/framework presence is the only evidence;
- configured real LLM provider is unavailable for the acceptance run.

## Reporting Gates

A final report requires classification, gap analysis, evidence trace, legal citation trace, approved corpus version, and no unresolved conflict. Readiness-only output may exist earlier but must not contain a risk level or compliance-certification wording.

## Key Outcomes

- Manager understands what is needed before classification.
- Technical evidence is traceable to repository snapshot metadata and evidence refs.
- Business declarations and technical findings are reconciled before legal matching.
- Legal conclusions are citation-backed or blocked/degraded.
- Generated documents trace to evidence, legal basis, corpus version, and Manager decisions.
- Material workflow and security actions are auditable.

## UX Handoff Boundary

`bmad-ux` must design Manager and optional Developer product flows only. It must represent blocked, failed, loading, retry, empty, and permission-denied states. Internal Legal Operator corpus administration remains outside the customer-facing UX scope for MVP.