# DEV-BLUEPRINT — STORY-06-03 — VerifiedProfile Builder and Approval Gate

## 1. Implementation Objective
Implement the controlled MVP prototype slice for **VerifiedProfile Builder and Approval Gate** so developers have exact service, data, API, event and verification guidance without claiming production readiness.

## 2. Technology Ownership
| Concern | Chosen Technology | Library / Module | Reason |
|---|---|---|---|
| Frontend | Next.js + TypeScript App Router | `apps/web` | Manager UI and blocked-state visibility |
| API | NestJS + TypeScript | `apps/api/src/modules/reconciliation` | REST JSON, guards, transactions and audit emission |
| ORM / DB | Prisma + PostgreSQL | `prisma/schema.prisma` | Canonical persistence and versioned metadata |
| Async | RabbitMQ | `lcsp.commands.v1` / `lcsp.events.v1` exchanges | Long-running scan/classification/document work outside API |
| Worker | Node.js + TypeScript + Zod + @langchain/langgraph | `apps/worker/src` | Deterministic workflow node and schema validation |

## 3. Service Ownership
| Layer | Service / Module | Responsibility |
|---|---|---|
| Web | `apps/web/src/features/reconciliation` | Manager-facing action, loading/error/blocked state |
| API | `reconciliation / audit` | Request validation, authorization, transaction, audit, event publication |
| Worker | `worker.handlers.reconciliation` | Async node processing where required |
| Persistence | Prisma/PostgreSQL | ConflictRecord, ConflictResolution, VerifiedProfile, AuditEvent |

## 4. Exact File Plan
| Action | Exact Path | Purpose |
|---|---|---|
| CREATE | `apps/api/src/modules/reconciliation/verifiedprofile-builder-and-approval-gate.controller.ts` | REST endpoint boundary |
| CREATE | `apps/api/src/modules/reconciliation/verifiedprofile-builder-and-approval-gate.service.ts` | State validation, transaction and audit orchestration |
| CREATE | `apps/api/src/modules/reconciliation/dto/verifiedprofile-builder-and-approval-gate.dto.ts` | Request/response DTOs and OpenAPI decorators |
| CREATE | `apps/api/src/modules/reconciliation/repositories/verifiedprofile-builder-and-approval-gate.repository.ts` | Prisma data access boundary |
| CREATE | `apps/worker/src/reconciliation/verifiedprofile_builder_and_approval_gate-handler.ts` | Node worker handler for queue/orchestrator processing |
| CREATE | `apps/worker/src/reconciliation/schemas.ts` | Zod input/output schemas |
| MODIFY | `prisma/schema.prisma` | Add or extend ConflictRecord, ConflictResolution, VerifiedProfile, AuditEvent models |
| CREATE | `packages/contracts/src/reconciliation/verifiedprofile-builder-and-approval-gate.ts` | Shared DTO/event/job contracts |
| CREATE | `apps/web/src/app/(app)/reconciliation/page.tsx` | Manager-facing route when UI is needed |
| CREATE | `apps/web/src/features/reconciliation/verifiedprofile-builder-and-approval-gate.tsx` | Feature component/hook boundary |

## 5. Inputs

### UI Inputs
- Route: `/app/reconciliation` or story-specific nested route.
- Form fields: IDs/references required for Resolved reconciliation state; no raw source, secrets or full prompts.
- Validation rules: Zod schema mirrors API DTO; required IDs use UUID or canonical external reference format.
- UI state transitions: idle -> submitting/loading -> success, error or blocked.

### API Inputs
- HTTP method: `POST` for command actions, `GET` for status/read models.
- Route: `/api/v1/verified-profiles/{assessmentId}`.
- Headers: `Authorization: Bearer <session_token>`, `x-correlation-id`, optional `Idempotency-Key` for commands.
- Authentication requirement: active OAuth/OIDC-backed LCSP session.
- Role requirement: Manager unless explicitly read-only.
- Request JSON example:
```json
{
  "assessmentId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "inputReference": "ref:06-03-prototype",
  "correlationId": "018f2b90-7d80-7c5f-9c42-5892d11c2f21"
}
```

### Event / Job Inputs
- RabbitMQ exchange: `lcsp.commands.v1` for commands and `lcsp.events.v1` for events.
- Routing key: `command.reconciliation.requested.v1` when async work is required.
- Job payload JSON:
```json
{
  "jobId": "018f2b8d-7d80-7c5f-9c42-5892d11c2f21",
  "assessmentId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "workflowRunId": "018f2b8e-7d80-7c5f-9c42-5892d11c2f21",
  "inputReference": "ref:06-03-prototype",
  "requestedBy": "018f2b8f-7d80-7c5f-9c42-5892d11c2f21",
  "correlationId": "018f2b90-7d80-7c5f-9c42-5892d11c2f21"
}
```
- Idempotency key: `assessmentId + story action + inputReference`.
- Retry policy: retry transient worker/provider/storage failures; do not retry validation, authorization or invariant failures.

## 6. Outputs

### API Response
- Success JSON:
```json
{
  "status": "ACCEPTED",
  "assessmentId": "018f2b8c-7d80-7c5f-9c42-5892d11c2f21",
  "outputReference": "ref:06-03-output",
  "correlationId": "018f2b90-7d80-7c5f-9c42-5892d11c2f21"
}
```
- Error JSON:
```json
{
  "code": "LCSP_PRECONDITION_FAILED",
  "message": "Required prerequisite is missing or blocked.",
  "correlationId": "018f2b90-7d80-7c5f-9c42-5892d11c2f21"
}
```
- Status codes: 200/202 for accepted reads or commands, 400 validation error, 401 unauthenticated, 403 unauthorized, 409 state conflict, 422 invariant/precondition failure.

### Database Output
- Models changed: ConflictRecord, ConflictResolution, VerifiedProfile, AuditEvent.
- Records created/updated: reference-only metadata, versioned workflow output and immutable audit event.
- Audit events created: story-specific command accepted, blocked, failed and completed events.

### Event / Job Output
- Produced events: requested/started/completed/failed events for async node work.
- Consumer behavior: validate payload, reload canonical DB refs, enforce state preconditions, persist output, emit audit.
- State updates: only allowed state-machine transitions; blocked transition preserves prior state.

### UI Output
- Success state: show VerifiedProfile version and classification-ready gate.
- Loading state: show progress or pending workflow state.
- Empty state: explain missing prerequisite without implying validation completion.
- Error state: show redacted error code and correlation ID.
- Blocked state: identify missing evidence, VerifiedProfile, citation or authorization prerequisite.

## 7. Data Model and Migration
Use Prisma migrations to add or extend ConflictRecord, ConflictResolution, VerifiedProfile, AuditEvent. Store IDs, hashes, refs, status, timestamps, version fields and audit correlation IDs. Do not persist raw source, full prompts, secrets or full AST bodies.

## 8. Step-by-Step Implementation Algorithm
1. Validate request DTO with NestJS validation pipe and shared contract schema.
2. Verify active session and Manager authority for the assessment scope.
3. Load predecessor state required by `STORY-06-02` and fail closed if absent or blocked.
4. Start a PostgreSQL transaction for command persistence.
5. Persist reference-only command/output metadata in the owning Prisma model.
6. Create immutable `AuditEvent` with `assessmentId`, `workflowRunId`, actor, action, status and `correlationId`.
7. Publish RabbitMQ job/event only after commit when async processing is required.
8. Worker reloads referenced records, validates Zod schema, executes deterministic node logic, and persists result.
9. Return DTO or progress status without exposing secret, raw source, full prompt or unsupported legal conclusion.

## 9. Error Handling and Fail-Safe Behavior
| Condition | HTTP / Job Result | User-visible Result | Audit Requirement |
|---|---|---|---|
| Missing authentication | 401 | Sign in required | Optional security event |
| Non-Manager command | 403 | Manager permission required | `PERMISSION_DENIED` |
| Missing predecessor `STORY-06-02` | 409/422 | Required previous step is incomplete | Blocked transition audit |
| Invalid DTO or payload | 400 / dead-letter if job | Correct request data | Validation failure audit for commands |
| Transient queue/worker/storage failure | 202 then failed/retry state | Operation retrying or failed with correlation ID | Failure and retry audit |
| Invariant violation | 422 non-retryable | Workflow remains blocked | Critical invariant audit |

## 10. Security and Privacy Constraints
- Manager resolution records a separate auditable confirmation and never overwrites scanner evidence.
- Store reference metadata, hashes and redacted summaries only.
- Never expose provider tokens, GitHub tokens, secrets, full prompts or raw source in UI, logs, audit records or ordinary evidence records.
- All authorization decisions are server-side and fail closed.

## 11. Observability and Audit Requirements
Emit structured JSON logs with `assessmentId`, `organizationId`, `workflowRunId`, `jobId`, `correlationId` and story action. Persist immutable audit events for command start, block, failure and completion.

## 12. Tests to Implement

### Unit tests
- DTO/schema validation.
- State-precondition and authorization decision table.
- Deterministic node behavior for success, blocked and invariant failure.

### Integration tests
- API + Prisma transaction + audit event persistence.
- RabbitMQ job publication/consumption where applicable.
- Idempotency and duplicate command handling.

### Contract tests
- Request/response JSON schema.
- Event/job payload schema and retry classification.
- Error code contract for 400/401/403/409/422.

### Manual smoke-test steps
1. Start local PostgreSQL, RabbitMQ, MinIO/Chroma where needed.
2. Sign in as Manager test user.
3. Submit the story command through the documented route.
4. Confirm expected DB record, audit event and UI blocked/success state.

## 13. Local Run Commands
```bash
npm install
npm run test --workspace @lcsp/api
npm run test --workspace @lcsp/web
npm run test --workspace @lcsp/worker
npm run dev --workspace @lcsp/api
npm run dev --workspace @lcsp/web
npm run worker --workspace @lcsp/worker
```

## 14. Acceptance-Criteria Mapping
| Story Acceptance Criterion | Files / Components | Test Evidence |
|---|---|---|
| Implements VerifiedProfile Builder and Approval Gate | API/Web/Worker files in plan | Unit + integration tests |
| Enforces predecessor and role checks | guards, service, state validation | Authorization/state tests |
| Persists reference-only output | Prisma repository and schema | DB integration tests |
| Emits audit and correlation metadata | Audit service | Audit assertion tests |

## 15. Dependencies and Implementation Order
- Direct predecessor: `STORY-06-02`.
- Intended wave: Wave 4.
- Do not start implementation before predecessor outputs are available or mocked by explicit prototype fixture.

## 16. Explicit Non-Goals
No production deployment, customer onboarding, formal legal reliability validation, compliance certification, runtime scanner accuracy claim, A2-b2 completion claim, production scanner benchmarking or production legal document issuance.

## 17. Prototype Limitations
This blueprint is for controlled MVP prototype implementation only. It may support validation and internal review, but it does not prove production readiness, legal correctness, scanner empirical accuracy or compliance status.

## Build This Story From Zero

### Why this story exists

This story turns `STORY-06-03` into an executable controlled-prototype slice. The business outcome is: VerifiedProfile version and classification-ready gate. It gives the developer exact ownership for package `@lcsp/reconciliation`, API route `/api/v1/assessments/{assessmentId}/verified-profile`, service `VerifiedProfileService`, and persistence models `VerifiedProfile, AuditEvent`.

### Before coding

- Required completed predecessor stories: STORY-06-02.
- Required environment variables: `DATABASE_URL`, `RABBITMQ_URL`, `LCSP_PROTOTYPE_MODE=true`, plus story-specific provider refs where used.
- Required database state: organization, Manager membership and assessment UUIDv7 exist unless this story creates them.
- Required local services: PostgreSQL; RabbitMQ for command/event stories; ChromaDB/MinIO only for legal/document stories.
- Required packages: npm workspaces from `docs/developer-blueprints/12-npm-workspace-and-runtime-standard.md`.

### Implement in this exact order

1. Create shared contract in `packages/contracts/src/story-06-03/` with DTO, response, error and event payload schemas.
2. Create Prisma model/migration for `VerifiedProfile, AuditEvent` if the model does not already exist.
3. Create or update NestJS module files for `VerifiedProfileController` and `VerifiedProfileService` at the route `/api/v1/assessments/{assessmentId}/verified-profile`.
4. Add `JwtAuthGuard`, `OrganizationMembershipGuard`, `PermissionGuard` and `StateTransitionGuard` where the endpoint mutates workflow state.
5. Add transaction logic: validate UUIDv7 IDs, load assessment scope, write domain row, append immutable audit event.
6. Add outbox producer for `command.reconciliation.requested.v1` when the story needs async work; otherwise document `NO_ASYNC_COMMAND` in the service.
7. Add worker consumer/handler for `command.reconciliation.requested.v1` when applicable; consumer emits `event.reconciliation.verified-profile-created.v1`.
8. Add API/UI mapping so the Manager sees success, loading, blocked and safe error states with `correlationId`.
9. Add unit, integration and contract tests using npm scripts only.
10. Run manual smoke test and confirm observable output: VerifiedProfile version and classification-ready gate.

### Concrete execution trace

User action: developer triggers the story through the Manager UI or an authenticated API request for `Resolved reconciliation state`.
→ API route: `/api/v1/assessments/{assessmentId}/verified-profile`.
→ guard: `JwtAuthGuard` validates session, `OrganizationMembershipGuard` validates organization scope, `PermissionGuard` checks Manager permission, `StateTransitionGuard` blocks invalid predecessor state.
→ service: `VerifiedProfileService` validates DTO and starts a Prisma transaction.
→ database transaction: create/update `VerifiedProfile, AuditEvent` using UUIDv7 internal IDs and reference-only payloads.
→ audit event: append `AuditEvent` with `eventId`, `correlationId`, `causationId`, actor, action and safe metadata.
→ outbox event: publish `command.reconciliation.requested.v1` if async processing is required; payload uses the envelope in `11-rabbitmq-topology-and-event-contracts.md`.
→ worker: Node.js worker handler consumes `command.reconciliation.requested.v1` and calls package `@lcsp/reconciliation`.
→ output state: API/UI exposes VerifiedProfile version and classification-ready gate; blocked states include exact error code and do not expose raw source, prompt, token or secret.

### Done looks like

- `npm run typecheck` succeeds for affected workspaces.
- `npm run test --workspace @lcsp/contracts` validates DTO/event schema.
- Story-specific API returns success or blocked response with UUIDv7 `correlationId`.
- PostgreSQL contains expected `VerifiedProfile, AuditEvent` rows.
- RabbitMQ emits or consumes `command.reconciliation.requested.v1` / `event.reconciliation.verified-profile-created.v1` only when applicable.
- Audit table contains immutable event for the state-changing operation.
- Manager UI shows the expected visible result: VerifiedProfile version and classification-ready gate.
- No raw source, GitHub token, secret, full prompt or full AST body appears in logs, audit, queue payloads or evidence output.
