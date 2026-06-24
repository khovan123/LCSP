# 03 — Luồng nghiệp vụ A-to-Z

## Golden path mục tiêu Phase 5.2L

```text
1. Đăng nhập và vào organization
2. PBAC đánh giá quyền tạo Assessment
3. Manager tạo Assessment
4. Hoàn thành WizardProfile
5. Kết nối GitHub App chỉ đọc
6. Liên kết repository, branch và commit
7. Tạo RepositorySnapshot
8. Trusted trigger tạo hoặc resume pending scan
9. Python Scanner Worker chạy toolchain và tạo TechnicalEvidenceReport
10. Python TechnicalProfile Worker tạo TechnicalProfile
11. Python AIUsageFlow Worker tạo AIUsageFlow
12. Python Reconciliation Worker tạo conflict hoặc VerifiedProfile
13. Manager giải quyết conflict khi có
14. Python Legal Workers ingest/index/retrieve và tạo LegalRuleMatch
15. Python Classification Worker tạo RiskClassification hoặc blocked state
16. Python Gap Worker tạo GapAnalysis
17. Python Document Worker tạo và lưu GeneratedDocument
18. Manager tải document và xuất audit
```

Golden path không phụ thuộc Developer hoặc structured attestation.

## Automatic scan initiation

Không có Local/CI report upload hoặc manual evidence JSON upload.

```text
trusted integration event
-> resolve organization/account
-> resolve GitHub installation/repository
-> resolve assessment/branch/commit
-> PBAC decision
-> idempotency check
-> create hoặc resume pending scan
```

Khi thiếu hoặc mơ hồ context, hệ thống phải dừng ở safe state như `WAITING_FOR_CONTEXT`, `PENDING_MAPPING` hoặc `BLOCKED_MAPPING`. Không được tự đoán repository hoặc assessment.

## Scanner flow

```text
snapshot
-> inventory/bounds
-> Syft
-> Knip và deptry
-> ast/libcst và ts-morph
-> tree-sitter/custom parser
-> Semgrep custom rules
-> graph/evidence fusion
-> TechnicalEvidenceReport gates
-> workspace cleanup verification
-> completed/failed event
```

Mọi tool output đều được normalize, validate, redact và gắn version/config provenance.

## Reconciliation

WizardProfile, TechnicalProfile và AIUsageFlow được so sánh. Conflict quan trọng khóa VerifiedProfile và classification. Manager xem evidence refs, nhập rationale và quyết định. Structured attestation không còn là input của reconciliation.

## Legal, classification và document

VerifiedProfile được chuyển thành sanitized legal query facets. Python legal workers dùng approved corpus và hybrid retrieval có citation. Classification fail closed khi thiếu citation, corpus, critical evidence hoặc provider output hợp lệ. Final document chỉ được phát hành sau classification, GapAnalysis và output guards.

## PBAC trong mọi bước

API và Python workers đều dùng actor/service identity. Mỗi action quan trọng phải có policy decision với subject, resource, action, organization, context, policy version và correlation ID.

## Trạng thái review

Luồng này là target Phase 5.2L. Active state machines, event catalog, FR/AC và code maps trên `main` chưa được đồng bộ, nên chưa đủ điều kiện để bắt đầu UX.
