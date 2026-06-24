# 09 — Quản trị tài liệu và lịch sử

## Các lớp tài liệu

```text
docs/product/                        product scope và business rules
docs/specs/                          UC, FR, NFR, AC, domain và state
docs/architecture/                   architecture và ADR
docs/developer-execution-blueprints/ runtime/data journeys
docs/implementation/                 build/configuration contracts
docs/code-map/                       module/table/queue ownership
docs/planning-artifacts/             proposal, readiness và remediation reports
docs/change-control/                 thay đổi phạm vi đã được phê duyệt
docs/reviews/                        feedback và remediation evidence
docs/archive/                        historical evidence
```

## Thứ tự authority

1. Project Owner decision và change-control đã được phê duyệt.
2. Product scope và canonical UC/FR/NFR/AC.
3. ADR đang hiệu lực và supersession register.
4. Domain specs và state machines.
5. Implementation specs và code maps.
6. Planning/review reports.
7. Archive chỉ dùng để hiểu lịch sử.

Proposal chưa có Project Owner approval không được dùng để tuyên bố remediation đã hoàn tất.

## Lịch sử chính

### Phase 5.2J

Chuyển mục tiêu sang A-to-Z runnable MVP: Python-owned scanner lifecycle, first-class Python analysis, real providers, official-source legal corpus và ChromaDB vectorless legal retrieval.

### Phase 5.2K

Chuẩn hóa canonical UC/FR/AC/NFR, scanner ownership, legal corpus/retrieval và pre-UX planning state.

### Phase 5.2L

Project Owner yêu cầu PBAC, loại structured attestation, thay Local/CI upload bằng Automatic Trusted Scan Initiation, loại manual evidence JSON khỏi product, chuyển mọi async workload sang Python Worker Platform và mở rộng scanner toolchain.

PR #2 đã cập nhật phần lớn tài liệu active theo direction này. Tuy nhiên proposal approval còn trống và một số tài liệu vẫn giữ nội dung cũ, nên closure chưa đạt.

## Archive

Không sửa `docs/archive/` để làm baseline mới có vẻ nhất quán. Tài liệu active phải phân loại nội dung cũ bằng marker rõ ràng:

```text
HISTORICAL_ONLY
SUPERSEDED_FOR_ACTIVE_MVP
REMOVED_FROM_PRODUCT
DEFERRED_POST_MVP
```

## Trạng thái planning hiện tại

```text
PHASE_5_2L_P0_CLOSURE_COMPLETED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
READY_FOR_CANONICAL_UX
CANONICAL_UX_DRAFT_CREATED_PENDING_APPROVAL
CHROMADB_STRUCTURE_FIRST_VECTORLESS_LEGAL_RAG_APPROVED
POSTGRESQL_PGVECTOR_LEGAL_RETRIEVAL_SUPERSEDED
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
```

Các technical decisions về PBAC engine/topology, scan-trigger retry/DLQ/idempotency và scanner tool failure severity có thể được carry forward qua UX dưới dạng constraint, nhưng phải được giải quyết hoặc gắn dependency rõ trước khi story/readiness được duyệt. RAG Phase 5.2L đã khóa ChromaDB vectorless và supersede pgvector legal retrieval.

## Vai trò của docs-vn

`docs-vn/` giúp đọc nhanh target direction và trạng thái closure. Nó không tạo requirement mới, không thay đổi authority và không thay thế source doc khi review chi tiết.
