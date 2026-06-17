# DEV-BLUEPRINT — STORY-01-02 — Shared Prototype Status and Guardrail Vocabulary

## 1. Implementation Objective
Add shared prototype status and blocked-reason vocabulary for later API/UI/worker usage.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| Shared enums | TypeScript | `packages/shared` | Used by Web/API |
| Contract exports | TypeScript | `packages/contracts` | Stable DTO values |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Shared | `packages/shared/status` | Status constants |
| Contracts | `packages/contracts/workflow` | API-safe status DTOs |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `packages/shared/src/status/prototype-status.ts` | Prototype/readiness statuses |
| CREATE | `packages/shared/src/status/blocked-reason.ts` | Blocked reason enum |
| CREATE | `packages/contracts/src/workflow/workflow-status.dto.ts` | Status DTO shape |
| MODIFY | `packages/shared/src/index.ts` | Export statuses |
| MODIFY | `packages/contracts/src/index.ts` | Export DTO |

## 5. Inputs
### UI Inputs
- Route: all future workflow pages consume status labels.
- Form fields: none.
- Validation rules: status must be known enum.
- UI state transitions: show locked/blocked/degraded without risk overclaim.
### API Inputs
- Method/Route: none for this story.
- Request JSON: none.
### Event / Job Inputs
- None.

## 6. Outputs
### API Response
Future shape:
```json
{ "state": "TECHNICAL_EVIDENCE_REQUIRED", "blocked_reason": "MISSING_VERIFIED_PROFILE" }
```
### Database Output
No records.
### Event / Job Output
No events.
### UI Output
Safe labels for readiness/prototype/block states.

## 7. Data Model and Migration
No migration. Enum values must align with `docs/specs/state-machine.md`.

## 8. Step-by-Step Implementation Algorithm
1. Define `PrototypeReadinessStatus` enum.
2. Define `WorkflowBlockedReason` enum.
3. Define `WorkflowStatusDto`.
4. Export from package indexes.
5. Add doc comments warning against production/validation claims.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Unknown status | 500 in future API mapping | Generic blocked state | Future audit reason `UNKNOWN_WORKFLOW_STATE` |

## 10. Security and Privacy Constraints
Labels must not include raw source, prompt text, secrets or legal conclusions.

## 11. Observability and Audit Requirements
Future state transitions should log safe reason codes only.

## 12. Tests to Implement
### Unit tests
Enum snapshot test in `packages/shared/src/status/*.spec.ts`.
### Integration tests
None.
### Contract tests
DTO schema export test.
### Manual smoke-test steps
Import enums in a temporary typecheck command when packages exist.

## 13. Local Run Commands
```bash
npm run test --workspace @lcsp/contracts
npm run test --workspace @lcsp/contracts
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Prototype statuses exist | `prototype-status.ts` | Unit snapshot |
| Blocked labels safe | `blocked-reason.ts` | Manual review |
| No readiness unlock | enum comments/docs | Manual review |

## 15. Dependencies and Implementation Order
Requires STORY-01-01.

## 16. Explicit Non-Goals
No UI implementation and no state-machine persistence.

## 17. Prototype Limitations
Vocabulary may expand after validation; production status model is not certified.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-01-02` into an executable controlled-prototype slice. The business outcome is: prototype status constants. It gives the developer exact ownership for package `@lcsp/contracts`, API route `/api/v1/health`, service `PrototypeFoundationService`, and persistence models `none`.

### Before coding

- Required completed predecessor stories: STORY-01-01.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-01-02/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `none` if the model does not already exist.
3. Create or update NestJS module files for `PrototypeFoundationController` and `PrototypeFoundationService` at the route `/api/v1/health`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `AuditEvent` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `none` when applicable; consumer emits `event.audit.created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: prototype status constants.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `status vocabulary`.
→ API route: `/api/v1/health`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `PrototypeFoundationService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `none` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `AuditEvent` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `none` and calls package `@lcsp/contracts`.
→ output state: API/UI exposes prototype status constants; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `none` rows.
- RabbitMQ emits or consumes `AuditEvent` / `event.audit.created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: prototype status constants.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
