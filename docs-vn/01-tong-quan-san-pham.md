# 01 — Tổng quan sản phẩm

## LCSP là gì

LCSP là nền tảng hỗ trợ doanh nghiệp sử dụng AI tại Việt Nam đánh giá mức độ sẵn sàng tuân thủ dựa trên bằng chứng. Hệ thống kết hợp thông tin do Manager khai báo, bằng chứng kỹ thuật từ kho mã, đối chiếu xung đột, tra cứu pháp lý có trích dẫn, phân loại rủi ro, phân tích khoảng trống, tạo tài liệu và nhật ký kiểm toán.

LCSP không thay thế luật sư và không được đưa ra kết luận pháp lý khi thiếu bằng chứng hoặc trích dẫn. Các khái niệm chứng nhận tuân thủ, ý kiến pháp lý chính thức và nộp trực tiếp cơ quan quản lý là `REMOVED_FROM_PRODUCT`.

## Phase 5.2L

- PBAC thay RBAC làm nguồn quyết định quyền truy cập.
- Structured attestation là `SUPERSEDED_FOR_ACTIVE_MVP`.
- `FR-050` là Automatic Trusted Scan Initiation, không phải upload Local/CI scanner report.
- `FR-051` manual evidence JSON là `REMOVED_FROM_PRODUCT`.
- Python Worker Platform sở hữu toàn bộ asynchronous domain workloads.
- Scanner toolchain gồm Syft, Knip, deptry, Semgrep custom rules, tree-sitter/custom parser, `ast`/`libcst` và bounded `ts-morph`.

## Người dùng và trách nhiệm

### Manager

Là chủ thể chính của assessment. Manager có thể hoàn thành toàn bộ luồng MVP mà không cần Developer: tạo assessment, khai báo WizardProfile, kết nối repository, chạy scan, xử lý xung đột, duyệt hồ sơ đã xác minh, xem kết quả pháp lý, phân loại, gap analysis, tải báo cáo và xuất audit.

### Developer

Là cộng tác viên tùy chọn, chỉ hoạt động trong phạm vi PBAC được giao. Developer có thể xem bằng chứng kỹ thuật đã làm sạch và hỗ trợ sửa ngữ cảnh repository/evidence khi việc đó có giá trị độc lập. Structured attestation không thuộc active MVP.

### Internal Legal Operator

Là vai trò vận hành nội bộ, dùng API/CLI để xác minh nguồn văn bản, kiểm tra dữ liệu đã chuẩn hóa, duyệt LegalCorpusVersion và khởi tạo chỉ mục. Vai trò này không thuộc UX dành cho Manager/Developer trong MVP.

## Phạm vi MVP

MVP bao gồm:

- đăng nhập, MFA/OAuth và phân quyền theo tổ chức;
- assessment và WizardProfile;
- GitHub App chỉ đọc, repository snapshot theo commit;
- Python Worker quét tĩnh mã nguồn;
- TechnicalEvidenceReport, TechnicalProfile và AIUsageFlow;
- reconciliation, conflict resolution và VerifiedProfile;
- legal corpus có nguồn gốc, phiên bản bất biến và phê duyệt;
- hybrid retrieval bằng PostgreSQL FTS + pgvector;
- real LLM/embedding provider cho bài nghiệm thu A-to-Z;
- RiskClassification, GapAnalysis, GeneratedDocument và AuditEvent.

## Ngoài phạm vi hiện tại

- enterprise SSO/SAML/SCIM;
- structured attestation;
- upload scanner report từ Local/CI;
- upload evidence JSON thủ công (`FR-051`);
- quy trình technical clarification tự do được giao cho Developer (`FR-052`);
- giao diện quản trị legal corpus cho khách hàng;
- cam kết scanner hiểu hoàn hảo mã động.

## Nguyên tắc sản phẩm

1. Evidence-first: không phân loại dựa trên Wizard hoặc package/model name đơn lẻ.
2. Fail-closed: thiếu bằng chứng, conflict, corpus hoặc citation thì chặn hoặc hạ cấp rõ ràng.
3. Manager-controlled: Manager là người chịu trách nhiệm cuối cùng trong MVP.
4. Traceable: mọi kết quả quan trọng phải liên kết tới evidence, legal citation, phiên bản và audit.
5. Privacy-by-design: không gửi raw source, secret hoặc full prompt sang LLM.
