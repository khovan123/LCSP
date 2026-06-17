# Prototype Technology Decisions

## Exact Chosen Stack

| Concern | Prototype Default | Responsibility |
|---|---|---|
| Runtime model | TypeScript-first npm workspaces | One package manager and one primary language runtime for controlled prototype implementation |
| Frontend | Next.js + TypeScript + App Router | Manager workspace, auth UI, workflow status and review screens |
| Frontend validation | Zod | Form/request validation schemas shared with API DTO intent |
| Frontend data fetching | TanStack Query | Server state, loading/error/blocked state handling |
| Frontend forms | React Hook Form | Wizard/auth/review form handling |
| Backend API | NestJS + TypeScript | REST API, auth, RBAC, assessment state, job creation, audit writes |
| Backend ORM | Prisma | PostgreSQL data access and migrations |
| Database | PostgreSQL | Authoritative LCSP state and audit metadata |
| Queue | RabbitMQ through `amqplib` | Async scan, AIUsageFlow, reconciliation, classification, gap and document jobs |
| Worker | Node.js + TypeScript | Queue consumers, scanner prototype, workflow/orchestrator handlers |
| Workflow orchestration | `@langchain/langgraph` | State-machine style orchestration only where applicable after VerifiedProfile gates |
| Static parse | Tree-sitter packages | Generic parser/fallback structure for TS/JS/Python syntax |
| TS/JS semantic analysis | TypeScript Compiler API | Import/symbol/call analysis for TS/JS only |
| Python coverage | Tree-sitter syntactic coverage only | Python semantic AST analysis is deferred from controlled MVP prototype |
| AI usage-flow | Deterministic TypeScript rule engine | Evidence-to-claim mapping without LLM dependency |
| Legal vector store | ChromaDB JavaScript client | Prototype legal retrieval collection |
| Object storage | MinIO with S3-compatible API | Local generated artifact storage |
| Auth | OAuth/OIDC with backend-verifiable session/token boundary | LCSP identity only, separate from GitHub App |
| API style | REST + JSON | HTTP API |
| API docs | NestJS OpenAPI decorators | OpenAPI generation |
| Observability | Structured JSON logs + correlation ID + audit persistence | Operator and validation trace |

## Version Strategy

- Use `npm` workspaces only.
- Commit `package-lock.json`.
- Use `npm ci` for automation and repeatable installs.
- Pin major versions in package manifests during implementation.
- Do not claim these defaults are production-approved.
- Avoid floating dependency ranges for runtime-critical dependencies.

## Prototype Defaults

- Commands exchange: `lcsp.commands.v1`.
- Events exchange: `lcsp.events.v1`.
- Dead-letter exchange: `lcsp.deadletter.v1`.
- Database schema namespace: application default schema, Prisma-managed.
- Local object storage bucket: `lcsp-prototype-artifacts`.
- ChromaDB collection: `lcsp_legal_rules_v0_1`.
- API prefix: `/api/v1`.
- Correlation header: `x-correlation-id`.
- Internal IDs: UUIDv7 generated through `packages/contracts/src/ids/create-uuid.ts`.

## Explicit Production Non-Claims

These decisions are prototype defaults only. They do not approve production deployment topology, production queue scaling, production object storage vendor, legal corpus reliability, formal legal validation, runtime scanner accuracy or A2-b2 completion.
