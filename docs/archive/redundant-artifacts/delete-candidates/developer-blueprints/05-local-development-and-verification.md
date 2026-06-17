# Local Development and Verification

## Prerequisites

- Node.js version defined by repository `.nvmrc` or documented runtime file.
- npm only.
- PostgreSQL.
- RabbitMQ.
- ChromaDB local service.
- MinIO or S3-compatible local storage.

## Environment Categories

- `DATABASE_URL`
- `RABBITMQ_URL`
- `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`
- `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY_REF`, `GITHUB_WEBHOOK_SECRET_REF`
- `CHROMA_URL`
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_REF`, `S3_SECRET_KEY_REF`
- `LCSP_LOG_LEVEL`
- `LCSP_PROTOTYPE_MODE=true`

No real secret value belongs in documentation or committed `.env` examples.

## Local Service Start Order

1. Install packages: `npm install`.
2. Generate Prisma client: `npm run db:generate`.
3. Run migrations: `npm run db:migrate`.
4. Seed synthetic data: `npm run db:seed`.
5. Start API: `npm run dev --workspace @lcsp/api`.
6. Start worker: `npm run dev --workspace @lcsp/worker`.
7. Start web: `npm run dev --workspace @lcsp/web`.

## Health Checks

| Service | Command / URL | Expected Output |
|---|---|---|
| API | `curl http://localhost:3000/api/v1/health` | `{ "status": "ok" }` |
| Worker | `npm run worker --workspace @lcsp/worker` | log line containing `worker.ready` |
| Web | `http://localhost:3001` | Login page renders |
| RabbitMQ | Management UI or queue inspection | named queues from topology exist |
| DB | `npm run db:generate` then migration status | Prisma client generated and migrations applied |

## Smoke Verification

Use the golden path in `docs/developer-blueprints/13-manager-assessment-golden-path.md`. Expected smoke result is a prototype assessment that reaches either VerifiedProfile-ready state or a documented blocked state with audit events and no raw-source leakage.
