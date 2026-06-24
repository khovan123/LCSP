# 07 — Dữ liệu, sự kiện và bảo mật

## Nhóm dữ liệu mục tiêu

```text
Identity, Organization và Policy
Assessment và WizardProfile
RepositoryConnection, RepositorySnapshot và ScanTrigger
RepositoryScanJob và scanner evidence
TechnicalProfile và AIUsageFlow
Conflict và VerifiedProfile
Legal corpus và LegalRuleMatch
RiskClassification và GapAnalysis
GeneratedDocument
PolicyDecision, AuditEvent và OutboxEvent
```

Structured attestation entity không còn thuộc active MVP.

## PBAC data model

Authorization cần các reference tối thiểu:

- subject hoặc service identity;
- organization/tenant;
- resource type và resource ID;
- action;
- context attributes;
- policy ID/version;
- decision và reason code;
- correlation/causation ID;
- timestamp.

Role có thể được lưu như subject attribute hoặc policy template nhưng không quyết định quyền trực tiếp. Policy engine unavailable hoặc context không đủ phải deny/fail closed.

## Persistence

PostgreSQL là nguồn chuẩn cho domain state và metadata. Object storage lưu legal source snapshots và document artifacts. Không lưu dài hạn raw repository source, repository archive, full AST, secret, provider token, full prompt hoặc tool output chưa validate.

Scanner bổ sung metadata cho tool/version/config hash, SBOM components, dependency usage facts, graph evidence và coverage limitations.

## Transaction và Outbox

```text
validate identity/context
-> PBAC decision
-> validate domain state
-> ghi domain object
-> ghi PolicyDecision/AuditEvent
-> ghi OutboxEvent khi cần
-> commit
```

Outbox publisher phát message sau transaction. Consumer idempotent và dùng retry/DLQ có giới hạn.

## Python Worker Platform queues

Queue names có thể giữ theo domain nhưng consumer runtime chuyển sang Python. Từng workload phải có queue ownership, service identity, resource limit và failure policy riêng cho scan, profile, AIUsageFlow, reconciliation, legal ingestion/index, legal matching, classification, gap, document và async export.

## Automatic scan trigger audit

Mỗi trigger phải ghi source, organization/account, repository, assessment, branch/commit khi có, policy decision, idempotency key, mapping outcome và correlation ID. Duplicate hoặc out-of-order event không được tạo artifact trùng. Mapping mơ hồ phải dừng ở pending/blocked state.

## Bảo mật scanner tools

Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast`/`libcst` và `ts-morph` phải chạy trong restricted workspace, không cài dependency và không chạy customer code. stdout/stderr phải bounded, validated và redacted.

## Recovery

- Duplicate trigger/command: no-op hoặc resume an toàn.
- Policy engine/context failure: deny và audit.
- Mapping thiếu: pending/blocked, không scan.
- Tool failure: coverage limitation hoặc terminal failure theo severity.
- Failed scan: tạo job mới hoặc resume theo idempotency contract, giữ lịch sử.
- Stuck outbox: retry/backoff và operator replay có audit.
- Provider/corpus/index failure: giữ blocked state đến khi upstream được sửa.

## Gap hiện tại

Active NFR, event catalog, domain model, persistence và worker code maps trên `main` vẫn mô tả RBAC, attestation và Node.js downstream workers. Chúng chưa đồng bộ với target Phase 5.2L.
