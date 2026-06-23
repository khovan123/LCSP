# LCSP System Architecture

## Status

AUTHORITATIVE SYSTEM ARCHITECTURE

## Purpose

Define what LCSP components exist, why they exist, and how they communicate at system level. Implementation details such as RabbitMQ topology, database schema, retry policy, Node process packaging, exact framework wiring, and concrete queue payloads live in `docs/implementation/`.

## Architectural Style

```text
Web Frontend
-> Backend API
-> Async Worker Runtime
-> Persistence / Legal Retrieval / Object Storage
```

LCSP is a modular, evidence-first compliance platform. The system is intentionally gate-driven: technical evidence, AIUsageFlow, reconciliation, VerifiedProfile, legal matching, classification, gap analysis, and document generation happen in sequence with explicit blocking conditions.

## Core Components

| Component | Why It Exists | Communicates With |
|---|---|---|
| Web Frontend | Manager workspace for assessment, repository connection, scan progress, conflict resolution, classification and documents. | Backend API. |
| Backend API | Auth, Manager authorization, assessment state, synchronous user actions, async work creation. | Web Frontend, Persistence, Queue boundary, GitHub App. |
| Repository Integration | Authorizes read-only repository access separately from OAuth/OIDC login. | Backend API, GitHub. |
| Python Scanner Worker | Owns Repository Scan lifecycle and produces static-analysis technical evidence from commit-pinned repository snapshots. Python is first-class; TS/JS analysis is delegated to a Node.js subprocess adapter. | Queue boundary, Persistence, Repository Integration, TS/JS analyzer subprocess. |
| AIUsageFlow Worker | Converts technical evidence and WizardProfile into business usage claims. | Persistence, Reconciliation. |
| Reconciliation | Compares Manager declarations and technical evidence; pauses for Manager resolution when needed. | Backend API, Persistence. |
| Legal Source Ingestion Worker | Fetches official legal sources, snapshots raw PDF/HTML into S3-compatible storage, normalizes legal structure, and stages corpus versions for review. | Queue boundary, Object Storage, Persistence. |
| Corpus Review / Approval | Formal Legal Team or designated operator gate that approves corpus versions before retrieval or classification can use them. This is an internal control function, not a new customer-facing product role. | Backend API, Persistence, Audit, Embedding/Index Builder. |
| Legal Corpus Store | Versioned, provenance-preserving legal corpus metadata, document chunks, source snapshots, approval records and corpus version pins. | Persistence, Object Storage, Hybrid Legal Retriever. |
| Embedding / Index Builder | Builds pgvector embeddings and full-text indexes for approved corpus versions only. | Queue boundary, Persistence, LLM/Embedding Provider. |
| Hybrid Legal Retriever | Retrieves citation-backed legal rules using pinned approved corpus version, PostgreSQL FTS and pgvector semantic search. | Legal Corpus Store, Legal Matching, Retrieval Audit. |
| Citation Guardrail | Blocks or degrades legal matching, classification and documents when required citation/rule basis is missing or corpus version is not approved. | Legal Matching, Classification, Document Generation, Audit. |
| LLM Gateway | Central model boundary for real provider calls, prompt/template versions, schema validation, retries, model metadata and privacy enforcement. Mock mode is unit/offline-only and is not acceptance evidence. | AIUsageFlow, Classification, Document Generation, Embedding/Index Builder, Persistence. |
| Legal Matching / RAG | Retrieves citation-backed legal rules for verified claims through the Hybrid Legal Retriever and citation guardrails. | Hybrid Legal Retriever, Legal Corpus Store, Classification. |
| Classification | Classifies only from VerifiedProfile plus citation-backed legal matches. | Persistence, Gap Analysis. |
| Gap Analysis Worker | Converts completed RiskClassification plus citation-backed legal matches into structured compliance gaps, evidence gaps, citation gaps and remediation priorities before document generation. Blocks document generation when classification/legal basis is unusable. | Queue boundary, Persistence, Document Generation. |
| Document Generation | Generates output documents only after classification, gap analysis, and output guardrails. | Object storage, Persistence. |
| Audit | Records state-changing and compliance-critical actions without raw source/secrets/full prompts. | All components. |

## Communication Model

```text
User action
-> API command
-> persisted domain object
-> async event/job
-> worker transformation
-> persisted output object
-> next event or blocked state
```

Each major stage persists its output before the next stage runs. Hidden synchronous jumps across workflow gates are not allowed.

## Mandatory Architectural Invariants

- Manager can complete the active MVP flow without Developer assignment.
- OAuth/OIDC login is separate from GitHub App repository authorization.
- GitHub App read-only Repository Scan is the MVP golden technical-evidence path.
- `FR-050` Local/CI scanner report upload, `FR-051` manual technical evidence JSON upload and `FR-052` delegated technical clarification are Deferred/Future paths, not active MVP architecture paths.
- Developer collaboration is optional; Manager can complete the A-to-Z golden path without Developer participation.
- Structured attestation is optional supplemental input only. It cannot replace scanner metadata, independently unlock classification or finalize conflict resolution.
- Scanner is static-analysis only.
- Raw source, full prompts, secrets, and full AST bodies must not enter LLM, ordinary audit logs, or long-term persistence.
- Classification requires VerifiedProfile.
- Missing citation, unresolved conflict, insufficient evidence, or unknown critical usage blocks or degrades output.
- Provider/model/framework detection alone does not determine legal risk.
- Real LLM and embedding integration requires explicit provider/model configuration, credentials, token/cost controls and privacy boundaries.
- Legal-source use requires official-source validation, immutable snapshot, content hash, approval gate and approved `LegalCorpusVersion`.

## Detail Ownership

| Detail | Canonical Location |
|---|---|
| Domain behavior | `docs/specs/` |
| Runtime traces | `docs/developer-execution-blueprints/` |
| Technology/library/build details | `docs/implementation/` |
| Historical decisions | `docs/archive/decisions/` |
