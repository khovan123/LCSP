# 11 — Phase 5.2L: Điều chỉnh phạm vi và runtime

## Trạng thái

```text
PROJECT_OWNER_DIRECTIVE_RECORDED
CORRECT_COURSE_REQUIRED
ACTIVE_DOCS_NOT_YET_REMEDIATED
```

## Các quyết định mới

- PBAC thay RBAC làm nguồn quyết định quyền truy cập.
- Structured attestation bị loại khỏi MVP.
- Không giữ trong định hướng sản phẩm các khả năng chứng nhận tuân thủ, nộp hồ sơ trực tiếp cho cơ quan quản lý và upload evidence JSON thủ công.
- FR-050 không còn là upload Local/CI report; thay bằng auto-start hoặc resume pending scan từ trusted account, organization, repository, assessment, branch, commit, webhook hoặc backend trigger.
- Tất cả asynchronous domain workloads chuyển sang Python Worker Platform.
- Node.js chỉ còn cho NestJS/Web và TS/JS analyzer CLI.
- Scanner bổ sung Syft, Knip, deptry, Semgrep custom rules và tree-sitter/custom parser bên cạnh `ast`, `libcst` và `ts-morph`.

## Kiến trúc mục tiêu

```text
NestJS API = synchronous control plane
Web = product UI
Python Worker Platform = all asynchronous domain workloads
Node.js CLI = bounded TS/JS analyzer adapter
```

Python Worker Platform gồm nhiều consumer/module độc lập cho scan, profile, AIUsageFlow, reconciliation, legal pipeline, classification, gap analysis, document và async export. Không thiết kế một tiến trình Python monolith.

## Scanner toolchain mục tiêu

```text
snapshot
-> Syft SBOM/dependency inventory
-> Knip và deptry dependency usage checks
-> ast/libcst và ts-morph semantic analysis
-> tree-sitter/custom parser structural augmentation
-> Semgrep custom AI rules
-> import/call/data-flow graph fusion
-> normalized evidence/findings
-> TechnicalEvidenceReport gates
```

Tool version, config/ruleset hash, timeout, resource limits, output schema, redaction và failure behavior phải được ghi rõ. Không cài dependency của repository hoặc chạy application code của khách hàng.

## Nguồn chi tiết

Xem `docs/planning-artifacts/phase-5-2l-project-owner-scope-runtime-correction.md`.

Tài liệu active hiện tại chưa được coi là đã đồng bộ theo Phase 5.2L cho đến khi hoàn tất `bmad-correct-course`, Project Owner approval và document remediation.
