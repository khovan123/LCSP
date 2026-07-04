---
name: LCSP Wizard Epic 2
description: Canonical visual identity delta for the Epic 2 Manager Wizard and readiness-only workflow.
status: final
sources:
  - docs/product/prd.md
  - docs/product/business-rules.md
  - docs/specs/use-cases.md
  - docs/specs/domain-model.md
  - docs/planning-artifacts/research/domain-wizard-benchmark-chau-au-cho-lcsp-research-2026-06-26.md
  - docs/planning-artifacts/ux-designs/ux-LCSP-2026-06-24/DESIGN.md
updated: 2026-06-26
colors:
  background: '#F7F8FA'
  surface: '#FFFFFF'
  surface-muted: '#EEF1F4'
  surface-emphasis: '#E7F2F5'
  surface-warning: '#FFF6E6'
  surface-success: '#EAF7EF'
  surface-danger: '#FDECEC'
  ink: '#18202A'
  ink-muted: '#5B6673'
  ink-subtle: '#7B8794'
  border: '#D7DDE4'
  primary: '#155E75'
  primary-foreground: '#FFFFFF'
  accent: '#8A5A12'
  accent-foreground: '#FFFFFF'
  success: '#1F7A4D'
  warning: '#A15C00'
  danger: '#B42318'
  info: '#2563A6'
typography:
  display:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 30px
    fontWeight: '650'
    lineHeight: '1.2'
    letterSpacing: '0'
  headline:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 22px
    fontWeight: '650'
    lineHeight: '1.25'
    letterSpacing: '0'
  title:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 18px
    fontWeight: '620'
    lineHeight: '1.35'
    letterSpacing: '0'
  body:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 14px
    fontWeight: '400'
    lineHeight: '1.55'
    letterSpacing: '0'
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '560'
    lineHeight: '1.35'
    letterSpacing: '0'
  caption:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: '0'
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 20px
  '6': 24px
  '8': 32px
  '10': 40px
  page-gutter: 24px
  page-gutter-mobile: 16px
components:
  button-primary:
    background: '{colors.primary}'
    foreground: '{colors.primary-foreground}'
    radius: '{rounded.md}'
  wizard-section-card:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  pre-screen-card:
    background: '{colors.surface-emphasis}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  blocked-banner:
    background: '{colors.surface-warning}'
    foreground: '{colors.warning}'
    radius: '{rounded.md}'
  readiness-panel:
    background: '{colors.surface-muted}'
    border: '{colors.border}'
    radius: '{rounded.lg}'
  helper-drawer:
    background: '{colors.surface}'
    border: '{colors.border}'
    radius: '{rounded.xl}'
---

## Brand & Style

Wizard Epic 2 giữ nguyên tinh thần "compliance workbench" của LCSP nhưng hẹp trọng tâm vào một nhiệm vụ cụ thể: giúp Manager khai báo business/legal truth một cách rõ ràng, bình tĩnh, và không bị đe dọa bởi ngôn ngữ pháp lý hoặc kỹ thuật. Đây không phải là form marketing, không phải chatbot, và cũng không phải legal certificate wizard.

Bề mặt thị giác phải gợi cảm giác "guided intake có kiểm soát". Người dùng luôn thấy mình đang ở đâu, vì sao câu hỏi này quan trọng, và bước tiếp theo là gì. Tông tổng thể là nghiêm túc, operational, và không cường điệu. Wizard phải tạo cảm giác tiến triển có cấu trúc, không phải điền biểu mẫu hành chính nặng nề.

## Colors

Wizard dùng chính palette của LCSP để giữ continuity với product chung, nhưng nhấn mạnh ba semantic surfaces:

- **Primary teal (`{colors.primary}`)** cho hành động chính, step hiện tại, và điểm điều hướng chính. Nó biểu thị "product action", không biểu thị legal approval.
- **Muted operational surface (`{colors.surface-muted}`)** cho readiness-only panels, helper summaries, section metadata, và các phần giải thích nền.
- **Emphasis surface (`{colors.surface-emphasis}`)** dành riêng cho pre-screen cards và các decision points đầu luồng. Màu này giúp tầng pre-screen cảm thấy khác với detailed intake mà không tạo nghĩa state chính thức.
- **Warning amber (`{colors.warning}` / `{colors.surface-warning}`)** chỉ dùng cho blocked, degraded, insufficient, hoặc caution states.
- **Success green (`{colors.success}` / `{colors.surface-success}`)** chỉ xuất hiện sau khi hoàn tất một gate hợp lệ như save section, submit wizard, hoặc tạo readiness export.

Tránh:
- gradient lớn,
- nền màu đậm theo section,
- màu nóng để ép người dùng thấy "nguy cơ" quá sớm,
- bất kỳ treatment nào khiến readiness-only trông như final legal result.

## Typography

Typography phải ưu tiên tính điều hướng và khả năng quét nhanh hơn cá tính thương hiệu. Wizard là nơi người dùng đọc nhiều, phân biệt state nhiều, và cần tự tin rằng mình hiểu câu hỏi.

- `display` dành cho tên flow hoặc title cấp trang như "Khai báo bối cảnh hệ thống AI".
- `headline` dành cho section title và readiness summary headline.
- `title` dành cho card title, helper drawer title, blocked banner title.
- `body` là xương sống cho question text, help text, validation message, và next-step guidance.
- `caption` dành cho mapping metadata, audit-safe IDs, và nhãn provenance ngắn.

Không dùng uppercase lớn, wording dày đặc, hoặc hierarchy quá yếu giữa question text và help text.

## Layout & Spacing

Wizard dùng layout một cột chính có "guidance rail" phụ trên desktop và panel xếp chồng trên mobile.

- Trang desktop: vùng nội dung chính hẹp vừa phải để question text vẫn dễ đọc; cột phụ hiển thị progress, section status, và readiness summary tạm thời.
- Tablet/mobile: guidance rail chuyển thành sheet hoặc stacked panels theo thứ tự workflow.
- Section card cần nhịp thở lớn hơn form business thông thường: `16px` cho phần tử liên quan gần, `24px` cho ngắt giữa cụm câu hỏi, `32px` giữa section lớn.
- Question groups phức tạp không được nhồi vào một card duy nhất nếu khiến màn hình trông như checklist pháp lý.

## Elevation & Depth

Depth trong Wizard đến từ grouping và surface tone, không đến từ shadow mạnh.

- `wizard-section-card` là object chính cho detailed intake.
- `pre-screen-card` có thể nổi nhẹ bằng nền khác nhưng không dùng shadow nặng.
- `helper-drawer` và mobile sheets có thể có elevation vừa phải để khẳng định chế độ trợ giúp/ngắt luồng.
- Banners blocked/readiness dùng tonal contrast trước, shadow sau.

Không dùng card lồng card nhiều tầng vì Wizard cần cảm giác tuyến tính, không phải dashboard chồng lớp.

## Shapes

Shape language giữ tight radii của LCSP:

- `rounded/sm` cho chips và badge nhỏ.
- `rounded/md` cho button, input, step indicators nhỏ.
- `rounded/lg` cho section cards, readiness panel, helper blocks.
- `rounded/xl` cho helper drawer hoặc modal giải thích theo ngữ cảnh.

Không dùng pill buttons lớn hoặc ornamental rounded containers làm Wizard cảm giác consumer-app.

## Components

- **Primary button** — `{components.button-primary}`. Chỉ một CTA chính mỗi panel footer: `Tiếp tục`, `Lưu bản nháp`, hoặc `Gửi khai báo`.
- **Wizard section card** — `{components.wizard-section-card}`. Chứa một cụm question có mục tiêu chung, luôn có title, section purpose ngắn, và optional progress state.
- **Pre-screen card** — `{components.pre-screen-card}`. Dùng cho tầng scoping đầu luồng, ưu tiên câu hỏi ngắn, lựa chọn rõ, và explanation nhẹ.
- **Blocked banner** — `{components.blocked-banner}`. Luôn có: reason, next action, correlation/reference ID nếu có.
- **Readiness panel** — `{components.readiness-panel}`. Hiển thị readiness-only summary, missing evidence, và next action; tuyệt đối không dùng visual treatment giống final classification card.
- **Helper drawer** — `{components.helper-drawer}`. Mở khi người dùng cần "Vì sao LCSP hỏi câu này?" hoặc ví dụ theo ngành; drawer này là didactic surface, không phải chat.
- **Stepper** — kế thừa ngôn ngữ stepper chung của LCSP, nhưng nhấn mạnh 2 pha: `Pre-screen` và `Khai báo chi tiết`.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Dùng surface và spacing để giảm áp lực khi điền form | Nhồi toàn bộ câu hỏi vào một màn hình dài |
| Tách rõ pre-screen với detailed intake | Trộn câu phân luồng với câu khai báo chi tiết |
| Làm readiness-only panel khác hẳn final-result panels | Dùng badge/màu khiến readiness giống kết luận cuối |
| Luôn có help text theo ngữ cảnh cho câu khó | Bắt Manager hiểu legal text hoặc jargon kỹ thuật |
| Duy trì cảm giác workbench bình tĩnh, có cấu trúc | Làm Wizard giống chatbot hay survey vui vẻ |
