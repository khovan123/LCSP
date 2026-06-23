# 03 — Luồng nghiệp vụ A-to-Z

## Luồng Manager chuẩn

```text
1. Đăng nhập
2. Chọn tổ chức
3. Tạo Assessment
4. Hoàn thành WizardProfile
5. Kết nối GitHub App
6. Chọn repository, branch và commit
7. Tạo RepositorySnapshot
8. Yêu cầu Repository Scan
9. Python Worker tạo TechnicalEvidenceReport
10. Tạo TechnicalProfile
11. Tạo AIUsageFlow
12. Reconciliation phát hiện conflict hoặc xác nhận sẵn sàng
13. Manager giải quyết conflict khi có
14. Tạo VerifiedProfile
15. Hybrid retrieval và LegalRuleMatch
16. RiskClassification và GapAnalysis
17. Tạo, lưu và tải GeneratedDocument
18. Xem và xuất Audit Trail
```

## Trạng thái assessment chính

```text
CREATED
-> WIZARD_PROFILE_READY
-> REPOSITORY_CONNECTED
-> SNAPSHOT_CREATED
-> SCAN_REQUESTED
-> SCAN_RUNNING
-> SCAN_COMPLETED
-> TECHNICAL_PROFILE_READY
-> AI_USAGE_FLOW_READY
-> RECONCILIATION_REQUIRED hoặc VERIFIED_PROFILE_READY
-> LEGAL_MATCHING_READY
-> CLASSIFICATION_READY hoặc CLASSIFICATION_BLOCKED
-> GAP_ANALYSIS_READY hoặc GAP_ANALYSIS_BLOCKED
-> DOCUMENT_GENERATED hoặc DOCUMENT_BLOCKED
```

Không được đi tắt từ Wizard sang risk, từ scan sang classification, từ VerifiedProfile sang classification khi chưa legal matching, hoặc từ classification sang final document khi chưa GapAnalysis.

## Luồng scan

Backend kiểm tra quyền và tạo `RepositoryScanJob`, `AuditEvent`, `OutboxEvent(command.scan.requested.v1)`. Python Worker khóa job, tạo workspace, lấy snapshot, phân tích Python và TS/JS, tạo evidence/report, chạy gate, xóa workspace rồi mới ghi trạng thái terminal và outbox event.

Scan hoàn tất chỉ khi report `QUALITY_VALID` và cleanup đã được xác minh. Mọi rerun tạo job/evidence chain mới, không sửa lịch sử.

## Luồng reconciliation

WizardProfile, TechnicalProfile và AIUsageFlow được so sánh. Nếu có khác biệt quan trọng, hệ thống tạo conflict và khóa classification. Manager xem hai phía, evidence refs, optional attestation, nhập lý do và chọn cách giải quyết. Scanner evidence vẫn bất biến.

## Luồng pháp lý

VerifiedProfile được chuyển thành query facets đã làm sạch. Hybrid retriever lọc theo corpus đã duyệt, nguồn, ngày hiệu lực và metadata; sau đó kết hợp FTS với vector similarity. Mỗi kết quả phải dựng lại citation đến văn bản, điều, khoản, điểm, URL nguồn, hash và corpus version.

Nếu thiếu citation hoặc legal basis, hệ thống không được tạo kết luận chắc chắn.

## Luồng classification và báo cáo

Classification worker dùng VerifiedProfile và LegalRuleMatch, gọi LLM Gateway khi cần, kiểm tra schema và guardrails rồi lưu kết quả hoặc blocked state. GapAnalysis dẫn xuất nghĩa vụ và khoảng trống. Document worker chỉ phát hành final report khi mọi gate hợp lệ.

Readiness-only export có thể được tạo trước nhưng phải ghi rõ chưa phải risk classification và không chứa nhãn HIGH/MEDIUM/LOW.

## Luồng Developer tùy chọn

```text
Nhận lời mời/task
-> chấp nhận phạm vi
-> xem finding đã làm sạch
-> gửi structured attestation
-> Manager xem xét khi cần
```

Developer không phải điều kiện để hoàn thành golden path.

## Luồng legal operations nội bộ

```text
Xác minh source URL
-> ingest snapshot và hash
-> chuẩn hóa văn bản
-> review
-> duyệt LegalCorpusVersion
-> xây FTS/vector index
-> mở corpus cho legal matching
```

Đây là luồng vận hành API/CLI nội bộ, không phải UX khách hàng.
