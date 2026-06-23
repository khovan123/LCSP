# 04 — Kiến trúc hệ thống

## Hình dạng tổng thể

```text
Web UI
-> NestJS API
-> PostgreSQL / Prisma / pgvector
-> RabbitMQ + Outbox
-> Python Scanner Worker
-> Node.js downstream workers
-> S3-compatible object storage
-> LLM / Embedding Gateway
```

## Thành phần chính

### `apps/web`

Giao diện cho Manager và Developer tùy chọn. UX phải thể hiện đầy đủ trạng thái bình thường, loading, empty, permission denied, insufficient, blocked, failed, degraded, retry và rerun.

### `apps/api`

NestJS API chịu trách nhiệm HTTP, authentication, RBAC, tenant scope, tạo job, kiểm tra state guard, query result, download và audit export. API không trực tiếp thực hiện repository scan hoặc tác vụ dài.

### `lcsp-scanner-worker`

Python Worker là consumer duy nhất của scan command và sở hữu toàn bộ scan lifecycle. Worker phân tích Python trực tiếp và gọi Node subprocess cho TS/JS.

### `apps/worker`

Node.js workers xử lý TechnicalProfile, AIUsageFlow, reconciliation, legal ingestion/index, legal matching, classification, gap analysis và document generation.

### `tools/ts-js-analyzer`

Node CLI dùng `ts-morph`, nhận request JSON từ Python Worker và trả normalized facts qua stdout. Công cụ này không đọc queue, không tự ghi DB và không phát event.

### PostgreSQL

Lưu domain state, evidence metadata, profile, conflict, corpus, retrieval audit, classification, document metadata, outbox và audit. Raw source không được lưu dài hạn.

### RabbitMQ và Outbox

API/worker ghi domain state cùng OutboxEvent trong một transaction. Outbox publisher mới phát message. Consumer phải idempotent và có retry/DLQ.

### Object storage

Lưu immutable legal source snapshots và generated document artifacts. Database chỉ lưu reference, hash, version và metadata.

## Phân tách trách nhiệm

- API: quyền, validation, state transition, tạo/query job.
- Worker: tác vụ bất đồng bộ và tạo artifact.
- Domain spec: hành vi đúng phải có.
- Implementation spec: cách xây dựng.
- Code map: module nào sở hữu API, bảng, DTO và queue.
- ADR: quyết định kiến trúc và quan hệ supersession.

## Các ADR quan trọng hiện tại

- Kiến trúc modular monolith-first cho API, nhưng worker được tách theo tác vụ dài.
- Manager-led workflow; Developer là tùy chọn.
- Evidence-first và fail-closed.
- GitHub App là đường evidence chính của MVP.
- Không raw source sang LLM hoặc lưu dài hạn.
- Deterministic orchestration thay vì autonomous multi-agent control.
- Python Worker thay thế TypeScript-first scanner lifecycle.
- Real LLM provider thay thế mock happy path.
- Official-source legal corpus thay thế local JSONL seed.
- Hybrid FTS + pgvector là retriever chuẩn.

## Quy tắc module

Một module mới chỉ được tạo khi đã có trong code map. Module phải khai báo rõ mục đích, dependency, DTO/contracts, bảng dữ liệu, queue/event, API và tài liệu thẩm quyền.

## Quy tắc triển khai

Kiến trúc hiện là hợp đồng thiết kế. Chưa được suy diễn rằng package, schema, worker, migrations, CI hoặc hạ tầng thật đã tồn tại. Việc coding chỉ bắt đầu sau UX, epics/stories và readiness recheck.
