# LCSP Implementation Readiness Certification

## Purpose

This document is the final implementation gate for the controlled MVP prototype. It answers whether engineering can start implementation, in what condition, and with which limitations.

It does not create new requirements, architecture, stories, backlog, validation material, implementation specs, code or tests.

## Scope Reviewed

### Product

| Area | Documents Reviewed | Result |
|---|---|---|
| Product context | `docs/product/system-context.md` | Scope, actors, journeys and outcomes defined. |
| Capability model | `docs/product/business-capability-map.md` | Capability ownership and dependencies defined. |

### Requirements

| Area | Documents Reviewed | Result |
|---|---|---|
| Use cases | `docs/specs/use-cases.md` | 18 canonical use cases recovered. |
| Functional requirements | `docs/specs/functional-requirements.md` | `FR-001..FR-052` normalized. |
| Non-functional requirements | `docs/specs/non-functional-requirements.md` | `NFR-001..NFR-030` normalized. |
| Acceptance criteria | `docs/specs/acceptance-criteria-catalog.md` | `AC-001..AC-026` normalized. |
| Traceability | `docs/specs/requirements-traceability-matrix.md` | UC -> FR -> AC -> domain spec -> state machine -> implementation area complete. |

### Domain

| Area | Documents Reviewed | Result |
|---|---|---|
| Entities | `docs/specs/domain-model.md` | Domain objects, owners and relationships defined. |
| Events | `docs/specs/event-catalog.md` | Canonical command/event names and choreography defined. |
| User/system flows | `docs/specs/user-task-flows.md` | Manager, Developer and system flows defined. |
| AIUsageFlow | `docs/specs/ai-usage-flow-domain-spec.md` | Claim rules, confidence, abstention and conflict behavior defined. |
| Legal Matching | `docs/specs/legal-matching-domain-spec.md` | Rule applicability, citation coverage and handoff defined. |
| State machines | `docs/specs/domain-state-machines.md` | Required domain state transitions defined. |

### Architecture

| Area | Documents Reviewed | Result |
|---|---|---|
| System architecture | `docs/architecture/architecture.md` | Components, communication model and invariants defined. |
| Scanner behavior | `docs/specs/scanner-spec.md` | Scanner contracts and boundaries defined. |
| Assessment lifecycle | `docs/specs/assessment-lifecycle-spec.md` | TechnicalProfile, AIUsageFlow, Reconciliation and VerifiedProfile flow defined. |
| Legal classification | `docs/specs/legal-classification-spec.md` | Legal matching and classification gates defined. |
| Documents | `docs/specs/document-generation-spec.md` | Document guardrails defined. |

### Implementation

| Area | Documents Reviewed | Result |
|---|---|---|
| Backend/API/Auth | `docs/implementation/backend-implementation.md` | API, auth, RBAC, audit and outbox boundaries defined. |
| Persistence | `docs/implementation/persistence-implementation.md` | Prisma schema, migration order and retention categories defined. |
| Queue | `docs/implementation/queue-implementation.md` | RabbitMQ topology, outbox and choreography defined. |
| Scanner | `docs/implementation/scanner-implementation.md` | Scanner stack, packages, parser contracts and build boundary defined. |
| LLM Gateway | `docs/implementation/llm-gateway-implementation.md` | External model boundary and privacy guardrails defined. |

## Readiness Checklist

| Area | Criteria | Status | Evidence |
|---|---|---|---|
| Product | Scope defined | READY | `system-context.md`, `business-capability-map.md` |
| Product | Actors defined | READY | Manager, Developer, LCSP System and external systems are defined. |
| Product | Business goals defined | READY | System outcomes and success metrics are defined. |
| Requirements | UC coverage | READY | `UC-001..UC-018` complete. |
| Requirements | FR coverage | READY | `FR-001..FR-052` complete. |
| Requirements | NFR coverage | READY | `NFR-001..NFR-030` complete. |
| Requirements | AC coverage | READY | `AC-001..AC-026` complete. |
| Domain | Entities | READY | Domain model defines required business entities. |
| Domain | Workflows | READY | User task flows and end-to-end lifecycle defined. |
| Domain | Events | READY | Canonical command/event catalog defined. |
| Domain | State machines | READY | Required state machines defined. |
| Architecture | Services | READY | Core components and worker responsibilities defined. |
| Architecture | Boundaries | READY | API/worker/persistence/legal/LLM boundaries defined. |
| Architecture | Ownership | READY | Capability and module ownership defined. |
| Architecture | Integration | READY | GitHub, OAuth/OIDC, RabbitMQ, Postgres, object storage and LLM gateway boundaries defined. |
| Implementation | APIs | READY | Backend implementation defines route/API boundaries and error contract. |
| Implementation | Queues | READY | RabbitMQ names, outbox, retry and worker queues defined. |
| Implementation | Database | READY | Canonical Prisma schema and migration order defined. |
| Implementation | Contracts | READY | DTO/event/domain contracts defined across specs/implementation docs. |
| Implementation | Workers | READY | Scanner, profile, AIUsageFlow, reconciliation, legal matching, classification and document worker sequence defined. |
| Traceability | UC -> FR | READY | Requirements matrix complete. |
| Traceability | FR -> AC | READY | Requirements matrix complete. |
| Traceability | AC -> implementation | READY | Requirements matrix maps ACs to implementation areas. |

## Critical Open Questions

### Critical

None for Wave 1 implementation start.

### High

None for controlled MVP implementation.

### Medium

None for controlled MVP implementation.

### Low

| Question | Why It Matters | Owner | Required Before |
|---|---|---|---|
| Final UI copy for Wizard help text | Affects usability polish. | Assessment Team | UX refinement |
| External alerting backend for production-like operations | Affects operations integration outside local controlled MVP. | Platform Team | Release-environment hardening |

## Phase 6.2A Integrated MVP Decisions

The following implementation decisions are now integrated into active source-of-truth documents:

| Area | Final Controlled MVP Decision |
|---|---|
| Scanner sandbox | Restricted temporary local filesystem workspace. |
| Scanner runtime | Python Worker (`lcsp-scanner-worker`) owning Repository Scan lifecycle with first-class Python AST/static-analysis; TypeScript analyzer integrated via subprocess. |
| Graph persistence | Metadata-only PostgreSQL graph using `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding` and `TechnicalEvidenceReport`; evidence paths embedded in `TechnicalFinding.metadata.evidencePath`. |
| Queue retry/DLQ | 3 attempts per worker with 30s, 120s and 600s exponential backoff plus jitter, then matching DLQ. |
| Retention | No raw source long-term persistence; evidence metadata retained 12 months; outbox retained 30 days after publish or 90 days when failed. |
| Local development | Standalone Python Worker + NestJS API workspace command contracts. |
| OAuth/OIDC | Local mock OIDC with provider-agnostic interface. |
| LLM | Real configured LLM provider mandatory for happy path. Mock mode restricted to unit tests and offline CI. |
| Legal corpus | Provenance-preserving legal corpus derived from approved government source URLs, indexed via pgvector + FTS for hybrid retrieval. |
| Object storage | Real S3-compatible object storage. Local filesystem adapter for local development only. |

## Risk Register

| Risk | Impact | Mitigation | Owner |
|---|---|---|---|
| Documentation drift between implementation and requirements | Developers may implement stale contracts. | Treat five active layers as source-of-truth and update only owning documents when contracts change. | Platform Team |
| Legal corpus incompleteness | Legal matching may block classification more often than expected. | Implement legal matching as citation-gated and block/degrade when citations are missing. | Legal Team |
| Scanner false confidence | AI risk may be inferred from weak technical signals. | Preserve provider-only abstention, evidence refs, coverage limitations and A2-b2 post-implementation acceptance. | Scanner Team |
| Queue/orchestration bugs | Workflow could skip gates or duplicate work. | Implement outbox, idempotency, state-machine checks and audit from Wave 1. | Platform Team |
| Raw source or secrets leak | Serious privacy/security failure. | Enforce scanner redaction, no raw-source-to-LLM, reference-only queue payloads and audit review. | Scanner Team + Platform Team |
| Manager/Developer permission confusion | Developer could perform final compliance action or Manager flow could deadlock. | Enforce Manager super-role and scoped Developer policy tests early. | Platform Team |
| LLM overclaim | Model output could appear as legal conclusion without citation. | Route all model calls through LLM Gateway and enforce citation guardrails in Legal/Document layers. | Legal Team |
| Test environment under-specification | Teams may diverge on local setup and fixture expectations. | Wave 1 includes baseline local verification commands and smoke path. | Platform Team |

## Certification Result

READY_FOR_CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_NOT_PRODUCTION

Implementation can start with Wave 1 foundations. The project is ready for controlled MVP prototype implementation, not production release.

## Explicit Non-Claims

- This certification does not mean production ready.
- This certification does not mean legally validated.
- This certification does not mean compliance certified.
- This certification does not mean formal legal reliability validation is complete.
- This certification does not mean A2-b2 runtime scanner accuracy acceptance is complete.
- This certification does not authorize customer onboarding or production deployment.
