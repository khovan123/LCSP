# DEV-BLUEPRINT — STORY-01-01 — Prototype Runtime Boundary Setup

## 1. Implementation Objective
Create prototype repository/module boundaries so future work lands in the correct Web/API/Worker/scanner/shared areas.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| Monorepo folders | TypeScript npm workspace layout | `apps/*`, `packages/*` | Matches architecture boundaries |
| API boundary | NestJS | `apps/api` | API owns auth/RBAC/job creation |
| Worker boundary | Node.js + TypeScript | `apps/worker` | Scanner/agent workloads outside API lifecycle |
| Contracts | TypeScript | `packages/contracts` | Shared DTO/event definitions |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Web | `apps/web` | UI calls API only |
| API | `apps/api` | HTTP, RBAC, job creation |
| Worker | `apps/worker` | Queue jobs and orchestrator |
| Scanner | `apps/worker/scanner` | Static-analysis-only scanner |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `apps/web/README.md` | Web boundary notes |
| CREATE | `apps/api/README.md` | API boundary notes |
| CREATE | `apps/worker/README.md` | Worker boundary notes |
| CREATE | `apps/worker/scanner/README.md` | Static scanner boundary |
| CREATE | `apps/worker/ts-analyzer/README.md` | TS analyzer sidecar boundary |
| CREATE | `packages/contracts/README.md` | DTO/event contract boundary |
| CREATE | `packages/config/README.md` | Config contract boundary |
| CREATE | `packages/shared/README.md` | Shared vocabulary boundary |
| CREATE | `packages/rules/README.md` | Deterministic rules boundary |
| CREATE | `packages/ui/README.md` | UI primitives boundary |
| CREATE | `legal-corpus/README.md` | Legal corpus artifact boundary |
| CREATE | `scanner-rulesets/README.md` | Scanner ruleset boundary |
| CREATE | `test-fixtures/README.md` | Fixture boundary |
| NO_CHANGE | `docs/implementation-readiness.md` | Do not change readiness |

## 5. Inputs
### UI Inputs
- Route: none.
- Form fields: none.
- Validation rules: none.
- UI state transitions: none.
### API Inputs
- HTTP method: none.
- Route: none.
- Headers: none.
- Authentication requirement: none.
- Role requirement: none.
- Request JSON example: none.
### Event / Job Inputs
- RabbitMQ exchange: none.
- Routing key: none.
- Job payload JSON: none.
- Idempotency key: none.
- Retry policy: none.

## 6. Outputs
### API Response
- Success JSON: none.
- Error JSON: none.
- Status codes: none.
### Database Output
- Models changed: none.
- Records created/updated: none.
- Audit events created: none.
### Event / Job Output
- Produced events: none.
- Consumer behavior: none.
- State updates: none.
### UI Output
- Success state: repository boundary docs visible.
- Loading/Error/Blocked state: not applicable.

## 7. Data Model and Migration
No Prisma model or migration. This story is folder/boundary scaffolding only.

## 8. Step-by-Step Implementation Algorithm
1. Create the listed directories if absent.
2. Add non-executable README boundary notes.
3. State allowed and forbidden dependencies in each README.
4. Verify no package manifest, source file, Dockerfile, CI workflow or test scaffold was added.
5. Verify readiness status files are unchanged.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Directory already exists | No HTTP/job | Preserve existing content; append boundary note only if safe | None |
| Boundary conflict found | No HTTP/job | Stop and update story/report before coding | None |

## 10. Security and Privacy Constraints
No raw source, secrets, tokens or production config values in README files.

## 11. Observability and Audit Requirements
No runtime audit. Future audit vocabulary belongs in `packages/shared`.

## 12. Tests to Implement
### Unit tests
None.
### Integration tests
None.
### Contract tests
None.
### Manual smoke-test steps
Run `find apps packages legal-corpus scanner-rulesets test-fixtures -maxdepth 2 -type f` and inspect boundary docs.

## 13. Local Run Commands
```bash
find apps packages legal-corpus scanner-rulesets test-fixtures -maxdepth 2 -type f
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Boundaries represented | README files above | Manual tree inspection |
| Web/API/Worker rules explicit | `apps/*/README.md` | Manual review |
| No forbidden artifacts | repo root | `git status --short` |

## 15. Dependencies and Implementation Order
First eligible story. No predecessor.

## 16. Explicit Non-Goals
No code, package manifests, CI/CD, Docker, infra, auth, scanner, DB or tests.

## 17. Prototype Limitations
Boundary scaffolding only; no runtime behavior.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-01-01` into an executable controlled-prototype slice. The business outcome is: prototype boundaries. It gives the developer exact ownership for package `@lcsp/contracts`, API route `/api/v1/health`, service `PrototypeFoundationService`, and persistence models `none`.

### Before coding

- Required completed predecessor stories: none.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-01-01/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `none` if the model does not already exist.
3. Create or update NestJS module files for `PrototypeFoundationController` and `PrototypeFoundationService` at the route `/api/v1/health`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: prototype boundaries.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `repository/module boundary setup`.
→ API route: `/api/v1/health`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `PrototypeFoundationService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `none` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/contracts`.
→ output state: API/UI exposes prototype boundaries; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `none` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: prototype boundaries.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
