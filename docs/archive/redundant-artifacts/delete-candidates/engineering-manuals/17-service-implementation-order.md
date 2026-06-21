# 17 Service Implementation Order

## Purpose

Define exact dependency-aware implementation sequence from foundation to audit hardening.

Documentation only. No source/test/CI/Docker artifacts are created.

## Exact files to create

```text
docs/engineering-manuals/17-service-implementation-order.md
packages/contracts/
packages/database/
packages/messaging/
apps/api/
apps/worker/
apps/web/
packages/scanner/
packages/ai-usage-flow/
packages/reconciliation/
packages/legal-rag/
packages/document-generation/
packages/audit/
```

## Interfaces

```ts
interface ImplementationWave { wave: number; name: string; dependencies: string[]; deliverables: string[]; verification: string[] }
interface ImplementationDependency { from: string; to: string; reason: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `ImplementationWavePlanner` | Track manual-defined waves. | none | `listWaves()`, `firstUnblocked()` |
| `DependencyVerifier` | Verify predecessor outputs exist. | file/contract checks | `verifyWave()` |

## DTO Catalog

```ts
interface WaveReadinessDto { wave: number; status: 'READY' | 'BLOCKED'; missingDependencies: string[] }
```

## Database Schema

```prisma
// No additional runtime model. Implementation order consumes the canonical schema from 02-prisma-canonical-schema.md.
```

## State Machines

Wave order does not change product state. It protects implementation dependencies so later runtime states are not coded before predecessor contracts exist.

## Queue Catalog

Wave 1 defines envelope/outbox. Wave 3 starts scan queue. Wave 4 starts AIUsageFlow/reconciliation queues. Wave 5 starts classification queue. Wave 6 starts document queue. Wave 7 hardens audit across all queues.

## Algorithms

| Wave | Name | Dependencies | Deliverables | Verification |
|---:|---|---|---|---|
| 1 | Foundation | none | npm workspaces, contracts, Prisma schema, RabbitMQ envelope, auth/session skeleton | typecheck contracts, migrate DB, health ok |
| 2 | GitHub App | Wave 1 | GitHub module, repository connection, snapshot selection | Manager can connect repo and pin commit |
| 3 | Scanner | Waves 1-2 | snapshot builder, Tree-sitter, ts-morph, detector engine, report persistence | scan command produces TechnicalEvidenceReport |
| 4 | AIUsageFlow | Wave 3 | TechnicalProfile, AIUsageFlow rules, reconciliation conflicts | evidence-backed claims and VerifiedProfile/conflict |
| 5 | Classification | Wave 4 | Legal RAG foundation, citation guardrail, classification worker | classification blocks without VerifiedProfile/citation |
| 6 | Document generation | Wave 5 | gap analysis shell, document templates, output guardrail, storage metadata | document generated or blocked with reason |
| 7 | Audit hardening | all waves | redaction, audit queries, DLQ visibility, observability | every state transition traceable |

Pseudocode:
```text
for wave in waves:
  assert dependencies completed
  implement deliverables
  run listed verification
  do not begin dependent wave until contracts and migrations pass
```

No wave authorizes production deployment, formal legal reliability, A2-b2 completion, or runtime scanner accuracy claims.
