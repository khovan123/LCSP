---
name: LCSP Wizard Epic 2
status: final
sources:
  - docs/product/prd.md
  - docs/product/business-rules.md
  - docs/specs/use-cases.md
  - docs/specs/domain-model.md
  - docs/specs/domain-state-machines.md
  - docs/planning-artifacts/research/domain-wizard-benchmark-chau-au-cho-lcsp-research-2026-06-26.md
  - docs/planning-artifacts/ux-designs/ux-LCSP-2026-06-24/EXPERIENCE.md
updated: 2026-06-26
---

# LCSP Wizard Epic 2 — Experience Spine

## Foundation

Responsive web flow cho Manager trong `apps/web`, dựa trên canonical LCSP experience nhưng thu hẹp vào bài toán `WizardProfile` và `readiness-only`. `DESIGN.md` là visual identity reference; tài liệu này định nghĩa cách flow hoạt động, state, interactions, accessibility và key journeys.

Wizard Epic 2 là một companion experience package cho canonical LCSP UX. Trên xung đột:
- package này thắng đối với mọi quyết định liên quan `WizardProfile` và readiness-only flow của Epic 2;
- canonical LCSP experience vẫn thắng đối với các bề mặt ngoài Epic 2.

Wizard phải giữ 3 nguyên tắc:
- Manager tự hoàn tất được mà không cần Developer.
- Không hiển thị final risk level hoặc legal conclusion khi mới có self-declared input.
- Mọi câu trả lời critical đều tạo ra structured artifact dùng được downstream.

## Information Architecture

| Surface | Reached from | Purpose |
|---|---|---|
| Assessment overview | Assessment row / app open | Entry point để bắt đầu hoặc tiếp tục Wizard |
| Wizard landing | Overview / stepper | Giới thiệu Wizard, scope, expected time, và dữ liệu sẽ được hỏi |
| Pre-screen | Wizard landing | Phân luồng sớm theo prohibited/high-impact/transparency-relevant indicators |
| Detailed intake stepper | Sau pre-screen | Thu thập business/legal truth theo section có cấu trúc |
| Helper drawer | Từ question help trigger | Giải thích "vì sao hỏi", ví dụ, và thuật ngữ liên quan |
| Save-and-exit confirm | Wizard actions | Cho phép lưu nháp an toàn và rời flow |
| Readiness result | Submit Wizard | Hiển thị trạng thái readiness-only, missing evidence, và next actions |
| Section review | Từ stepper hoặc readiness result | Cho phép quay lại sửa section trước khi downstream gates mở |

Wizard không tạo surface riêng cho:
- final risk classification,
- legal conclusion,
- manual technical evidence upload,
- free-form delegated clarification.

## Voice and Tone

Microcopy phải chính xác, dễ hiểu, và không gây cảm giác "thi pháp lý".

| Do | Don't |
|---|---|
| "Mô tả ngắn hệ thống này đang hỗ trợ quyết định gì." | "Xác định nature of automated decisioning." |
| "Bạn chưa cần kết luận mức rủi ro ở bước này." | "LCSP sẽ xếp loại pháp lý ngay sau khi bạn trả lời." |
| "Nếu chưa chắc, bạn có thể chọn 'Tôi chưa rõ'." | "Không chắc thì bỏ qua." |
| "Kết quả hiện tại chỉ là readiness-only." | "Đánh giá tuân thủ của bạn đã hoàn tất." |
| "Bước tiếp theo là bổ sung bằng chứng kỹ thuật." | "Hệ thống cần quét repository để xác nhận." trong ngữ cảnh chưa giải thích |

Voice phải bình tĩnh, hướng dẫn, không ép buộc, không tri ân giả tạo, không dùng legalese hoặc jargon khi có thể diễn đạt bằng business/legal language.

## Component Patterns

| Component | Use | Behavioral rules |
|---|---|---|
| Wizard landing header | Bắt đầu flow | Nêu mục tiêu, thời lượng ước lượng, và nhắc rằng kết quả chưa phải final legal conclusion |
| Pre-screen card stack | Tầng phân luồng đầu | Mỗi card hỏi một tín hiệu lớn; chọn xong mới mở câu follow-up khi cần |
| Section progress rail | Desktop guidance rail / mobile summary | Cho thấy section nào chưa bắt đầu / đang làm / đủ điều kiện submit / còn thiếu critical answer |
| Question group | Detailed intake | Gom các câu cùng mục tiêu; có title, rationale ngắn, optional helper trigger |
| Helper drawer | Contextual support | Được mở theo từng question; không làm mất dữ liệu đang điền; chứa ví dụ và giải thích ngắn |
| Unknown-state selector | Câu hỏi critical | Cho phép trả lời `Tôi chưa rõ`; khi chọn, hệ thống lưu explicit unknown thay vì xem là missing |
| Validation block | Submit hoặc section completion | Chỉ rõ field nào cần bổ sung hoặc xác nhận trước khi tiếp tục |
| Readiness panel | Sau submit | Hiển thị readiness-only badge, missing evidence checklist, blockers, next step CTA |

## State Patterns

| State | Surface | Treatment |
|---|---|---|
| Wizard chưa bắt đầu | Overview / landing | Giải thích scope và CTA bắt đầu |
| Pre-screen in progress | Pre-screen | Tiến trình ngắn, câu hỏi từng cụm, không hiện detailed intake cùng lúc |
| Detailed section draft | Detailed intake | Autosave theo section; hiển thị progress và trạng thái "đã lưu nháp" |
| Critical answer missing | Section / submit | Không cho submit hoàn toàn; đánh dấu rõ field thiếu hoặc chưa xác nhận |
| Explicit unknown captured | Question group / readiness | Hiển thị neutral indicator; downstream readiness xem đây là gap có chủ đích |
| Wizard submitted, no evidence | Readiness result | Badge `Readiness only`; hiển thị missing evidence checklist và next step |
| Readiness blocked by missing critical context | Readiness result | Hiển thị section cần quay lại; không mở downstream gates |
| Manager exits early | Save-and-exit | Draft được lưu; overview hiển thị section progress tiếp tục được |
| Permission denied | Any wizard surface | Fail closed, không lộ assessment data ngoài safe message và recovery path |

## Interaction Primitives

- Wizard có 2 pha rõ ràng:
  - `Pre-screen`
  - `Khai báo chi tiết`
- Người dùng có thể quay lại section trước đó nhưng không thể nhảy tới readiness result nếu chưa submit hợp lệ.
- Autosave xảy ra ở cấp section hoặc pause-safe input clusters; submit luôn là explicit action.
- Mỗi question critical có thể có:
  - single select
  - multi-select có giới hạn hợp lý
  - short structured text
  - explicit unknown
- Helper drawer mở theo demand; đóng lại trả focus về đúng trigger.
- Desktop hiển thị guidance rail; mobile chuyển thành stacked summary hoặc top-sheet.
- Banned:
  - infinite scroll form
  - long legal prose inline
  - chatbot input pattern
  - survey progress "gamification"

## Accessibility Floor

- WCAG 2.2 AA cho toàn bộ flow.
- Mọi progress/state thay đổi phải được announce cho assistive tech.
- Mọi câu hỏi critical phải dùng semantic labels rõ ràng.
- `Tôi chưa rõ` phải keyboard selectable và screen-reader friendly như các option khác.
- Validation phải gắn đúng field và không chỉ phụ thuộc vào màu.
- Helper drawer, save-and-exit confirm, và readiness panel phải quản focus đúng cách.
- Nội dung dài trong helper drawer phải đọc được theo block, không phải tooltip hẹp.

## Inspiration & Anti-patterns

- **Lifted from CNIL PIA pattern:** didactic assistance theo ngữ cảnh, modular flow, knowledge-backed explanation.
- **Lifted from TAI Scan pattern:** `pre-screening -> assessment`.
- **Lifted from ICO framework:** action-oriented readiness and expectations mapping.
- **Rejected:** one-page mega form.
- **Rejected:** risk level shown immediately after self-report.
- **Rejected:** free-form “mô tả kỹ thuật” thay cho structured answers.
- **Rejected:** provider- or repo-centric wording xuất hiện trước khi người dùng hiểu business question.

## Responsive & Platform

| Breakpoint | Behavior |
|---|---|
| Desktop | Main column + guidance rail. Pre-screen cards có thể hiển thị theo stack ngắn; helper drawer mở cạnh phải. |
| Tablet | Guidance rail gập thành summary panel; stepper vẫn rõ ràng. |
| Phone | Mỗi step ưu tiên một mục tiêu; helper và readiness mở full-screen sheet. |

Wizard là responsive web flow, nhưng surface chính để hoàn tất detailed intake vẫn là desktop/laptop.

## Key Flows

### Flow 1 — Manager hoàn tất Wizard lần đầu

1. Linh mở assessment overview và thấy CTA bắt đầu Wizard.
2. Wizard landing giải thích đây là khai báo business/legal context và chưa phải đánh giá rủi ro cuối.
3. Linh đi qua pre-screen:
   - hệ thống dùng AI để làm gì,
   - ai bị ảnh hưởng,
   - có chạm dữ liệu cá nhân/nhạy cảm hay không,
   - có liên quan quyết định hệ trọng hay không.
4. **Climax:** hệ thống chuyển sang detailed intake với section phù hợp, không bắt Linh điền những nhánh không liên quan.
5. Linh hoàn thành các section và submit.
6. Readiness result hiển thị `Readiness only`, danh sách missing evidence, và CTA sang bước technical evidence.

Failure: Linh bỏ trống câu critical. Wizard không cho submit và chỉ rõ section/question cần bổ sung bằng business language.

### Flow 2 — Manager không chắc ở một field nhạy cảm

1. Minh đến câu hỏi về biometric hoặc special category data.
2. Anh bấm helper drawer để xem ví dụ ngắn.
3. Vẫn chưa chắc, anh chọn `Tôi chưa rõ`.
4. Hệ thống lưu explicit unknown thay vì xem là lỗi.
5. **Climax:** sau submit, readiness result vẫn thành công nhưng ghi rõ đây là thông tin cần xác minh thêm trước downstream stages.

Failure: unknown bị dùng quá nhiều ở các field critical. Readiness result vẫn không show final risk, đồng thời nhấn mạnh chưa đủ cơ sở để đi xa hơn.

### Flow 3 — Manager quay lại chỉnh sửa sau khi xem readiness

1. Hằng submit Wizard và xem readiness result.
2. Panel cho thấy `Decision role` còn mơ hồ và `External LLM usage` chưa đủ chi tiết.
3. Hằng bấm quay lại section liên quan.
4. Cô sửa câu trả lời, lưu section, rồi submit lại.
5. **Climax:** readiness panel cập nhật tức thì, bớt blocker và next step rõ hơn.

Failure: assessment stale hoặc permission thay đổi. Wizard fail closed với safe blocked message, không làm mất draft đã lưu.

## Product-Specific Concerns

### Question Architecture Contract

Mỗi câu hỏi critical trong Wizard phải có registry ngoài UX copy:

- `question_id`
- `section_id`
- `wizard_profile_field`
- `field_type`
- `criticality`
- `allows_unknown`
- `downstream_uses`
- `readiness_implication`
- `reconciliation_implication`

Registry này là seam bắt buộc giữa UX, API contracts và story refinement.

### Scenario Overlays

Canonical core phải áp dụng được cho mọi use case, nhưng UX copy/testing ban đầu phải ưu tiên:
- public chatbot,
- HR screening,
- credit/eligibility decision support.

Overlay chỉ được thêm sau khi core flow đủ tốt; không làm nổ complexity của version đầu.

## Open Questions

1. [ASSUMPTION] UI system của frontend Wizard chưa được khóa; khi có shadcn/ui hoặc hệ khác, cần bổ sung delta cụ thể nếu cần.
2. [ASSUMPTION] Cần một artifact riêng `question-to-WizardProfile mapping table`; package UX này chưa chứa bảng đó.
3. [ASSUMPTION] Chưa render visual mockups trong run này; nếu team cần, bước tiếp theo là tạo 3 key-screen mockups cho landing, detailed section, readiness result.
