# LCSP Implementation Delivery Plan

## Purpose

Define engineering build order, team ownership, dependencies, and exit criteria for the A-to-Z runnable MVP. This is not the canonical backlog, sprint plan, or story artifact.

## Planning Gate

```text
CANONICAL_UX_PENDING
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
IMPLEMENTATION_NOT_AUTHORIZED
```

This plan becomes executable only after UX, canonical epics/stories, story traceability, and a successful implementation-readiness reassessment.

## Delivery Principles

- Build vertical slices with persisted state, audit, and contract checks.
- Preserve canonical flow: assessment -> evidence -> reconciliation -> legal matching -> classification -> gap -> document -> audit.
- Use real infrastructure for integrated acceptance.
- Keep Manager completion independent of Developer participation.
- Keep internal legal corpus operations outside customer-facing UX.
- Fail closed on missing evidence, approved corpus, citation, conflict resolution, or output guardrails.

## Team Model

| Team | Ownership |
|---|---|
| Platform | auth, organization, RBAC, audit, PostgreSQL/Prisma, RabbitMQ/outbox, environment/secret/provider configuration |
| Assessment | assessment lifecycle, WizardProfile, Manager workspace, repository connection/snapshot API |
| Scanner | Python Worker, Python analysis, TS/JS subprocess, evidence graph/report, workspace security |
| Intelligence | TechnicalProfile, AIUsageFlow, reconciliation, VerifiedProfile |
| Legal | source ingestion, internal corpus approval, embedding/FTS index, hybrid retrieval, LegalRuleMatch, classification guardrails |
| Reporting | gap analysis, document generation, object storage, artifact status/download |
| UX/QA | canonical UX, accessibility/status language, happy/negative path verification |

## Build Waves

### Wave 0 — Planning Closure

Includes canonical UX, epics/stories, story traceability, implementation-readiness reassessment, and sprint planning.

Exit:

- `CANONICAL_UX_COMPLETE`;
- canonical epics/stories cover active `FR-001..FR-049`, `FR-053..FR-056`;
- deferred `FR-050..FR-052` excluded from active stories;
- readiness status is READY or CONDITIONAL_READY with explicit owner decisions.

### Wave 1 — Foundations

Includes PostgreSQL/Prisma/pgvector/unaccent, RabbitMQ, outbox, audit, RBAC, configuration, and secret references.

Exit:

- migrations compile and apply;
- outbox publish/retry works;
- AuditEvent records state changes without secrets;
- Manager/Developer guards deny unauthorized actions;
- API and Node worker start;
- Python Worker environment can connect to DB/broker;
- provider credentials are referenced, not stored in source/logs.

### Wave 2 — Assessment Core

Includes auth/session, organization, assessment, WizardProfile, readiness-only state, GitHub App connection, and commit snapshot.

Exit:

- Manager can authenticate, create assessment, complete Wizard, connect selected read-only repository, and pin commit;
- readiness-only view has no risk level;
- OAuth login and GitHub authorization remain separate;
- all transitions are audited.

### Wave 3 — Python Worker and Scanner

Includes standalone Python Worker, `ast` + `libcst`, Python-native graph, Node `ts-morph` subprocess, restricted workspace, evidence/report gates, and scan events.

Exit:

- Python Worker is sole scan consumer;
- Python first-class bounded analysis works on golden fixtures;
- TS/JS subprocess emits validated normalized facts;
- no source execution or long-term raw source persistence;
- cleanup verified before completed event;
- fatal/privacy/cleanup failures block downstream;
- `NFR-012..NFR-016`, `NFR-023`, `NFR-026`, `NFR-035` scanner checks pass.

### Wave 4 — Intelligence and Reconciliation

Includes TechnicalProfile, AIUsageFlow, conflict detection/scoring, Manager resolution, optional structured attestation, and VerifiedProfile.

Exit:

- claims carry evidence refs/confidence/uncertainty;
- provider-only evidence abstains;
- unresolved conflict blocks classification;
- attestation is supplemental and cannot unlock classification;
- Manager completes without Developer;
- previous evidence remains immutable.

### Wave 5 — Legal Corpus and Hybrid Retrieval

Includes official-source validation, ingestion snapshots/hashes, normalization, internal review/approval, immutable corpus version, Vietnamese FTS, 1536-dimension embeddings, HNSW, effective-date filters, and retrieval audit.

Exit:

- approved source URL snapshots exist in S3-compatible storage with hashes/provenance;
- Internal Legal Operator approval is auditable;
- approved corpus is immutable;
- `simple` + `unaccent` FTS and pgvector HNSW index build succeeds;
- retrieval uses approved/pinned corpus, source/date/metadata filters;
- citations reconstruct document/article/clause/point/source/hash/version;
- retrieval audit contains sanitized query facets/hash, not sensitive raw text;
- `NFR-017`, `NFR-029`, `NFR-033`, `NFR-034` checks pass.

### Wave 6 — Real LLM and Classification

Includes real provider integration, structured output validation, timeout/retry, token/cost controls, model-run metadata, citation guardrail, and RiskClassification.

Exit:

- real provider call succeeds through LLM Gateway;
- raw source/full prompt/secret exclusion is verified;
- invalid schema/provider outage fails closed;
- token/cost usage is recorded and capped;
- classification requires VerifiedProfile and citation-backed LegalRuleMatch;
- mock-backed run is not accepted as A-to-Z evidence.

### Wave 7 — Reporting and Hardening

Includes GapAnalysis, document generation, S3 artifact storage, status/download, audit export, DLQ/retry validation, accessibility, observability, privacy, and recovery UX.

Exit:

- gap analysis traces to classification/legal basis;
- final document traces to evidence/citations/corpus/model/template and avoids overclaim;
- readiness-only export contains no risk level;
- generated artifact stored/downloaded securely;
- audit can be viewed/exported;
- all 33 active NFRs (`NFR-001..NFR-030`, `NFR-033..NFR-035`) are verified or have explicit accepted evidence plans.

### Wave 8 — A-to-Z Acceptance

Includes canonical Manager happy path, optional Developer path, and 14 negative-path scenarios on real infrastructure.

Exit:

- Manager completes login -> assessment -> Wizard -> repository -> snapshot -> Python scan -> evidence/profile/AIUsageFlow -> conflict resolution if needed -> VerifiedProfile -> legal matching -> classification -> gap -> document download -> audit export;
- approved legal corpus and real LLM/embedding providers are used;
- all required negative paths produce expected fail-closed/actionable states;
- acceptance audit record identifies versions, hashes, provider/model, corpus, and artifacts.

## Dependency Graph

```text
Foundations
-> Assessment/Wizard/Repository
-> Python Scanner
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation/VerifiedProfile
-> Legal Matching
-> Classification
-> Gap Analysis
-> Document
-> Audit Export
```

Parallel internal prerequisite:

```text
Legal Source Ingestion
-> Internal Approval
-> FTS/Embedding Index
-> Legal Matching readiness
```

## Dependency Constraints

- Outbox, audit, RBAC, and state guards precede worker chaining.
- RepositorySnapshot precedes ScanJob.
- Quality-valid report plus cleanup verification precedes TechnicalProfile.
- Reconciliation/VerifiedProfile precedes Legal Matching.
- Approved indexed corpus precedes Legal Matching.
- Legal Matching precedes Classification.
- Classification precedes GapAnalysis.
- GapAnalysis precedes final document generation.
- UX and stories precede implementation authorization.

## Engineering Task Candidates

These are build-order candidates, not stories or sprint tickets.

| Task | Purpose | Dependency | Owner |
|---|---|---|---|
| TASK-001 | Prisma/PostgreSQL baseline plus pgvector/unaccent | none | Platform |
| TASK-002 | Config/secret loader and provider refs | none | Platform |
| TASK-003 | AuditEvent writer | TASK-001 | Platform |
| TASK-004 | Outbox writer/publisher/retry/DLQ | TASK-001 | Platform |
| TASK-005 | Manager/Developer RBAC | TASK-001 | Platform |
| TASK-006 | Auth/session/OAuth/MFA baseline | TASK-002, TASK-005 | Platform |
| TASK-007 | Organization and assessment APIs | TASK-001, TASK-005 | Assessment |
| TASK-008 | WizardProfile/readiness APIs | TASK-007 | Assessment |
| TASK-009 | GitHub App connection/snapshot | TASK-007 | Assessment |
| TASK-010 | Scan request/status API | TASK-004, TASK-009 | Scanner |
| TASK-011 | Python Worker bootstrap/queue/idempotency | TASK-001, TASK-004 | Scanner |
| TASK-012 | Workspace/snapshot/cleanup security | TASK-011 | Scanner |
| TASK-013 | Python AST/CST and import analysis | TASK-011 | Scanner |
| TASK-014 | TS/JS subprocess analyzer/protocol | TASK-011 | Scanner |
| TASK-015 | Graph/findings/report/gates | TASK-012..TASK-014 | Scanner |
| TASK-016 | TechnicalProfile worker | TASK-015 | Intelligence |
| TASK-017 | AIUsageFlow worker | TASK-016 | Intelligence |
| TASK-018 | Reconciliation/conflict/VerifiedProfile | TASK-017 | Intelligence |
| TASK-019 | Developer task/structured attestation | TASK-005, TASK-018 | Assessment/Intelligence |
| TASK-020 | Legal source validation/ingestion | TASK-001, object storage | Legal |
| TASK-021 | Internal corpus review/approval | TASK-020 | Legal |
| TASK-022 | Vietnamese FTS and embedding index build | TASK-021, provider config | Legal |
| TASK-023 | Hybrid retriever/retrieval audit | TASK-022 | Legal |
| TASK-024 | Legal Matching worker | TASK-018, TASK-023 | Legal |
| TASK-025 | Real LLM Gateway | TASK-002 | Platform |
| TASK-026 | Risk Classification worker | TASK-024, TASK-025 | Legal |
| TASK-027 | Gap Analysis worker | TASK-026 | Reporting |
| TASK-028 | Document generation/S3/status/download | TASK-025..TASK-027 | Reporting |
| TASK-029 | Audit query/export | TASK-003 | Platform |
| TASK-030 | Manager web happy path | canonical UX/stories + relevant APIs | UX/Assessment |
| TASK-031 | Optional Developer web path | canonical UX/stories + TASK-019 | UX/Assessment |
| TASK-032 | Accessibility/blocked/recovery states | canonical UX + integrated APIs | UX/QA |
| TASK-033 | A-to-Z happy path acceptance | TASK-001..TASK-032 | QA/All |
| TASK-034 | Negative-path acceptance | TASK-033 | QA/All |

## Non-Claims

- This plan is not a sprint commitment.
- It does not authorize code before readiness certification.
- Internal task numbers must be replaced or linked by canonical stories after story creation.