# 01 — Tổng quan sản phẩm

## LCSP là gì

LCSP là nền tảng hỗ trợ doanh nghiệp sử dụng AI tại Việt Nam đánh giá mức độ sẵn sàng tuân thủ dựa trên bằng chứng. Hệ thống kết hợp thông tin do Manager khai báo, bằng chứng kỹ thuật từ kho mã, đối chiếu xung đột, tra cứu pháp lý có trích dẫn, phân loại rủi ro, phân tích khoảng trống, tạo tài liệu và nhật ký kiểm toán.

LCSP không thay thế luật sư, không cấp chứng nhận tuân thủ và không được đưa ra kết luận pháp lý khi thiếu bằng chứng hoặc trích dẫn.

## Người dùng và trách nhiệm

### Manager

Là chủ thể chính của assessment. Manager có thể hoàn thành toàn bộ luồng MVP mà không cần Developer: tạo assessment, khai báo WizardProfile, kết nối repository, chạy scan, xử lý xung đột, duyệt hồ sơ đã xác minh, xem kết quả pháp lý, phân loại, gap analysis, tải báo cáo và xuất audit.

### Developer

Là cộng tác viên tùy chọn, chỉ hoạt động trong phạm vi được giao. Developer có thể xem bằng chứng kỹ thuật đã làm sạch và gửi structured attestation. Attestation không được thay thế bằng chứng máy, tự giải quyết xung đột, duyệt VerifiedProfile hoặc mở khóa classification.

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

- chứng nhận tuân thủ hoặc ý kiến pháp lý chính thức;
- nộp hồ sơ trực tiếp cho cơ quan quản lý;
- enterprise SSO/SAML/SCIM;
- upload scanner report từ Local/CI (`FR-050`);
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
