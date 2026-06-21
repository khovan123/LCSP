# 15 API Gateway Construction Manual

## Purpose

Define NestJS modules, guards, controllers, DTO validation, error mapping, transaction/outbox pattern, and REST endpoint structure.

Documentation only. No source/test/CI/Docker artifacts are created.

## Exact files to create

```text
apps/api/src/main.ts
apps/api/src/app.module.ts
apps/api/src/common/guards/jwt-auth.guard.ts
apps/api/src/common/guards/organization-membership.guard.ts
apps/api/src/common/guards/permission.guard.ts
apps/api/src/common/guards/state-transition.guard.ts
apps/api/src/common/filters/domain-error.filter.ts
apps/api/src/common/interceptors/correlation-id.interceptor.ts
apps/api/src/modules/*/*.controller.ts
apps/api/src/modules/*/*.service.ts
apps/api/src/modules/*/*.repository.ts
```

## Interfaces

```ts
interface AuthenticatedActor { userId: string; role: 'MANAGER' | 'DEVELOPER'; organizationIds: string[] }
interface RequestContext { actor: AuthenticatedActor; correlationId: string; assessmentId?: string }
interface DomainError { code: string; httpStatus: number; message: string; details?: Record<string, unknown> }
```

## Classes

| Class | Purpose | Dependencies | Methods |
|---|---|---|---|
| `JwtAuthGuard` | Verify backend session/token. | AuthService | `canActivate()` |
| `OrganizationMembershipGuard` | Tenant scope. | MembershipService | `canActivate()` |
| `PermissionGuard` | Manager/Developer permission. | PermissionService | `canActivate()` |
| `StateTransitionGuard` | Workflow preconditions. | state machine | `canActivate()` |
| `DomainErrorFilter` | Normalize errors. | logger | `catch()` |
| `CorrelationIdInterceptor` | Attach correlation ID. | uuid factory | `intercept()` |
| `OutboxService` | Insert command envelope. | Prisma | `enqueueCommand()` |

## DTO Catalog

```ts
interface ErrorResponseDto { error: { code: string; message: string; correlationId: string; details?: Record<string, unknown> } }
interface WorkflowRequestAcceptedDto { workflowRunId: string; status: 'REQUESTED'; correlationId: string }
interface HealthResponseDto { status: 'ok' | 'degraded'; dependencies: Record<string, string> }
```

## Database Schema

```prisma
model AuditEvent { id String @id @db.Uuid organizationId String? @db.Uuid assessmentId String? @db.Uuid actorUserId String? @db.Uuid actorType Role eventType String correlationId String @db.Uuid causationId String? @db.Uuid metadata Json occurredAt DateTime @default(now()) @@index([assessmentId, occurredAt]) @@index([correlationId]) @@index([eventType]) }
model OutboxEvent { id String @id @db.Uuid eventId String @unique @db.Uuid eventType String schemaVersion Int aggregateType String aggregateId String @db.Uuid correlationId String @db.Uuid payload Json status String retryCount Int @default(0) occurredAt DateTime @default(now()) publishedAt DateTime? @@index([status, occurredAt]) @@index([correlationId]) }
model Session { id String @id @db.Uuid userId String @db.Uuid tokenHash String @unique expiresAt DateTime revokedAt DateTime? createdAt DateTime @default(now()) }
```

## State Machines

API and audit enforce all state transitions from `01-system-state-machines.md`. Local bootstrap and implementation order do not alter runtime state.

## Queue Catalog

| Exchange | Queue | Routing Key | Producer | Consumer |
|---|---|---|---|---|
| `lcsp.events.v1` | `lcsp.audit-projector.v1` | `event.audit.created.v1` | services/workers | AuditProjector |
| `lcsp.commands.v1` | domain worker queues | `command.*.v1` | API outbox | workers |

## Algorithms

Input: HTTP request. Output: JSON response or normalized error. Complexity: O(guards + service work).

```text
correlation = getOrCreateCorrelationId()
actor = JwtAuthGuard.requireActor()
OrganizationMembershipGuard.assertScope(actor, params)
PermissionGuard.assertPermission(actor, route.permission)
StateTransitionGuard.assertAllowed(params.assessmentId, route.action)
dto = validateBody()
transaction: service write + audit + outbox
return response DTO
```

Edge cases: Developer attempts Manager-only action returns 403; stale state returns 409; missing gate returns 422; callback validation failure returns 400.
