# 10 — Đối chiếu tài liệu gốc và impact Phase 5.2L

## Mục đích

Bảng này cho biết nhóm tài liệu active nào phải được sửa trước khi chuyển sang UX. Đây không phải bản dịch 1:1.

## Product và requirements

| Nhóm nguồn | Impact Phase 5.2L |
|---|---|
| `docs/product/system-context.md`, `prd.md`, `business-rules.md` | PBAC, loại attestation, loại các capability bị xóa, automatic scan initiation, Python worker ownership |
| `docs/specs/use-cases.md`, `user-task-flows.md` | bỏ UC/flow attestation; thêm trusted trigger/pending mapping; cập nhật PBAC states |
| `functional-requirements.md` | thay FR-050, loại FR-051 khỏi product, xử lý FR-045/046/047 và renumber/canonical mapping nếu cần |
| `non-functional-requirements.md` | thay RBAC bằng PBAC; bổ sung policy audit, Python worker platform và scanner tool controls |
| `acceptance-criteria-catalog.md` | xóa AC attestation; thêm PBAC, auto-trigger và toolchain negative paths |
| baseline/matrix/summary | rebuild toàn bộ UC/FR/AC/NFR và story dependency carry-forward |

## Domain và architecture

| Nhóm nguồn | Impact Phase 5.2L |
|---|---|
| `domain-model.md` | loại attestation entity; thêm policy decision và scan trigger/mapping objects |
| `domain-state-machines.md` | thêm automatic trigger/pending mapping states; bỏ attestation states |
| `event-catalog.md` | thêm trigger events; mọi downstream consumer đổi sang Python runtime |
| `architecture.md` | Python Worker Platform thay Node downstream workers; PBAC boundary |
| ADR index và active ADRs | supersede RBAC/Node worker/attestation/manual upload decisions; thêm PBAC, worker platform và scanner toolchain ADRs |

## Implementation, blueprints và code maps

| Nhóm nguồn | Impact Phase 5.2L |
|---|---|
| backend implementation/API map | PBAC middleware/service, policy audit và automatic scan trigger APIs/webhooks |
| persistence | policy/version/decision, trigger/mapping/idempotency, tool provenance và dependency facts |
| queue implementation | Python consumers, service identities, retry/DLQ/idempotency cho mọi async workload |
| worker/module code maps | thay `apps/worker` Node ownership bằng Python packages/consumers |
| scanner specs/implementation/data journey | thêm Syft, Knip, deptry, Semgrep, tree-sitter/custom parser và severity policy |
| legal/classification/reporting blueprints | đổi runtime owner từ Node/TS sang Python |
| delivery/readiness | thêm documentation remediation gate trước UX |

## Planning artifacts cần có trên GitHub

Agent báo cáo đã tạo:

```text
docs/planning-artifacts/sprint-change-proposal-2026-06-24-phase-5-2l.md
docs/planning-artifacts/implementation-readiness-report-2026-06-24.md
```

Tại thời điểm review, hai tệp này chưa tồn tại trên `main` hoặc branch PR #2. Chúng cần được commit/push trước khi có thể review nội dung và ghi nhận Project Owner approval.

## docs-vn mapping

| Tệp | Nội dung Phase 5.2L |
|---|---|
| `README.md` | trạng thái GitHub và UX gate |
| `01` | product target và removed capabilities |
| `02` | requirements/acceptance cần rebase |
| `03` | automatic trigger và Python A-to-Z flow |
| `04` | PBAC + Python Worker Platform architecture |
| `05` | full scanner toolchain |
| `06` | legal corpus/RAG/LLM |
| `07` | PBAC data, events, security và recovery |
| `08` | remediation sequence trước UX |
| `09` | authority và lịch sử Phase 5.2L |
| `11` | Project Owner correction summary |
| `12` | review verdict và closure checklist |

```text
PHASE_5_2L_IMPACT_MAP_COMPLETE
ACTIVE_DOC_REMEDIATION_PENDING
UX_HANDOFF_BLOCKED
```