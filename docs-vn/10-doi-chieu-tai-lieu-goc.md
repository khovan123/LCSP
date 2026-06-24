# 10 — Đối chiếu tài liệu gốc và Phase 5.2L

## Mục đích

Bảng này đối chiếu các nhóm nội dung trong `docs/` với phần tóm lược trong `docs-vn/` và ghi nhận trạng thái review Phase 5.2L.

## Product và planning

| Nguồn | Bản tóm lược | Trạng thái review |
|---|---|---|
| `docs/product/system-context.md` | `01`, `03` | phần lớn đã align |
| `docs/product/prd.md` | `01`, `02` | còn wording attestation cũ |
| `docs/product/business-rules.md` | `01`, `02`, `03` | còn role/attestation residue |
| `docs/product/validation-plan.md` | `02`, `08`, `12` | chưa đổi A3 khỏi attestation |
| `docs/planning-artifacts/sprint-change-proposal-2026-06-24-phase-5-2l.md` | `09`, `11`, `12` | approval section còn trống |
| `docs/planning-artifacts/implementation-readiness-report-2026-06-24.md` | `08`, `09`, `12` | kết quả NOT READY |

## Requirements và domain

| Nguồn/nhóm | Bản tóm lược | Trạng thái review |
|---|---|---|
| use cases và task flows | `02`, `03` | gần align; cần clean trace cũ |
| functional requirements | `02` | 56 IDs; target Phase 5.2L đã phản ánh |
| non-functional requirements | `02`, `07` | PBAC/Python/toolchain đã phản ánh |
| acceptance catalog | `02`, `03` | còn historical AC/UC cleanup |
| baseline, matrix và summary | `02`, `08`, `12` | marker synchronized/no-orphan quá sớm |
| domain model và state machines | `03`, `07` | target đã có; historical boundary cần clean |
| event catalog | `03`, `07` | Python consumers và trigger events đã có |
| scanner specs | `05` | toolchain đã có; severity policy còn mở |
| legal/classification/document specs | `03`, `06` | cần closure scan cho runtime và removed input |

## Architecture, implementation và code maps

| Nguồn/nhóm | Bản tóm lược | Trạng thái review |
|---|---|---|
| architecture | `04` | target PBAC/Python Worker Platform đã có |
| ADR index, ADR-022, ADR-023 | `04`, `09` | thiếu dedicated Phase 5.2L ADRs; còn relationship cũ |
| execution blueprints | `03`, `05`, `07` | phần lớn đã align |
| backend, persistence, queue | `04`, `07` | còn wording cũ và technical decisions mở |
| scanner implementation/code maps | `05` | toolchain target đã align |
| worker/module maps | `04`, `07` | Python ownership phần lớn đã align |
| delivery plan | `08` | active FR coverage expression cần sửa |

## Bộ định danh mục tiêu hiện tại

- active use cases: `UC-001..UC-017`;
- canonical FR IDs: `FR-001..FR-056`;
- active FR set theo baseline Phase 5.2L: 52;
- `FR-045/FR-046`: superseded;
- `FR-051`: removed;
- `FR-052`: deferred;
- active NFRs: 33;
- acceptance catalog: `AC-001..AC-041` và `AC-050A..AC-050F`, trong đó `AC-013` là historical guard.

## Archive

`docs/archive/` không thuộc authority review và không được sửa trong pass này.

```text
PHASE_5_2L_TARGET_BROADLY_PROPAGATED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
PHASE_5_2L_P0_CLOSURE_COMPLETED
UX_DRAFT_CREATED
UX_DRAFT_REBASE_PENDING
CHROMADB_STRUCTURE_FIRST_VECTORLESS_LEGAL_RAG_APPROVED
POSTGRESQL_PGVECTOR_LEGAL_RETRIEVAL_SUPERSEDED
```
