# 11 — Phase 5.2L: Điều chỉnh phạm vi và runtime

## Trạng thái

```text
PROJECT_OWNER_DIRECTIVE_RECORDED
SPRINT_CHANGE_PROPOSAL_CREATED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
PHASE_5_2L_P0_CLOSURE_COMPLETED
READY_FOR_CANONICAL_UX
CANONICAL_UX_PENDING
```

## Các quyết định mới

- PBAC thay RBAC làm nguồn quyết định quyền truy cập.
- Structured attestation bị loại khỏi MVP.
- Compliance certification, formal legal opinion, direct regulator submission và manual evidence JSON bị loại khỏi product direction.
- `FR-050` không còn là upload Local/CI report; thay bằng Automatic Trusted Scan Initiation.
- Tất cả asynchronous domain workloads chuyển sang Python Worker Platform.
- Node.js chỉ còn cho NestJS/Web và bounded TS/JS analyzer CLI.
- Scanner bổ sung Syft, Knip, deptry, Semgrep custom rules và tree-sitter/custom parser bên cạnh `ast`, `libcst` và `ts-morph`.

## Phần đã được propagate rộng

- system context và architecture target;
- canonical FR/NFR direction;
- automatic trigger states, commands và events;
- Python worker ownership trong code maps và queue docs;
- scanner toolchain trong scanner specs/implementation;
- delivery plan và readiness report;
- phần lớn tài liệu tóm lược tiếng Việt.

## Phần đã closure trước UX

- Sprint Change Proposal đã ghi approval cho documentation/planning remediation only.
- `validation-plan.md` đã đổi A3 thành PBAC and trusted-trigger abuse risk; structured attestation chỉ còn marker `SUPERSEDED_FOR_ACTIVE_MVP`.
- Business rules đã chuyển active role semantics sang PBAC subject/policy semantics và đưa attestation vào superseded register.
- Requirements baseline đã tách `UC-M09-05` khỏi active coverage và cập nhật AC-9/11/12 theo PBAC/trigger/evidence.
- Readiness/index/traceability docs đã dùng `READY_FOR_CANONICAL_UX` và vẫn giữ `CANONICAL_UX_PENDING`.

## Phần carry forward trước stories/readiness

- Chưa có dedicated Phase 5.2L ADRs cho PBAC, automatic trigger, Python Worker Platform và expanded scanner toolchain.
- PBAC engine/topology, trigger retry/DLQ/idempotency và tool failure severity vẫn là technical decisions mở.

## Kiến trúc mục tiêu

```text
NestJS API = synchronous control plane
Web = product UI
Python Worker Platform = all asynchronous domain workloads
Node.js CLI = bounded TS/JS analyzer adapter
```

Python Worker Platform gồm nhiều consumer/module độc lập cho trigger resolution, scan, profile, AIUsageFlow, reconciliation, legal pipeline, classification, gap analysis, document và async export.

## Scanner toolchain mục tiêu

```text
snapshot
-> Syft SBOM/dependency inventory
-> Knip và deptry dependency usage
-> ast/libcst và ts-morph semantic analysis
-> tree-sitter/custom parser augmentation
-> Semgrep custom AI rules
-> graph/evidence fusion
-> TechnicalEvidenceReport gates
```

## Bước closure trước UX

```text
Project Owner approval
-> sửa P0 cross-document contradictions
-> cập nhật ADR/traceability/readiness markers
-> validation pass không còn active residue
-> READY_FOR_CANONICAL_UX
-> bmad-ux
```

Chi tiết finding nằm trong `12-review-truoc-ux-phase-5-2l.md`.
