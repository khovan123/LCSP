# DEV-BLUEPRINT — STORY-01-03 — Prototype Configuration and Environment Boundary

## 1. Implementation Objective
Create typed prototype configuration categories with no real secrets and clear provider adapter boundaries.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| Config schema | Zod | `packages/config` | Runtime-safe env validation |
| API config | NestJS ConfigModule | `apps/api` | Backend config injection |
| Worker config | Zod settings | `apps/worker/src/config` | Worker TypeScript configuration validation |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Shared config | `packages/config` | TS env schema |
| API | `apps/api/src/config` | NestJS config loading |
| Worker | `apps/worker/src/config` | Zod settings |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `packages/config/src/env-schema.ts` | Zod env schema |
| CREATE | `packages/config/src/config-keys.ts` | Key names |
| CREATE | `apps/api/src/config/app-config.module.ts` | Nest config boundary |
| CREATE | `apps/worker/src/config/worker.config.ts` | Zod settings |
| CREATE | `.env.example` | Placeholder keys only |

## 5. Inputs
### UI Inputs
None.
### API Inputs
Environment categories: database, RabbitMQ, OAuth/OIDC, GitHub App, MinIO, ChromaDB, LLM Gateway.
### Event / Job Inputs
None.

## 6. Outputs
### API Response
Future health/config check:
```json
{ "status": "ok", "missing_config": [] }
```
### Database Output
None.
### Event / Job Output
None.
### UI Output
None.

## 7. Data Model and Migration
No migration.

## 8. Step-by-Step Implementation Algorithm
1. Define config key constants.
2. Define Zod env schema.
3. Define Zod worker settings with matching key names.
4. Add `.env.example` with empty placeholders.
5. Ensure no real secret value is committed.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Missing required config | API/worker startup fails | Service unavailable | Log safe key category only |
| Invalid secret reference | Startup fails | Service unavailable | Log safe key category only |

## 10. Security and Privacy Constraints
Do not log secret values. `.env.example` contains placeholders only.

## 11. Observability and Audit Requirements
Startup logs may include config category readiness, not values.

## 12. Tests to Implement
### Unit tests
Zod and Zod schema validation.
### Integration tests
API startup fails with missing required category.
### Contract tests
TypeScript workspace key-name parity test.
### Manual smoke-test steps
Run config validation with `.env.example`.

## 13. Local Run Commands
```bash
npm run test --workspace @lcsp/config
npm run test --workspace @lcsp/worker/config
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Config categories exist | `env-schema.ts`, `worker.config.ts` | Unit tests |
| No real secrets | `.env.example` | Manual review |
| Local/prod distinct | key names/comments | Manual review |

## 15. Dependencies and Implementation Order
Requires STORY-01-01. Blocks STORY-02-01.

## 16. Explicit Non-Goals
No production secret manager, deployment manifest or provider finalization.

## 17. Prototype Limitations
Defaults are local prototype choices and are not production-approved.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-01-03` into an executable controlled-prototype slice. The business outcome is: prototype config boundaries. It gives the developer exact ownership for package `@lcsp/contracts`, API route `/api/v1/health`, service `PrototypeFoundationService`, and persistence models `none`.

### Before coding

- Required completed predecessor stories: STORY-01-01.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-01-03/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `none` if the model does not already exist.
3. Create or update NestJS module files for `PrototypeFoundationController` and `PrototypeFoundationService` at the route `/api/v1/health`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: prototype config boundaries.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `environment category definitions`.
→ API route: `/api/v1/health`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `PrototypeFoundationService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `none` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/contracts`.
→ output state: API/UI exposes prototype config boundaries; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `none` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: prototype config boundaries.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
