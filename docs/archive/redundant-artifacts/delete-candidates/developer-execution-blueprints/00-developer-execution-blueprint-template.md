# Developer Execution Blueprint Template

## Purpose

Use this template when a developer needs to implement a runtime path and must know how data moves, how services interact, and how business logic transforms objects.

## Seven-Question Trace

| Question | Answer |
|---|---|
| User bấm nút gì? | UI route, button, form, required state. |
| Request đi đâu? | HTTP method, route, DTO, auth/role. |
| Service nào xử lý? | Controller, service, repository, transaction boundary. |
| DB đọc/ghi gì? | Prisma models read/written, indexes, constraints. |
| Queue nào được publish? | Exchange, routing key, envelope, payload, idempotency key. |
| Worker nào consume? | Consumer class, method, retry/DLQ behavior. |
| Output cuối cùng là object gì? | DTO/domain object persisted or returned to UI. |

## Execution Trace Table

| Step | Actor | Action | Input Object | Handler | DB Read | DB Write | Queue/Event | Output Object | Failure Mode |
|---:|---|---|---|---|---|---|---|---|---|
| 1 |  |  |  |  |  |  |  |  |  |

## Object Transformation Chain

```text
ObjectA
  -> ObjectB
  -> QueuePayload
  -> WorkerInput
  -> DomainObject
  -> PersistedObject
  -> ResponseDto
```

## Domain Walkthrough

Use one concrete business example. Include:

- Minimal input source shape.
- Scanner or service facts produced.
- Rule IDs executed.
- Intermediate objects.
- Final object.
- What must be blocked or abstained.

## Acceptance For Developer Readiness

A blueprint is developer-ready only when every row names concrete:

- route;
- DTO;
- service method;
- Prisma model;
- queue routing key;
- worker method;
- output object;
- failure behavior.
