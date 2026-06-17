# Phase 5.2C Execution Blueprint Remediation Report

## Team Feedback Addressed

| Feedback | Remediation |
|---|---|
| Internal identifiers are inconsistent | Added UUIDv7 standard in `docs/developer-blueprints/08-uuid-and-identity-standard.md`; updated story payload examples to camelCase UUIDv7 fields. |
| Manager super-role policy unclear | Added `docs/developer-blueprints/09-manager-super-role-policy.md` with exact actors, permissions, guard chain, enum/decorator names, error codes and endpoint matrix. |
| Tools lack concrete operational purpose | Added `docs/developer-blueprints/10-tool-catalog-and-operational-purpose.md` with tool ID, package, owner, purpose, input, processing, output, non-goals, trigger, failure and audit behavior. |
| RabbitMQ topology unnamed | Added `docs/developer-blueprints/11-rabbitmq-topology-and-event-contracts.md` with exact exchanges, queues, routing keys, envelope, retry and DLQ rules. |
| Runtime/package management must use npm consistently | Added ADR-022 and `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`; remediated blueprints to TypeScript-first npm workspaces. |
| Blueprints do not explain what runs first and how input becomes output | Added `Build This Story From Zero` section to all 30 story blueprints with build order, controller/service/worker trace, data transition, messaging, output, failure and verification. |

## Architecture Decision: TypeScript-First npm Runtime

Created `docs/architecture/adr-022-typescript-first-npm-only-controlled-prototype.md`.

Decision:

```text
CONTROLLED_MVP_PROTOTYPE_RUNTIME:
TYPESCRIPT_FIRST_NPM_WORKSPACES
```

The controlled MVP prototype now uses Next.js, NestJS, Node.js worker, npm workspaces, Prisma/PostgreSQL, RabbitMQ/amqplib, Tree-sitter, TypeScript Compiler API, ChromaDB JavaScript client and TypeScript deterministic rule packages. Python runtime worker and Python LangGraph worker are removed from developer execution blueprints. Python semantic AST analysis is deferred; Python files receive Tree-sitter syntactic coverage only.

## UUID Standard

Created `docs/developer-blueprints/08-uuid-and-identity-standard.md`.

- All LCSP internal IDs use UUIDv7.
- PostgreSQL stores internal IDs as native UUID.
- Shared helper path: `packages/contracts/src/ids/create-uuid.ts`.
- Invalid UUID returns HTTP 400 `INVALID_UUID`.
- Unknown valid UUID returns HTTP 404 `RESOURCE_NOT_FOUND`.
- Queue messages carry `eventId`, `correlationId`, `causationId`, and `aggregateId`.

## Manager Super-Role Policy

Created `docs/developer-blueprints/09-manager-super-role-policy.md`.

The policy defines exactly `MANAGER`, `DEVELOPER`, and `SYSTEM_WORKER`. Authorization is deny-by-default. Manager can complete the active MVP prototype workflow alone. Developer is optional and cannot block Manager workflow transitions. No actor can mutate original scanner evidence, overwrite audit events, bypass VerifiedProfile/citation gates or send raw repository source to LLM.

## Tool Catalog and Operational Purpose

Created `docs/developer-blueprints/10-tool-catalog-and-operational-purpose.md`.

Covered tools:

- `GITHUB_APP_REPOSITORY_ACCESS`
- `REPOSITORY_SNAPSHOT_BUILDER`
- `STATIC_REPOSITORY_SCANNER`
- `AI_USAGE_FLOW_BUILDER`
- `RECONCILIATION_ENGINE`
- `LEGAL_RETRIEVAL_CITATION_GUARDRAIL`
- `CLASSIFICATION_WORKFLOW`
- `GAP_AND_DOCUMENT_WORKFLOW_SHELLS`

Each tool now has concrete package/library, owner module, input, processing steps, output, non-goals, trigger, failure behavior and audit event.

## RabbitMQ Topology

Created `docs/developer-blueprints/11-rabbitmq-topology-and-event-contracts.md`.

Exchanges:

- `lcsp.commands.v1`
- `lcsp.events.v1`
- `lcsp.deadletter.v1`

Queues and DLQs are named for scan, AIUsageFlow, reconciliation, classification, gap analysis and document workers. Retry is limited to three attempts; final failure goes to matching DLQ. Queue payloads never contain GitHub token, raw repository source, secret or prompt.

## Legacy Scope Resolution

Created `docs/developer-blueprints/15-legacy-scope-resolution.md`.

Active controlled MVP scope is OAuth/OIDC, Manager super-role, GitHub App repository scan, static technical evidence, AIUsageFlow, reconciliation, legal citation foundation, and classification/gap/document shells. GitLab, API probing, CLI, GitHub Action, CI/CD checks, legal monitoring crawler, enterprise SSO/SAML/SCIM, production deployment and A2-b2 remain deferred.

## Golden Path and Local Runbook

Created:

- `docs/developer-blueprints/13-manager-assessment-golden-path.md`
- `docs/developer-blueprints/14-from-zero-local-build-runbook.md`

The golden path now traces Manager action through UI route, HTTP endpoint, permission, DTO, NestJS controller/service, Prisma records, RabbitMQ command/event, worker/module processing, expected output, audit event and failure behavior.

## Story Blueprint Upgrade Coverage

| Story ID | Concrete Build Order | API/Event Defined | Data Transition Defined | Verification Defined |
|---|---|---|---|---|
| STORY-01-01 | Yes | Yes | Yes | Yes |
| STORY-01-02 | Yes | Yes | Yes | Yes |
| STORY-01-03 | Yes | Yes | Yes | Yes |
| STORY-02-01 | Yes | Yes | Yes | Yes |
| STORY-02-02 | Yes | Yes | Yes | Yes |
| STORY-02-03 | Yes | Yes | Yes | Yes |
| STORY-03-01 | Yes | Yes | Yes | Yes |
| STORY-03-02 | Yes | Yes | Yes | Yes |
| STORY-04-01 | Yes | Yes | Yes | Yes |
| STORY-04-02 | Yes | Yes | Yes | Yes |
| STORY-04-03 | Yes | Yes | Yes | Yes |
| STORY-04-04 | Yes | Yes | Yes | Yes |
| STORY-05-01 | Yes | Yes | Yes | Yes |
| STORY-05-02 | Yes | Yes | Yes | Yes |
| STORY-05-03 | Yes | Yes | Yes | Yes |
| STORY-06-01 | Yes | Yes | Yes | Yes |
| STORY-06-02 | Yes | Yes | Yes | Yes |
| STORY-06-03 | Yes | Yes | Yes | Yes |
| STORY-06-04 | Yes | Yes | Yes | Yes |
| STORY-07-01 | Yes | Yes | Yes | Yes |
| STORY-07-02 | Yes | Yes | Yes | Yes |
| STORY-07-03 | Yes | Yes | Yes | Yes |
| STORY-08-01 | Yes | Yes | Yes | Yes |
| STORY-08-02 | Yes | Yes | Yes | Yes |
| STORY-08-03 | Yes | Yes | Yes | Yes |
| STORY-08-04 | Yes | Yes | Yes | Yes |
| STORY-09-01 | Yes | Yes | Yes | Yes |
| STORY-09-02 | Yes | Yes | Yes | Yes |
| STORY-09-03 | Yes | Yes | Yes | Yes |
| STORY-09-04 | Yes | Yes | Yes | Yes |

## Explicit Prototype Limitations

This remediation does not create application source code, test source, CI/CD, Docker, infrastructure or deployment files. It does not authorize production deployment, validated production release, customer onboarding, formal legal reliability validation, independent legal opinion, compliance certification, runtime scanner accuracy claims or A2-b2 completion.

## Final Decision

EXECUTION_BLUEPRINTS_REMEDIATED_FOR_CONCRETE_DEVELOPER_IMPLEMENTATION

EXTERNAL_TEAM_CAN_START_STORY_LEVEL_TECHNICAL_REVIEW_WITHOUT_BMAD_REVIEW_GATES

NO_APPLICATION_CODE_CREATED_IN_PHASE_5_2C
