# 16 Local Development Bootstrap Manual

## Purpose

Define exact local setup commands, npm workspace creation, service startup order, env vars, and verification commands.

Documentation only. No source/test/CI/Docker artifacts are created.

## Exact files to create

```text
package.json
apps/web/
apps/api/
apps/worker/
packages/contracts/
packages/database/
packages/scanner/
packages/ai-usage-flow/
packages/reconciliation/
packages/legal-rag/
packages/audit/
.env.local.example
```

## Interfaces

```ts
interface LocalRuntimeService { name: string; port?: number; healthCheck: string; required: boolean }
interface EnvVarSpec { key: string; required: boolean; secret: boolean; purpose: string }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `HealthController` | Local health. | dependency checks | `getHealth()` |
| `DependencyHealthService` | Check Postgres/RabbitMQ/Chroma/MinIO. | clients | `checkAll()` |
| `SeedService` | Seed prototype data. | Prisma | `seedManager()`, `seedLegalCorpus()` |

## DTO Catalog

```ts
interface LocalHealthDto { status: 'ok' | 'degraded'; dependencies: Record<string, 'ok' | 'failed'> }
interface SeedResultDto { managerUserId: string; organizationId: string; legalCorpusVersion: string }
```

## Database Schema

```prisma
// Local uses the full schema from 02-prisma-canonical-schema.md.
// Seed data: Manager user, Organization, prototype legal corpus metadata, synthetic fixture refs.
```

## State Machines

API and audit enforce all state transitions from `01-system-state-machines.md`. Local bootstrap and implementation order do not alter runtime state.

## Queue Catalog

Local RabbitMQ must create `lcsp.commands.v1`, `lcsp.events.v1`, `lcsp.deadletter.v1`, all worker queues, retry policies, and DLQs from `04-rabbitmq-message-catalog.md`.

## Algorithms

Commands to implement/use later:

```text
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev --workspace @lcsp/api
npm run dev --workspace @lcsp/worker
npm run dev --workspace @lcsp/web
npm run health --workspace @lcsp/api
```

Environment variables:
```text
DATABASE_URL=
RABBITMQ_URL=
OIDC_ISSUER=
OIDC_CLIENT_ID=
OIDC_CLIENT_SECRET=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_WEBHOOK_SECRET=
CHROMA_URL=
OBJECT_STORAGE_ENDPOINT=
OBJECT_STORAGE_BUCKET=
SCANNER_WORKSPACE_ROOT=
```

Run order: PostgreSQL -> RabbitMQ -> ChromaDB -> MinIO -> Prisma migrate/seed -> API -> worker -> web -> health -> Manager smoke path.

Expected output: health returns `ok`, queues are bound, DB migrations applied, Manager can create assessment and request scan with synthetic data.
