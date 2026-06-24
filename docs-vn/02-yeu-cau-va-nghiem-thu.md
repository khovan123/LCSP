# 02 — Yêu cầu và nghiệm thu

## Trạng thái

Baseline trên `main` vẫn dùng bộ UC/FR/AC/NFR của Phase 5.2K. Phase 5.2L thay đổi authorization, collaboration, scan initiation và worker runtime, nên canonical counts/crosswalk phải được tạo lại trước UX.

## Thay đổi bắt buộc

### PBAC

Authorization phải đánh giá subject, organization, resource, action, context và policy version. Role chỉ là attribute hoặc policy template. Mọi quyết định phải tenant-scoped, deny-by-default và có audit.

### Loại attestation

Structured attestation không còn thuộc MVP. Use case, FR, AC, route, entity, event, reconciliation dependency, UX và story liên quan phải được loại khỏi active baseline.

### Scan initiation

- `FR-050` cũ về Local/CI upload được thay bằng automatic trusted scan initiation.
- `FR-051` manual evidence JSON upload bị loại khỏi sản phẩm.
- Không có manual report/file upload UI hoặc API.
- Trigger phải PBAC-authorized, idempotent, auditable và an toàn khi mapping thiếu hoặc mơ hồ.

### Python Worker Platform

Acceptance phải chứng minh mọi asynchronous domain workload chạy trên Python workers, gồm scan, profile, AIUsageFlow, reconciliation, legal pipeline, classification, gap analysis, document và async export.

### Scanner toolchain

Acceptance phải bao phủ Syft, Knip, deptry, Semgrep custom rules, tree-sitter/custom parser, `ast`/`libcst` và `ts-morph`, cùng version/config provenance, timeout, resource limit, normalized output và partial coverage behavior.

## Nghiệm thu mục tiêu

- PBAC deny-by-default và policy-decision audit.
- Trusted trigger tạo hoặc resume pending scan; duplicate không tạo scan trùng.
- Mapping thiếu hoặc mơ hồ tạo safe pending/blocked state.
- Tool failure tạo coverage limitation hoặc terminal failure theo severity.
- Golden path không phụ thuộc Developer hoặc attestation.
- A-to-Z dùng PostgreSQL, RabbitMQ, S3-compatible storage, approved corpus và real LLM/embedding provider.

## Traceability cần tái tạo

```text
UC -> FR -> AC -> NFR -> PBAC policy -> UX state -> domain state
-> Python worker/module -> queue/event -> failure/recovery behavior
```

```text
CURRENT_CANONICAL_COUNTS_REQUIRE_REBASE_AFTER_PHASE_5_2L
UX_REQUIREMENTS_BASELINE_NOT_READY
STORY_COVERAGE_NOT_ASSESSABLE
```