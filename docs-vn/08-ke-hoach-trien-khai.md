# 08 — Kế hoạch triển khai

## Trạng thái hiện tại

Implementation readiness vẫn là `NOT READY`. Không được chuyển thẳng sang UX khi active docs chưa phản ánh Phase 5.2L.

## Trình tự đúng

```text
1. Project Owner review/approve Sprint Change Proposal Phase 5.2L
2. Remediate toàn bộ active non-archive docs
3. Chạy closure review và cross-document validation
4. Tạo canonical UX
5. Tạo canonical epics/stories
6. Rebuild story traceability
7. Chạy lại bmad-check-implementation-readiness
8. Chỉ sau READY mới sprint planning và coding
```

## Documentation remediation waves

### Wave D1 — Product và requirements

PBAC, loại attestation, loại các feature bị bỏ khỏi sản phẩm, thay FR-050 bằng auto-start scan và rebase UC/FR/AC/NFR.

### Wave D2 — Domain và architecture

PolicyDecision, ScanTrigger/pending mapping, Python Worker Platform, worker/service identities, state machines, event catalog và ADR supersession.

### Wave D3 — Scanner toolchain

Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast`/`libcst`, `ts-morph`, common contracts, persistence, failure severity và acceptance fixtures.

### Wave D4 — Implementation/code maps

Backend PBAC integration, Python worker packages/queues, persistence, outbox, deployment boundaries, legal/classification/reporting ownership và local commands.

### Wave D5 — UX inputs và readiness

User task flows, statuses, error/recovery behavior, traceability, docs indexes, delivery plan, `docs-vn/` và readiness report.

## Technical decisions còn mở

- PBAC engine, policy store, cache, invalidation và service-to-service evaluation.
- Automatic scan trigger catalog, mapping/resume lifecycle, idempotency và retry/DLQ.
- Python Worker Platform package/process/deployment boundaries.
- Scanner tool versions, adapters, schemas, timeout/resource limits và severity policy.

Các quyết định này phải được chốt hoặc được đưa thành explicit pre-story dependencies trước khi UX/story baseline được phê duyệt.

## Build waves sau readiness

Sau khi planning closure đạt READY, build order dự kiến là:

```text
PBAC/platform foundations
-> assessment/repository/automatic triggers
-> Python scanner toolchain
-> Python profile/AIUsageFlow/reconciliation
-> Python legal ingestion/index/matching
-> Python classification/gap/document/export
-> A-to-Z acceptance
```

## Gate

```text
PHASE_5_2L_DOCUMENT_REMEDIATION_PENDING
UX_HANDOFF_BLOCKED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```