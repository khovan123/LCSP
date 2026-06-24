# LCSP — Tài liệu tóm lược tiếng Việt

## Mục đích

`docs-vn/` là bản tóm lược tiếng Việt theo chủ đề của hệ thống tài liệu trong `docs/`. Mục tiêu là giúp người mới, người phản biện và nhóm triển khai hiểu nhanh sản phẩm, yêu cầu, kiến trúc, luồng xử lý, bảo mật và trạng thái dự án.

Đây **không phải** bản dịch từng tệp và **không thay thế** tài liệu gốc. Khi có khác biệt, change-control đã được Project Owner phê duyệt, tài liệu active trong `docs/` và ADR đang hiệu lực là nguồn chuẩn.

## Đọc nhanh

1. [01-tong-quan-san-pham.md](./01-tong-quan-san-pham.md)
2. [02-yeu-cau-va-nghiem-thu.md](./02-yeu-cau-va-nghiem-thu.md)
3. [03-luong-nghiep-vu-a-z.md](./03-luong-nghiep-vu-a-z.md)
4. [04-kien-truc-he-thong.md](./04-kien-truc-he-thong.md)
5. [05-python-scanner.md](./05-python-scanner.md)
6. [06-phap-ly-rag-va-llm.md](./06-phap-ly-rag-va-llm.md)
7. [07-du-lieu-su-kien-va-bao-mat.md](./07-du-lieu-su-kien-va-bao-mat.md)
8. [08-ke-hoach-trien-khai.md](./08-ke-hoach-trien-khai.md)
9. [09-quan-tri-tai-lieu-va-lich-su.md](./09-quan-tri-tai-lieu-va-lich-su.md)
10. [10-doi-chieu-tai-lieu-goc.md](./10-doi-chieu-tai-lieu-goc.md)
11. [11-phase-5-2l.md](./11-phase-5-2l.md)
12. [12-review-truoc-ux-phase-5-2l.md](./12-review-truoc-ux-phase-5-2l.md)

## Trạng thái review hiện tại

```text
PHASE_5_2L_P0_CLOSURE_COMPLETED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
READY_FOR_CANONICAL_UX
CANONICAL_UX_DRAFT_CREATED_PENDING_APPROVAL
CHROMADB_STRUCTURE_FIRST_VECTORLESS_LEGAL_RAG_APPROVED
POSTGRESQL_PGVECTOR_LEGAL_RETRIEVAL_SUPERSEDED
CANONICAL_EPICS_AND_STORIES_MISSING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```

PR #2 đã đồng bộ target Phase 5.2L: PBAC, Automatic Trusted Scan Initiation, Python Worker Platform và scanner toolchain mở rộng. Closure pass sau review đã ghi nhận approval cho documentation/planning remediation, đổi A3 trong validation plan sang PBAC/trusted-trigger abuse risk, tách structured attestation khỏi active coverage và sửa marker readiness/traceability trước UX. Điều kiện RAG đã được chuẩn hóa thành ChromaDB structure-first vectorless legal RAG; pgvector legal retrieval bị superseded.

Báo cáo và checklist closure nằm tại `12-review-truoc-ux-phase-5-2l.md`.

## Quy tắc sử dụng

- Dùng `docs-vn/` để đọc nhanh và onboarding.
- Dùng `docs/` khi thiết kế, review hoặc triển khai chi tiết.
- Không dùng `docs/archive/` làm nguồn thẩm quyền hiện tại.
- UX draft đã được tạo tại `docs/planning-artifacts/ux-designs/ux-LCSP-2026-06-24/`; chưa được tạo epics/stories hoặc implementation readiness claim cho đến khi UX artifact được review/approved.
- Không suy diễn rằng tài liệu đã đồng nghĩa với mã nguồn, kiểm thử hoặc hạ tầng đã tồn tại.
