# 12 — Review trước UX cho Phase 5.2L

## Kết luận

```text
VERDICT_NOT_READY_FOR_UX
ACTIVE_DOCS_NOT_SYNCHRONIZED_FOR_PHASE_5_2L
PROJECT_OWNER_APPROVAL_AND_DOCUMENT_REMEDIATION_REQUIRED
```

## Baseline được kiểm chứng

| Item | Giá trị |
|---|---|
| GitHub `main` HEAD | `73f47560a075fe7991ba2611a87f52abbe2e0496` |
| PR hiện tại | `#2` — `docs/add-vietnamese-condensed-guide` |
| Proposal agent báo cáo | chưa có trên `main` hoặc PR #2 |
| Readiness report agent báo cáo | chưa có trên `main` hoặc PR #2 |
| Archive | không review và không chỉnh sửa |

## Các blocker P0

### P0-1 — Authorization chưa chuyển sang PBAC

Active NFR, API/code maps và documentation start vẫn dùng RBAC/Manager-Developer role enforcement. Chưa có policy model, PolicyDecision entity, policy version audit, worker service identity hoặc engine/topology decision.

### P0-2 — Structured attestation vẫn active

System context, use cases, FR catalog, AC, user task flows, domain model, event catalog, API map và delivery plan vẫn chứa structured attestation. Điều này xung đột trực tiếp với Project Owner direction loại attestation khỏi MVP.

### P0-3 — FR-050/FR-051 chưa được sửa

`FR-050` vẫn là future Local/CI scanner upload và `FR-051` vẫn là future manual evidence JSON upload. Chưa có canonical automatic trusted scan initiation requirement, trigger lifecycle, mapping states, command/event, failure codes hoặc AC.

### P0-4 — Downstream workers vẫn Node.js

Architecture, docs index, worker code map, module ownership và delivery plan vẫn đặt TechnicalProfile, AIUsageFlow, reconciliation, legal ingestion/index, legal matching, classification, gap analysis và document generation trên Node.js workers. Chưa có Python Worker Platform architecture hoặc migration contract.

### P0-5 — Scanner toolchain chưa đầy đủ

Active scanner specs mới định nghĩa `ast`/`libcst` và `ts-morph`. Chưa có Syft, Knip, deptry, Semgrep custom rules, tree-sitter/custom parser, dependency/SBOM contracts, tool provenance, severity policy, fixtures hoặc acceptance criteria.

### P0-6 — Proposal/readiness artifacts chưa được push

Hai tệp ngày 2026-06-24 do agent báo cáo không tồn tại trên GitHub branch được review. Vì vậy chưa thể xác nhận proposal content, Project Owner approval record hoặc readiness analysis là repository evidence.

## Các blocker P1

- Canonical UC/FR/AC/NFR counts và crosswalk chưa được rebase sau khi loại attestation, thay FR-050 và xóa FR-051.
- Domain model chưa có PolicyDecision, ScanTrigger, trigger mapping hoặc pending/resume state.
- Event catalog chưa có automatic trigger events và Python runtime ownership cho mọi consumer.
- Persistence chưa có policy/version/decision, trigger idempotency/mapping và scanner tool provenance/dependency entities.
- UX inputs vẫn mô tả Developer attestation và thiếu trigger mapping/recovery states.
- Readiness marker `ACTIVE_DOCS_PRE_UX_SYNCHRONIZED` trên `main` đã lỗi thời đối với Phase 5.2L.

## Điều kiện closure trước UX

Tất cả điều kiện sau phải đạt:

1. Sprint Change Proposal Phase 5.2L được commit/push và Project Owner phê duyệt.
2. Tất cả active non-archive docs được remediation.
3. PBAC model và technical decisions được chốt hoặc đưa thành explicit dependencies.
4. Attestation không còn trong active scope/traceability/runtime/UX.
5. FR-050 trở thành automatic trusted scan initiation; FR-051 được đánh dấu removed from product.
6. Python Worker Platform ownership được đồng bộ trên architecture, ADR, implementation, queue, code map và blueprints.
7. Scanner toolchain đầy đủ được định nghĩa end-to-end.
8. UC/FR/NFR/AC và traceability được tái lập, không orphan.
9. Cross-document search không còn active RBAC, attestation, Node downstream worker hoặc manual upload claims ngoài supersession/history notes.
10. Closure report xác nhận `READY_FOR_CANONICAL_UX`.

## Bước tiếp theo hợp lệ

```text
Project Owner approves/revises proposal
-> bmad-party-mode documentation remediation
-> active-doc closure review
-> bmad-ux
-> bmad-create-epics-and-stories
-> bmad-check-implementation-readiness
```

Không chạy `bmad-ux` ngay từ baseline hiện tại.
