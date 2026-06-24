# 09 — Quản trị tài liệu và lịch sử

## Các lớp tài liệu

```text
docs/product/                       mục tiêu, phạm vi, actor, business rules
docs/specs/                         yêu cầu và hành vi domain chuẩn
docs/architecture/                  kiến trúc và ADR
docs/developer-execution-blueprints/ luồng dữ liệu/runtime
docs/implementation/                hợp đồng build và cấu hình
docs/code-map/                      ownership của module/API/table/queue
docs/planning-artifacts/             báo cáo readiness/remediation
docs/change-control/                 thay đổi phạm vi đã phê duyệt
docs/reviews/                        phản biện và quyết định xử lý
docs/archive/                        lịch sử, artifact bị thay thế hoặc delete candidate
```

## Thứ tự ưu tiên khi có xung đột

1. Change-control đã được Project Owner phê duyệt.
2. Product scope và canonical FR/NFR/AC.
3. ADR đang hiệu lực và có ghi rõ supersession.
4. Domain specs và state machines.
5. Implementation specs và code maps.
6. Planning/review reports.
7. Archive chỉ dùng để hiểu lịch sử.

Tài liệu mới hơn không tự động thắng; phải có authority và quan hệ supersession rõ ràng.

## Các thay đổi lịch sử chính

### Baseline cũ

Dự án từng dùng phạm vi controlled MVP với scanner thiên về TypeScript, Python syntax-only, mock LLM làm mặc định và legal corpus seed đơn giản.

### Scope pivot Phase 5.2J

Project Owner chuyển mục tiêu sang A-to-Z runnable MVP:

- Python Worker sở hữu scan lifecycle;
- Python analysis trở thành first-class bounded capability;
- real LLM/embedding provider là happy path bắt buộc;
- legal corpus có nguồn chính thức, provenance, review và immutable version;
- hybrid legal retrieval thực sự;
- workflow phải chạy từ login đến audit export.

Phase 5.2I vẫn là lịch sử hợp lệ cho phạm vi cũ nhưng không còn authority triển khai.

### Phase 5.2K

Các tài liệu active được chuẩn hóa lại về canonical UC/FR/AC/NFR, scanner ownership, legal corpus/retrieval, UX boundary và trạng thái readiness.

## Archive

`docs/archive/` chứa:

- quyết định cũ và báo cáo từng phase;
- kiến trúc gốc hoặc phương án đã bị supersede;
- artifact trùng lặp, delete candidate và story shell cũ;
- checklist/validation pack lịch sử;
- báo cáo consolidation và recovery.

Archive không được dùng để tạo UX, story hoặc code mới trừ khi tài liệu active dẫn chiếu rõ ràng.

## Reviews và feedback

Các register trong `docs/reviews/` lưu member feedback, quyết định canonical, triage và remediation evidence. Nội dung đã được chấp nhận phải phản ánh trong tài liệu active; review file không tự thay thế spec.

## Trạng thái planning

Tài liệu hiện cho phép bước UX tiếp theo nhưng không cho phép coding:

```text
CANONICAL_UX_AUTHORIZED
CANONICAL_UX_PENDING
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_READINESS_NOT_CERTIFIED
IMPLEMENTATION_NOT_AUTHORIZED
```

## Vai trò của docs-vn

`docs-vn/` giúp đọc nhanh toàn bộ hệ thống tài liệu bằng tiếng Việt. Nó không tạo yêu cầu mới, không thay đổi authority và không được dùng thay cho source doc khi review chi tiết.
