# LCSP Documentation Start Here

## Purpose

This is the only starting point for a new developer or reviewer. Do not start by opening implementation files. Implementation files are for build detail after the system shape and runtime flow are understood.

## Current Scope

All active documentation is scoped to the controlled MVP implementation. It describes the buildable MVP system, not production deployment, customer onboarding, compliance certification, formal legal validation or A2-b2 scanner accuracy acceptance.

Implementation tasks should be read as slices of the same MVP system. A task-specific section may define the next coding slice, but it is not a separate product scope and must not override the active MVP specs, implementation documents or code maps.

## Required Reading Order

Read in this exact order:

1. [architecture/architecture.md](./architecture/architecture.md)
2. [developer-execution-blueprints/end-to-end-execution.md](./developer-execution-blueprints/end-to-end-execution.md)
3. [specs/assessment-lifecycle-spec.md](./specs/assessment-lifecycle-spec.md)
4. [specs/scanner-spec.md](./specs/scanner-spec.md)
5. [implementation/backend-implementation.md](./implementation/backend-implementation.md)
6. [implementation/scanner-implementation.md](./implementation/scanner-implementation.md)
7. [code-map/README.md](./code-map/README.md)

## Do Not Start Here

Do not start with:

- `docs/implementation/`
- `docs/archive/`
- individual specs without reading architecture and end-to-end execution first
- scanner implementation before reading scanner spec and scanner data journey

## Single Source Of Truth Rules

| Concern | Authoritative Document |
|---|---|
| System components and why they exist | [architecture/architecture.md](./architecture/architecture.md) |
| End-to-end runtime flow | [developer-execution-blueprints/end-to-end-execution.md](./developer-execution-blueprints/end-to-end-execution.md) |
| Assessment lifecycle domain behavior | [specs/assessment-lifecycle-spec.md](./specs/assessment-lifecycle-spec.md) |
| Scanner findings, evidence, signals and rules | [specs/scanner-spec.md](./specs/scanner-spec.md) |
| Scanner object lifecycle and runtime flow | [developer-execution-blueprints/scanner-data-journey.md](./developer-execution-blueprints/scanner-data-journey.md) |
| Scanner code structure and packages | [implementation/scanner-implementation.md](./implementation/scanner-implementation.md) |
| Physical Prisma schema | [implementation/persistence-implementation.md](./implementation/persistence-implementation.md) |
| RabbitMQ topology and outbox | [implementation/queue-implementation.md](./implementation/queue-implementation.md) |
| Gap Analysis runtime flow | [developer-execution-blueprints/gap-analysis-blueprint.md](./developer-execution-blueprints/gap-analysis-blueprint.md) |
| Engineering module ownership | [code-map/README.md](./code-map/README.md) |

## Documentation Layers

```text
product/                       Why LCSP exists and business rules.
specs/                         What domain behavior must be true.
architecture/                  What components exist and why.
developer-execution-blueprints/ How runtime data moves through the system.
implementation/                How to build, configure and operate it.
code-map/                      What code modules will own APIs, DTOs, tables and queues.
archive/                       Decisions and delete candidates only; not a reading path.
```

## Scanner Ownership Rule

| Scanner Concern | Authoritative Source |
|---|---|
| Findings | `specs/scanner-spec.md` |
| Evidence | `specs/scanner-spec.md` |
| Signals | `specs/scanner-spec.md` |
| Detection rules | `specs/scanner-spec.md` |
| Object lifecycle | `developer-execution-blueprints/scanner-data-journey.md` |
| Runtime flow | `developer-execution-blueprints/scanner-data-journey.md` |
| Code structure | `implementation/scanner-implementation.md` |
| Packages | `implementation/scanner-implementation.md` |
| Prisma models | `implementation/persistence-implementation.md` |
| Queues | `implementation/scanner-implementation.md` and `code-map/` |


## Implementation Task Reading Rule

For implementation tasks, read in this order:

1. The relevant spec.
2. The relevant developer execution blueprint.
3. The relevant implementation document.
4. The relevant code map.

Do not read `docs/archive/` or old workflow reports for implementation authority.

## Ready To Code Rule

A developer may start coding only after they can answer:

1. Which module owns the change?
2. Which DTO enters the module?
3. Which table rows are read/written?
4. Which queue event is emitted or consumed?
5. Which output object is produced?
6. Which spec governs the behavior?
7. Which implementation doc governs file/package structure?

## Phase 5.5 Local Development Commands

Run local prototype commands in this order:

```text
npm install
npm run db:generate
npm run db:migrate
npm run dev:api
npm run dev:worker
npm run dev:web
npm run test
npm run test:scanner
npm run smoke:scan-fixture
```

Smoke scan fixture expected behavior:

1. Seed organization, Manager, assessment, WizardProfile and RepositorySnapshot.
2. Send `POST /api/v1/assessments/:assessmentId/scans`.
3. Confirm `RepositoryScanJob` is `REQUESTED`.
4. Confirm `OutboxEvent` routing key is `command.scan.requested.v1`.
5. Run worker.
6. Confirm `TechnicalEvidenceReport` is created.
7. Confirm `OutboxEvent` routing key is `event.scan.completed.v1`.
8. Confirm `command.technical-profile.requested.v1` and `command.ai-usage-flow.requested.v1` are enqueued in order or blocked with explicit reason.
9. For full MVP smoke, continue the chain through Reconciliation, Legal Matching, Classification, Gap Analysis and Document Generation using only canonical `command.*` and `event.*` routing keys.

Canonical queue names use `command.*` for requested work and `event.*` for completed/failed facts. Unprefixed legacy scan routing keys are not valid active contracts.
