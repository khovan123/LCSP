# Phase 5.2L — Project Owner Scope and Runtime Correction

Status: `CORRECT_COURSE_REQUIRED`

Các quyết định mới của Project Owner:

- PBAC thay RBAC.
- Loại structured attestation khỏi MVP.
- Loại khỏi dự án: chứng nhận tuân thủ, nộp cơ quan quản lý và upload evidence JSON thủ công.
- Thay Local/CI report upload bằng auto-start scan dựa trên trusted account/repository/assessment context.
- Tất cả asynchronous domain workers chuyển sang Python Worker Platform.
- Scanner bổ sung Syft, Knip, deptry, Semgrep custom rules và tree-sitter/custom parser bên cạnh ast/libcst và ts-morph.

Tài liệu active chưa được xem là đã remediation cho đến khi hoàn tất `bmad-correct-course` và document synchronization.