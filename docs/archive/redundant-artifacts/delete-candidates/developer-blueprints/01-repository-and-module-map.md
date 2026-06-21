# Repository and Module Map

## Exact Top-Level Folder Structure

```text
apps/
  web/                 Next.js frontend
  api/                 NestJS REST API and WebSocket gateway
  worker/              Node.js worker for queues, scanner, orchestration
packages/
  contracts/           DTOs, event envelopes, UUID helpers, enums
  authz/               authorization policy and permission guards
  config/              environment schema and typed configuration
  logger/              structured logging and secret redaction
  scanner/             repository snapshot and static analysis
  ai-usage-flow/       deterministic evidence-to-usage-flow rules
  reconciliation/      profile comparison and conflict rules
  legal-rag/           corpus retrieval and citation guardrail
  audit/               immutable audit event contract
  test-fixtures/       synthetic prototype fixtures
prisma/
legal-corpus/
generated-artifacts/
docs/
```

## Frontend Folders

```text
apps/web/src/app/(auth)/login/
apps/web/src/app/(auth)/callback/
apps/web/src/app/(manager)/assessments/
apps/web/src/components/
apps/web/src/features/
apps/web/src/lib/api/
apps/web/src/lib/query/
apps/web/src/lib/validation/
```

## NestJS API Modules

```text
apps/api/src/auth/
apps/api/src/organizations/
apps/api/src/assessments/
apps/api/src/wizard/
apps/api/src/github/
apps/api/src/scans/
apps/api/src/evidence/
apps/api/src/ai-usage-flow/
apps/api/src/reconciliation/
apps/api/src/verified-profile/
apps/api/src/legal-rag/
apps/api/src/classification/
apps/api/src/gap-analysis/
apps/api/src/documents/
apps/api/src/audit/
apps/api/src/workflow-status/
```

## Node Worker Folders

```text
apps/worker/src/main.ts
apps/worker/src/consumers/
apps/worker/src/handlers/scan/
apps/worker/src/handlers/ai-usage-flow/
apps/worker/src/handlers/reconciliation/
apps/worker/src/handlers/classification/
apps/worker/src/handlers/gap-analysis/
apps/worker/src/handlers/document/
apps/worker/src/outbox/
```

## Package Folders

- `packages/contracts`: DTOs, event envelopes, UUID helpers, enums, error codes.
- `packages/authz`: permission enum, policy evaluator, guard support and endpoint-to-permission matrix.
- `packages/config`: environment schema and typed configuration.
- `packages/logger`: structured JSON logging and secret redaction.
- `packages/scanner`: GitHub snapshot inventory, ignore policy, Tree-sitter parsing, TS Compiler API pass, normalized findings.
- `packages/ai-usage-flow`: deterministic mapping rules from findings to AIUsageFlow claims.
- `packages/reconciliation`: WizardProfile versus TechnicalProfile/AIUsageFlow comparison and conflict rules.
- `packages/legal-rag`: ChromaDB retrieval, legal rule match format and citation guardrail.
- `packages/audit`: immutable audit event contract.
- `packages/test-fixtures`: synthetic prototype fixture specifications.
- `prisma`: Prisma schema and migrations.
- `legal-corpus`: prototype legal corpus metadata and local source artifacts.
- `generated-artifacts`: local generated output refs only; no raw source.

## Boundary Rules

- Web calls API only.
- API enforces authz, state transitions, transactions, audit writes and outbox command creation.
- Worker consumes RabbitMQ command queues and emits events.
- Scanner is static-analysis only and does not classify legal risk.
- AIUsageFlow mapping is deterministic and does not require LLM calls.
- LLM calls, if introduced later for allowed tasks, go only through a sanitized LLM Gateway boundary.
- No package may write raw source, secrets, full prompts or full AST bodies into PostgreSQL, RabbitMQ, audit events or ordinary evidence output.
