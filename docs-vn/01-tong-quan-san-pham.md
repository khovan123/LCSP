# 01 — Tổng quan sản phẩm

## LCSP là gì

LCSP là nền tảng hỗ trợ doanh nghiệp sử dụng AI tại Việt Nam đánh giá và lập hồ sơ tuân thủ dựa trên bằng chứng. Hệ thống kết hợp thông tin do Manager khai báo, bằng chứng kỹ thuật từ kho mã, reconciliation, legal matching có citation, risk classification, gap analysis, document generation và audit trail.

LCSP chỉ tạo kết quả hỗ trợ quyết định nội bộ dựa trên evidence và citation. Các khái niệm chứng nhận tuân thủ, ý kiến pháp lý chính thức và nộp hồ sơ trực tiếp cho cơ quan quản lý đã bị loại khỏi định hướng sản phẩm Phase 5.2L; chúng không được giữ như feature tương lai.

## Actor mục tiêu Phase 5.2L

### Manager

Manager sở hữu assessment và có thể hoàn thành toàn bộ golden path: tạo assessment, hoàn thành WizardProfile, kết nối repository, khởi tạo hoặc theo dõi scan, xử lý conflict, xem VerifiedProfile, legal matches, classification, gaps, document và audit export.

### Developer

Developer chỉ tồn tại khi có giá trị độc lập như hỗ trợ repository/integration hoặc xem finding trong phạm vi policy. Structured attestation không còn thuộc MVP và không được xuất hiện trong reconciliation, evidence hoặc UX.

### Internal Legal Operator

Vai trò vận hành nội bộ dùng API/CLI để xác minh nguồn pháp lý, review corpus, duyệt LegalCorpusVersion và khởi tạo index. Vai trò này không thuộc customer-facing UX.

### LCSP service identities

Các Python workers và service nội bộ hành động bằng service identity được PBAC đánh giá theo organization, resource, action, context và policy version.

## Phạm vi MVP mục tiêu

- authentication, MFA/OAuth và PBAC deny-by-default;
- organization, assessment và WizardProfile;
- GitHub App chỉ đọc và RepositorySnapshot theo commit;
- automatic trusted scan initiation, không upload report thủ công;
- Python Worker Platform cho toàn bộ asynchronous domain workloads;
- scanner toolchain gồm Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast`, `libcst` và `ts-morph`;
- TechnicalEvidenceReport, TechnicalProfile và AIUsageFlow;
- reconciliation, conflict resolution và VerifiedProfile;
- legal corpus có provenance, approval và immutable version;
- hybrid retrieval bằng PostgreSQL FTS + pgvector;
- real LLM/embedding provider cho A-to-Z acceptance;
- RiskClassification, GapAnalysis, GeneratedDocument và AuditEvent.

## Loại khỏi sản phẩm

```text
REMOVED_FROM_PRODUCT
- compliance certification
- formal legal opinion
- direct regulator submission
- manual technical evidence JSON upload (FR-051 cũ)
- structured attestation trong MVP
- manual Local/CI scanner report upload
```

## Nguyên tắc sản phẩm

1. Evidence-first: không phân loại dựa trên Wizard, dependency hoặc model name đơn lẻ.
2. Fail-closed: thiếu evidence, conflict, corpus, citation hoặc policy decision thì chặn rõ ràng.
3. PBAC-controlled: role chỉ là attribute/template, không phải nguồn quyết định cuối cùng.
4. Python-worker-first: mọi async domain workload chạy trên Python Worker Platform.
5. Traceable: kết quả liên kết tới repository snapshot, tool versions, evidence, legal citation, policy version và audit.
6. Privacy-by-design: không gửi raw source, secret hoặc full prompt sang external model.

## Authority note

Đây là target direction Phase 5.2L. Tài liệu active trên `main` vẫn chưa được remediation đầy đủ, vì vậy chưa được dùng làm UX handoff baseline.
