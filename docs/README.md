# LCSP Documentation Start Here

## Purpose

This is the starting point for developers, reviewers, UX, and story planning. Active documents describe the A-to-Z runnable MVP, not production deployment, customer onboarding, legal certification, or completed implementation readiness.

## Current Planning Status

```text
ACTIVE_DOCS_PRE_UX_SYNCHRONIZED
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```

## Required Reading Order

1. [product/system-context.md](./product/system-context.md)
2. [product/prd.md](./product/prd.md)
3. [specs/use-cases.md](./specs/use-cases.md)
4. [specs/user-task-flows.md](./specs/user-task-flows.md)
5. [architecture/architecture.md](./architecture/architecture.md)
6. [developer-execution-blueprints/end-to-end-execution.md](./developer-execution-blueprints/end-to-end-execution.md)
7. [specs/assessment-lifecycle-spec.md](./specs/assessment-lifecycle-spec.md)
8. [specs/scanner-spec.md](./specs/scanner-spec.md)
9. [implementation/README.md](./implementation/README.md)
10. [code-map/README.md](./code-map/README.md)

UX work should focus on items 1-4 plus requirements/acceptance catalogs. Engineering work additionally reads items 5-10 after implementation readiness is certified.

## Single Sources of Truth

| Concern | Authoritative Document |
|---|---|
| Product scope and actors | `product/system-context.md`, `product/prd.md` |
| Canonical requirements | `specs/functional-requirements.md`, `specs/non-functional-requirements.md` |
| Use cases and user flows | `specs/use-cases.md`, `specs/user-task-flows.md` |
| Acceptance criteria | `specs/acceptance-criteria-catalog.md` |
| Traceability | `specs/requirements-traceability-matrix.md` |
| System components | `architecture/architecture.md`, active ADRs |
| End-to-end runtime | `developer-execution-blueprints/end-to-end-execution.md` |
| Assessment lifecycle | `specs/assessment-lifecycle-spec.md` |
| Scanner behavior | `specs/scanner-spec.md`, `specs/python-scanner-spec.md` |
| Scanner runtime journey | `developer-execution-blueprints/scanner-data-journey.md` |
| Build details | `implementation/` |
| Code ownership | `code-map/` |
| Physical persistence | `implementation/persistence-implementation.md` |
| Queues/outbox | `implementation/queue-implementation.md` |

## Documentation Layers

```text
product/                        product purpose, actors, business rules
specs/                          canonical behavior and requirements
architecture/                   components and decisions
planning-artifacts/             change/readiness/remediation reports
developer-execution-blueprints/ runtime data journeys
implementation/                 build/configuration specifications
code-map/                       planned module ownership
change-control/                 approved scope changes
archive/                        historical evidence only
```

Do not use `docs/archive/` as implementation or UX authority.

## Active MVP Runtime Shape

```text
apps/api                 NestJS API
apps/web                 Manager and optional Developer web UX
apps/worker              Node.js downstream workers
lcsp-scanner-worker      standalone Python Scanner Worker
tools/ts-js-analyzer     Node.js subprocess used by Python Worker
PostgreSQL + pgvector
RabbitMQ
S3-compatible object storage
real LLM and embedding providers for A-to-Z acceptance
```

## Scanner Ownership

| Concern | Owner |
|---|---|
| Scan request/job query | NestJS API |
| Scan lifecycle | Python Worker |
| Python AST/CST | Python Worker |
| TS/JS semantic analysis | Node subprocess controlled by Python Worker |
| Findings/taxonomy | `specs/scanner-spec.md` |
| Runtime object journey | `developer-execution-blueprints/scanner-data-journey.md` |
| Persistence/queues | implementation docs and code maps |

## Legal Corpus UX Boundary

Corpus ingestion, review, approval, and index build are internal operations/API/CLI for MVP. `bmad-ux` designs Manager and optional Developer product experiences; it does not create customer-facing corpus administration screens.

## Planned Local Development Commands

These commands are contracts for the future implementation and are not evidence that code already exists:

```text
# infrastructure and Node services
npm install
npm run db:generate
npm run db:migrate
npm run dev:api
npm run dev:worker
npm run dev:web

# Python scanner
cd lcsp-scanner-worker
poetry install
poetry run pytest
poetry run python -m lcsp_scanner.main

# TS/JS analyzer
cd ../tools/ts-js-analyzer
npm install
npm run build
npm test

# integrated validation after implementation
npm run test
npm run smoke:a-to-z
```

An A-to-Z acceptance run additionally requires:

- real PostgreSQL/RabbitMQ;
- real S3-compatible object storage;
- validated official legal source snapshots and approved corpus version;
- completed FTS/pgvector index;
- configured real LLM and embedding provider/model;
- golden repository fixture;
- audit/export verification.

## Ready-to-Code Rule

Coding begins only after canonical UX and epics/stories exist and `bmad-check-implementation-readiness` certifies the remediated set. Until then:

```text
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```