# 09 API Contract Build Spec

## 1. Purpose

Define canonical REST/NestJS API contracts, DTOs, validation, error schema and module boundaries for implementation.

## 2. Runtime Ownership

| Concern | Owner |
|---|---|
| Service name | API Service |
| Module name | `api` |
| NestJS module | `apps/api/src/app.module.ts` |
| Worker name | none; API enqueues commands |
| Database ownership | command-side writes through Prisma repositories |
| Queue ownership | produces command events through outbox |

## 3. Exact Libraries

| Library | Version strategy | Purpose | Why selected | Alternatives rejected |
|---|---|---|---|---|
| NestJS | pinned npm lockfile | REST API framework | canonical backend framework | Express-only app |
| class-validator or Zod pipe | pinned npm lockfile | DTO validation | reject invalid input before service | manual validation |
| `@nestjs/swagger` | pinned npm lockfile | OpenAPI from decorators | contract generation | hand-written OpenAPI only |
| Prisma | pinned npm lockfile | repositories | canonical DB access | direct SQL in controllers |

## 4. Folder Structure

```text
apps/api/src/
  common/guards/ JwtAuthGuard, PermissionGuard, StateTransitionGuard
  common/errors/ error codes and filters
  modules/auth/
  modules/assessment/
  modules/github/
  modules/scanner/
  modules/ai-usage-flow/
  modules/reconciliation/
  modules/classification/
  modules/gap-analysis/
  modules/document/
  modules/audit/
  modules/outbox/
```

## 5. DTO Contracts

### Shared ErrorDto

```json
{ "code": "GATE_PRECONDITION_FAILED", "message": "Required prerequisite is missing.", "correlationId": "018f0000-0000-7000-8000-000000000001", "details": [] }
```

### WorkflowJobAcceptedDto

```json
{ "jobId": "018f0000-0000-7000-8000-000000003001", "assessmentId": "018f0000-0000-7000-8000-000000000101", "status": "REQUESTED", "correlationId": "018f0000-0000-7000-8000-000000000001" }
```

## 6. Database Models

API writes through model-specific repositories and must create `AuditEvent` in the same transaction for material writes. Command-producing writes also create `OutboxEvent`.

## 7. RabbitMQ Contracts

API produces command events only through outbox: scan, AIUsageFlow, reconciliation, classification, gap analysis, document. API does not run long-running work inline.

## 8. Algorithms

Request lifecycle:

```text
1. CorrelationIdInterceptor ensures correlation ID.
2. DTO validation pipe validates path/query/body.
3. JwtAuthGuard verifies session.
4. OrganizationMembershipGuard scopes tenant.
5. PermissionGuard checks Manager permission.
6. StateTransitionGuard checks workflow predecessor state.
7. Service starts transaction.
8. Repository writes domain record.
9. AuditEvent is appended.
10. OutboxEvent is appended if async work needed.
11. Return DTO.
```

## 9. Failure Handling

| Error code | HTTP | Reason | Recovery strategy |
|---|---:|---|---|
| `INVALID_UUID` | 400 | malformed internal ID | fix client input |
| `AUTH_REQUIRED` | 401 | missing session | login |
| `PERMISSION_DENIED` | 403 | missing permission | Manager action required |
| `RESOURCE_NOT_FOUND` | 404 | missing/out-of-scope resource | no cross-tenant disclosure |
| `STATE_TRANSITION_BLOCKED` | 409 | invalid workflow order | complete predecessor |
| `GATE_PRECONDITION_FAILED` | 422 | missing evidence/profile/citation | show blocked state |

## 10. Verification

| Command | Expected output | Success criteria |
|---|---|---|
| `npm run test --workspace @lcsp/api` | API unit tests pass | guards/services/errors covered |
| `npm run test:integration --workspace @lcsp/api` | integration tests pass | DB+outbox+audit writes verified |
| `GET /api/v1/health` | `{ "status": "ok" }` | API local healthy |


## Acceptance Criteria

- Given valid inputs, the component produces the documented DTO, database state, or event.
- Given invalid permissions, state, evidence, citation, or payload schema, the component fails closed with the documented error.
- Given transient infrastructure failure, retry/DLQ or blocked-state behavior follows RabbitMQ and audit contracts.
- Given any output, no raw source, secrets, full prompts, full AST bodies, or unsupported production/legal claims are emitted.
