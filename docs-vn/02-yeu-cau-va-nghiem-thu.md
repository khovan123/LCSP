# 02 — Yêu cầu và nghiệm thu

## Bộ định danh chuẩn

- Use case: `UC-001..UC-018`.
- Functional requirement: `FR-001..FR-056`.
- Active MVP: `FR-001..FR-049`, `FR-053..FR-056`.
- Deferred: `FR-050..FR-052`.
- Acceptance criteria: `AC-001..AC-041`.
- Active NFR: `NFR-001..NFR-030`, `NFR-033..NFR-035`.

Các ID cũ như `UC-MXX-XX`, `FR-E*`, `FR-057..FR-082`, `NFR-031`, `NFR-032` chỉ còn ý nghĩa lịch sử hoặc alias; không được dùng làm traceability mới.

## Nhóm yêu cầu chức năng

### Danh tính và quản trị

Đăng ký, đăng nhập, MFA, session, OAuth/OIDC, organization, membership, role và scoped Developer policy. OAuth login và GitHub repository permission là hai quyền độc lập.

### Assessment và repository

Manager tạo assessment, hoàn thành WizardProfile, kết nối GitHub App chỉ đọc, chọn branch/commit và tạo RepositorySnapshot bất biến.

### Scanner và evidence

Python Worker chạy static analysis, tạo SourceFile metadata, graph, EvidenceReference, TechnicalFinding và TechnicalEvidenceReport. Chỉ report đạt schema, privacy và quality gate mới được dùng tiếp.

### Intelligence và reconciliation

Hệ thống tạo TechnicalProfile, AIUsageFlow, phát hiện conflict, cho Manager giải quyết và tạo VerifiedProfile. Critical unknown hoặc conflict chưa giải quyết sẽ khóa bước sau.

### Legal matching và classification

Hệ thống chỉ dùng LegalCorpusVersion đã duyệt và đã có chỉ mục. Hybrid retrieval phải trả về citation đầy đủ; classification chỉ chạy sau VerifiedProfile và LegalRuleMatch.

### Reporting và audit

GapAnalysis và final report yêu cầu đủ classification, legal basis, citation và không có conflict. Readiness-only export được phép sớm hơn nhưng không có risk level. Mọi sự kiện quan trọng được audit và có thể xuất bản ghi đã làm sạch.

## Yêu cầu phi chức năng trọng yếu

- Xác thực, session, MFA, rate limit và OAuth an toàn.
- Tenant isolation và RBAC phía server.
- Không raw source sang LLM hoặc lưu trữ dài hạn.
- Evidence provenance, hash, version và immutable history.
- Fail-closed khi thiếu evidence, citation hoặc corpus.
- RabbitMQ/outbox có idempotency, retry và DLQ.
- Trạng thái UI rõ ràng: loading, empty, insufficient, blocked, failed, retry, rerun.
- Kiểm soát chi phí LLM/embedding.
- Legal corpus đã duyệt phải bất biến.
- Python Worker phải chạy trong workspace hạn chế và xác minh cleanup.

## Nghiệm thu A-to-Z

Bài nghiệm thu chuẩn sử dụng hạ tầng thật:

- PostgreSQL và RabbitMQ thật;
- S3-compatible object storage thật;
- repository fixture thật theo commit;
- approved legal corpus và chỉ mục FTS/vector thật;
- LLM và embedding provider thật;
- document artifact và audit export thật.

Manager phải hoàn thành từ đăng nhập đến xuất audit mà không phụ thuộc Developer. Mock LLM hoặc mock embedding không đủ điều kiện cho nghiệm thu A-to-Z.

## Negative paths bắt buộc

Các tình huống cần có hành vi rõ ràng gồm repository không truy cập được, parser lỗi từng file, dynamic Python flow, cleanup thất bại, conflict chưa giải quyết, corpus chưa duyệt, zero citation candidate, provider timeout, model output sai schema, duplicate message, outbox publish lỗi và document guardrail vi phạm.

## Quy tắc traceability

Mỗi story tương lai phải liên kết tối thiểu:

```text
UC -> FR -> AC -> NFR -> UX state -> domain state -> implementation area -> recovery behavior
```

Hiện chưa có canonical UX và canonical epics/stories, vì vậy story coverage chưa thể đánh giá và implementation chưa được phép bắt đầu.
