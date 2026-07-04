# BMAD Document Sync Checklist

## Mục tiêu

Checklist ngắn để giữ `story-handbook`, `story-index`, `developer guide`, và `dev compendium` đồng bộ với execution artifacts hiện hành sau mỗi thay đổi theo workflow BMAD.

## Source of truth

1. `docs/implementation-artifacts/sprint-status.yaml`
2. `docs/implementation-artifacts/<story-key>.md`
3. `docs/implementation/**`
4. `docs/developer/story-handbook/**`
5. `docs/developer/story-index.md`
6. `docs/developer/developer-implementation-guide.md`
7. `docs/implementation/dev-compendium.md`

## Khi nào phải chạy checklist

- Sau `create-story` hoặc khi thêm story artifact mới.
- Sau `dev-story` làm đổi `Status` của story.
- Sau `correct-course` hoặc change proposal làm đổi scope/story list/runtime ownership.
- Trước khi giao việc cho team hoặc dùng AI coding agent theo story packet.

## Checklist vận hành

1. Xác nhận `last_updated` trong `docs/implementation-artifacts/sprint-status.yaml` đã phản ánh thay đổi mới nhất.
2. Với mỗi story có file trong `docs/implementation-artifacts/`, kiểm tra `docs/developer/story-handbook/<story-key>.md` có cùng `Status`.
3. Với mỗi story đã có official artifact, kiểm tra dòng `Official execution artifact` trong `story-handbook` trỏ đúng path.
4. Refresh `docs/developer/story-index.md` để bảng catalog phản ánh đúng story mới, trạng thái mới, và artifact path mới.
5. Nếu phạm vi thực thi thay đổi đáng kể, cập nhật `docs/developer/developer-implementation-guide.md` phần `Read order`, `Story packet coverage`, và các working rules liên quan authority.
6. Nếu posture thực thi của toàn project thay đổi đáng kể, cập nhật `docs/implementation/dev-compendium.md` phần `Executive Summary`, `Dev Reality Check`, và `Current Sprint Snapshot`.
7. Nếu task catalog wording nhìn như mâu thuẫn với story-level authorization, chỉ rõ đây là khác biệt giữa `planning artifact` và `execution artifact`; không suy diễn hai lớp này là một.
8. Chạy kiểm tra nhanh để chắc không còn story-handbook nào có `Official execution artifact: chưa có` trong khi artifact thực đã tồn tại.
9. Chạy kiểm tra nhanh để chắc không còn story-handbook nào lệch `Status` so với `sprint-status.yaml`.

## BMAD mapping

- `create-story`: bắt buộc kiểm tra bước `1-5`.
- `dev-story`: bắt buộc kiểm tra bước `1-4`, `6`, `8`, `9`.
- `correct-course`: bắt buộc kiểm tra toàn bộ, đặc biệt bước `5-7`.

## Kỳ vọng đầu ra sau sync

- Developer mở `story-handbook` sẽ thấy đúng status và đúng execution artifact.
- `story-index` không bỏ sót story mới và không giữ snapshot cũ.
- `developer-implementation-guide` và `dev-compendium` không mô tả execution posture đã lỗi thời.
