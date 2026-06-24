# 04 — Kiến trúc hệ thống

## Target architecture Phase 5.2L

```text
Web UI
-> NestJS API / synchronous control plane
-> PBAC decision boundary
-> PostgreSQL / Prisma / pgvector
-> RabbitMQ + Outbox
-> Python Worker Platform
   -> scanner
   -> TechnicalProfile
   -> AIUsageFlow
   -> reconciliation / VerifiedProfile
   -> legal ingestion / index
   -> legal matching
   -> classification
   -> gap analysis
   -> document generation
   -> async export
-> S3-compatible object storage
-> LLM / Embedding Gateway
```

Node.js không còn là runtime cho downstream domain workers. Node.js chỉ còn cho NestJS/Web và bounded `ts-morph` analyzer CLI.

## Thành phần chính

### Web

Customer-facing UI cho Manager và các collaboration flow còn giá trị sau remediation. Structured attestation không còn là screen trong MVP.

### NestJS API

API xử lý HTTP, authentication, PBAC enforcement, tenant scope, synchronous state commands, job creation/query, download và audit query. API không thực hiện long-running domain work.

### PBAC boundary

Policy evaluation nhận subject/service identity, organization, resource, action, context và policy version. Kết quả deny/allow và policy metadata phải được audit. Policy engine cụ thể vẫn là technical decision.

### Python Worker Platform

Gồm nhiều consumer/module độc lập, dùng shared contracts, persistence adapters, retry/DLQ, idempotency, logging, metrics và tracing. Mỗi workload có queue ownership và resource limits riêng; không gom thành một process monolith.

### Scanner adapters

Python scanner điều phối Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast`, `libcst` và Node `ts-morph` CLI.

### Data and messaging

PostgreSQL lưu domain state và metadata. RabbitMQ/outbox điều phối async work. S3-compatible storage lưu legal snapshots và generated documents. Real LLM/embedding providers được gọi qua gateway.

## Quy tắc ownership

- NestJS: synchronous control plane.
- Python: all asynchronous domain workloads.
- Node CLI: TS/JS semantic adapter only.
- PBAC: authorization source of truth ở API và worker boundaries.
- Domain spec: hành vi.
- Implementation/code map: package, module, table, queue và adapter ownership.

## Trạng thái

Các active ADR, architecture, worker code maps và implementation docs trên `main` vẫn ghi Node.js downstream workers và RBAC. Vì vậy target architecture này chưa phải baseline đủ điều kiện cho UX cho đến khi document remediation hoàn tất.
