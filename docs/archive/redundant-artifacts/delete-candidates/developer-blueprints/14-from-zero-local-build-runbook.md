# From-Zero Local Build Runbook

## Scope

This is a controlled MVP prototype local build guide. It does not create CI/CD, Docker, deployment infrastructure or production authorization.

## Steps

| Step | Command / Action | Expected Output |
|---:|---|---|
| 1 | Install Node version defined by repository `.nvmrc` or runtime doc | `node --version` prints the approved version |
| 2 | `npm install` | `package-lock.json` is honored; workspaces install without pnpm/yarn/bun |
| 3 | Copy `.env.example` to `.env` | `.env` exists locally and contains references/placeholders only |
| 4 | Start local PostgreSQL, RabbitMQ, ChromaDB and MinIO by approved local method | DB accepts connections; RabbitMQ management shows no production queues yet |
| 5 | `npm run db:generate` | Prisma client generated successfully |
| 6 | `npm run db:migrate` | Migration summary shows all migrations applied |
| 7 | `npm run db:seed` | Console prints seeded organization, Manager user and assessment UUIDv7 values |
| 8 | `npm run dev --workspace @lcsp/api` | API log prints `api.ready` and `/api/v1/health` returns `{ "status": "ok" }` |
| 9 | `npm run dev --workspace @lcsp/worker` | Worker log prints `worker.ready` and declared RabbitMQ queues exist |
| 10 | `npm run dev --workspace @lcsp/web` | Web app renders login route locally |
| 11 | Open `GET /api/v1/health` | HTTP 200 `{ "status": "ok" }` |
| 12 | Seed or select synthetic fixture organization/assessment | DB contains UUIDv7 `assessmentId`; no real customer source |
| 13 | Run one synthetic scan through API | `RepositoryScanJobDto.status = REQUESTED`; RabbitMQ receives `command.scan.requested.v1` |
| 14 | Inspect PostgreSQL | `TechnicalEvidenceReport`, `TechnicalFinding`, `AuditEvent` rows appear after worker completes |
| 15 | Inspect RabbitMQ | command queue drains; no message in DLQ for happy path |
| 16 | Inspect UI | Manager sees scan completed or explicit blocked state with correlation ID |

## Required Failure Checks

| Check | Expected Result |
|---|---|
| Invalid UUID in route | HTTP 400 `INVALID_UUID` |
| Unknown valid UUID | HTTP 404 `RESOURCE_NOT_FOUND` |
| Developer tries to start scan | HTTP 403 `PERMISSION_DENIED` |
| Missing VerifiedProfile classification request | HTTP 422 `GATE_PRECONDITION_FAILED` |
| Missing citation document request | HTTP 422 `CITATION_REQUIRED` or `DOCUMENT_GENERATION_BLOCKED` |
| Queue consumer throws transient error | retry up to three times, then matching DLQ |
| Secret-like value in finding | persisted output contains redacted value only |

## Local Non-Claims

A successful local run proves only that the controlled prototype path is wired locally. It does not prove production readiness, legal reliability, compliance certification, scanner runtime accuracy or A2-b2 completion.
