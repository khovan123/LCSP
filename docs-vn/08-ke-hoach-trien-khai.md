# 08 — Kế hoạch triển khai

## Điều kiện bắt đầu

Kế hoạch hiện mới là build order. Coding chỉ được bắt đầu sau khi có:

1. canonical UX;
2. canonical epics/stories;
3. story-level traceability;
4. implementation-readiness recheck đạt yêu cầu;
5. sprint planning được phê duyệt.

## Các wave chính

### Wave 0 — Hoàn tất planning

Tạo UX, epics/stories, traceability và chạy lại readiness check.

### Wave 1 — Nền tảng

PostgreSQL/Prisma/pgvector/unaccent, RabbitMQ/outbox, audit, RBAC, configuration và secret references.

### Wave 2 — Assessment core

Authentication, organization, assessment, WizardProfile, readiness-only state, GitHub App connection và RepositorySnapshot.

### Wave 3 — Python Scanner

Python Worker, `ast` + `libcst`, workspace security, TS/JS subprocess, graph/evidence/report và scan events.

### Wave 4 — Intelligence và reconciliation

TechnicalProfile, AIUsageFlow, conflict, Manager resolution, optional structured attestation và VerifiedProfile.

### Wave 5 — Legal corpus và retrieval

Source validation, snapshot/hash, normalization, internal approval, immutable corpus, FTS, embedding index và citation reconstruction.

### Wave 6 — Real LLM và classification

Provider integration, timeout/retry, structured output, budget, ModelRunMetadata, citation guardrail và RiskClassification.

### Wave 7 — Reporting và hardening

GapAnalysis, document generation, object storage, status/download, audit export, accessibility, observability, retry/DLQ và privacy checks.

### Wave 8 — A-to-Z acceptance

Chạy golden path và negative paths trên hạ tầng thật.

## Thứ tự phụ thuộc

```text
Foundations
-> Assessment/Wizard/Repository
-> Python Scanner
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation/VerifiedProfile
-> Legal Matching
-> Classification
-> GapAnalysis
-> Document
-> Audit Export
```

Legal corpus là prerequisite song song:

```text
Source Ingestion
-> Internal Approval
-> FTS/Embedding Index
-> Legal Matching readiness
```

## Tiêu chí hoàn tất quan trọng

- API/worker start và migration chạy được.
- Scan không chạy source, không lưu raw source và cleanup được xác minh.
- Claims có evidence refs và uncertainty.
- Conflict khóa classification cho đến khi Manager giải quyết.
- Corpus approved bất biến và retrieval có citation.
- Real LLM/embedding provider được dùng cho acceptance.
- Document được lưu/tải thật và không overclaim.
- Audit xuất được đầy đủ version/hash/correlation refs.
- Tất cả 33 active NFR có bằng chứng kiểm tra hoặc kế hoạch kiểm tra được duyệt.

## Local development contract dự kiến

```text
npm install
npm run db:generate
npm run db:migrate
npm run dev:api
npm run dev:worker
npm run dev:web

cd lcsp-scanner-worker
poetry install
poetry run pytest
poetry run python -m lcsp_scanner.main

cd ../tools/ts-js-analyzer
npm install
npm run build
npm test
```

Các lệnh này là hợp đồng thiết kế; chưa phải bằng chứng repository hiện đã có mã chạy được.
