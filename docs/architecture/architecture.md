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
| Scanner / Evidence Worker | Produces static-analysis technical evidence from commit-pinned repository snapshots. | Queue boundary, Persistence. |
| AIUsageFlow Worker | Converts technical evidence and WizardProfile into business usage claims. | Persistence, Reconciliation. |
| Reconciliation | Compares Manager declarations and technical evidence; pauses for Manager resolution when needed. | Backend API, Persistence. |
| Legal Matching / RAG | Retrieves citation-backed legal rules for verified claims. | Legal corpus, Classification. |
| Classification | Classifies only from VerifiedProfile plus citation-backed legal matches. | Persistence, Gap Analysis. |
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
- Repository Scan is the active MVP technical evidence path.
- Scanner is static-analysis only.
- Raw source, full prompts, secrets, and full AST bodies must not enter LLM, ordinary audit logs, or long-term persistence.
- Classification requires VerifiedProfile.
- Missing citation, unresolved conflict, insufficient evidence, or unknown critical usage blocks or degrades output.
- Provider/model/framework detection alone does not determine legal risk.

## Detail Ownership

| Detail | Canonical Location |
|---|---|
| Domain behavior | `docs/specs/` |
| Runtime traces | `docs/developer-execution-blueprints/` |
| Technology/library/build details | `docs/implementation/` |
| Historical decisions | `docs/archive/decisions/` |
