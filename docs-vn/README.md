# LCSP — Tài liệu tóm lược tiếng Việt

## Mục đích

`docs-vn/` là bản tóm lược tiếng Việt theo chủ đề của hệ thống tài liệu trong `docs/`. Khi có khác biệt, change-control đã được Project Owner duyệt, tài liệu active trong `docs/` và ADR đang hiệu lực là nguồn chuẩn.

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

## Trạng thái được kiểm chứng trên GitHub

```text
MAIN_HEAD_73f47560a075fe7991ba2611a87f52abbe2e0496
PHASE_5_2L_PROJECT_OWNER_DIRECTION_RECORDED_ON_PR_2
ACTIVE_DOCS_STILL_PHASE_5_2K_BASELINE
ACTIVE_DOCS_NOT_SYNCHRONIZED_FOR_PHASE_5_2L
UX_HANDOFF_BLOCKED
IMPLEMENTATION_NOT_AUTHORIZED
SPRINT_EXECUTION_NOT_AUTHORIZED
```

Tại thời điểm review, `main` vẫn chứa baseline Phase 5.2K: RBAC, structured attestation, Node.js downstream workers, `FR-050` Local/CI upload và `FR-051` manual evidence JSON. Hai artifact được agent báo cáo cho ngày 2026-06-24 chưa có trên `main` hoặc branch PR #2 nên chưa thể dùng làm authority trong GitHub review.

Các tệp `01..11` đã được cập nhật để mô tả **target direction Phase 5.2L**, nhưng target này chưa thay thế tài liệu active cho đến khi:

```text
Project Owner approves Sprint Change Proposal
-> active non-archive docs are remediated
-> closure review passes
-> canonical UX starts
```

## Quy tắc sử dụng

- Dùng `docs-vn/` để onboarding và hiểu target direction.
- Dùng `12-review-truoc-ux-phase-5-2l.md` để xem blockers hiện tại.
- Không bắt đầu `bmad-ux` dựa trên baseline Phase 5.2K.
- Không dùng `docs/archive/` làm authority hiện tại.
- Không coi tài liệu là bằng chứng rằng code, test hoặc hạ tầng đã tồn tại.
