# LCSP - Conditional Implementation Documentation Branch

## Purpose

Branch này định nghĩa một workflow tài liệu có điều kiện cho LCSP. Mục tiêu là tạo bộ tài liệu implementation-ready ở mức technical design, implementation contract, architecture guidance và QA design mà không chuyển sang implementation planning.

Branch này không tạo code, epics, stories, sprint, sprint backlog hoặc implementation backlog. Readiness status không được thay đổi.

## Invocation Confirmation from Current BMAD Installation

Đã kiểm tra `_bmad/_config/bmad-help.csv` bằng `bmad-help` trước khi tạo branch. Các invocation hợp lệ trong BMAD installation hiện tại:

| Menu Code | Display Name | Skill | Action / Context | Notes |
| --- | --- | --- | --- | --- |
| BW | Build a Workflow | `bmad-workflow-builder` | `build-process` | Tạo/edit/rebuild workflow hoặc utility skill. Args hỗ trợ `-H` hoặc mô tả inline. |
| SP | Spec | `bmad-spec` | path/input distillation | Dùng để distill intent thành canonical spec/contract. |
| CA | Create Architecture | `bmad-create-architecture` | architecture documentation | Dùng cho architecture solutioning. |
| WD | Write Document | `bmad-agent-tech-writer` | `write` | Dùng tạo technical documentation. |
| CK | Checkpoint | `bmad-checkpoint-preview` | review walkthrough | Dùng cho human review/checkpoint. |
| IR | Check Implementation Readiness | `bmad-check-implementation-readiness` | readiness check | Dùng kiểm tra readiness; trong branch này không được unblock backlog. |

Không dùng invocation syntax ngoài catalog trên.

## Operating Mode

```text
Mode: Documentation and design only
Implementation code: Forbidden
Epics/stories/sprint: Forbidden
Readiness change: Forbidden
```

## Forbidden Skills / Workflows

Không gọi các workflow sau trong branch này:

- `bmad-create-epics-and-stories`
- `bmad-create-story`
- `bmad-dev-story`
- `bmad-quick-dev`
- `bmad-story-automator`
- `bmad-sprint-planning`
- `bmad-sprint-status`
- `bmad-document-project`

Lý do: LCSP hiện là pre-implementation documentation project, chưa có implementation backlog được unblock và chưa phải brownfield codebase cần document ngược.

## Authoritative Decision Order

Khi có conflict giữa tài liệu:

```text
Authoritative decisions in this branch
-> PRD
-> ADR
-> Architecture
-> Specs
-> Detailed Design
-> QA documents
```

## Authoritative LCSP Decisions

- OAuth/OIDC Login là active MVP scope và không nằm trong Deferred/Future.
- OAuth/OIDC Login xác thực user vào LCSP; GitHub App Connection cấp read-only repository access; Repository Scan tạo `TechnicalEvidenceReport`.
- Manager là MVP super-role và có thể hoàn tất toàn bộ MVP assessment flow một mình.
- Developer là optional collaborator; không được block MVP workflow transition.
- MVP conflict do Manager xử lý; không dùng mandatory Manager + Developer dual confirmation trong MVP.
- Developer delegation là Post-MVP, scoped, revocable, audited và không bao giờ làm giảm quyền Manager.
- MVP evidence path duy nhất là Manager-owned GitHub Repository Scan.
- `AIUsageFlow` là mandatory bridge giữa `TechnicalProfile` và Reconciliation/Legal Rule Matching.
- Không phân loại risk chỉ vì model/provider/framework presence.
- Raw source code không gửi LLM, không lưu dài hạn; full system prompt không lưu mặc định; secret phải redacted.
- Classification cần `VerifiedProfile`; unresolved conflict block classification và final document; legal conclusion cần rule/citation trace.

## Branch Phase Manifest

| Phase | BMAD Skill / Agent | Purpose | Inputs | Outputs | Checkpoint | Blocked Activities |
| --- | --- | --- | --- | --- | --- | --- |
| Phase 0 - Canonical Implementation Contract | `bmad-spec`, `bmad-agent-analyst`, `bmad-agent-architect` | Chuyển authoritative decisions và docs hiện tại thành canonical implementation contract. | `LCSP_Technical_Specification.html`, project overview, product docs, ADRs, architecture, specs, design, QA, readiness docs | `docs/specs/implementation-contract.md`, branch manifest | `bmad-checkpoint-preview` review contract consistency only | Code, backlog, stories, sprint, readiness unblock |
| Phase 1 - Implementation Architecture | `bmad-create-architecture`, `bmad-agent-architect` | Tạo technical implementation architecture dựa trên contract. | Phase 0 contract, architecture docs, ADRs, specs | Updated architecture docs; `docs/implementation/system-runtime-and-component-contracts.md`, `repository-and-module-layout.md`, `implementation-scope-and-invariants.md` | `bmad-checkpoint-preview` review OAuth/GitHub separation, Manager-only MVP, AIUsageFlow placement, raw source boundary | Code, cloud vendor lock-in if not sourced, backlog, stories |
| Phase 1B.1 - Canonical Scanner Specification | `bmad-spec`, `bmad-agent-architect` | Chốt canonical static-analysis scanner contract, AI signal extraction, graph/data-flow model and AIUsageFlow claim evidence contract. | Phase 0/1 docs, scanner taxonomy, evidence contract, AIUsageFlow specs, security docs, QA docs | `docs/specs/static-analysis-scanner-contract.md`, updated specs/QA/traceability, `docs/workflows/phase-1b-scanner-spec-amendment-report.md` | `bmad-checkpoint-preview` review static-only scanner boundary before architecture alignment | Code, scanner implementation, test source code, backlog, stories, sprint, Phase 2 docs |
| Phase 1B.2 - Scanner Architecture Alignment | `bmad-create-architecture`, `bmad-agent-architect` | Align architecture/implementation contracts with scanner subsystem, analyzer boundaries, graph persistence and scanner-to-AIUsageFlow sequence. | Phase 1B.1 scanner contract and Checkpoint A pass | Updated architecture docs and existing Phase 1 implementation architecture docs only; `docs/workflows/phase-1b-scanner-architecture-alignment-report.md` | `bmad-checkpoint-preview` review scanner architecture before returning to Phase 1 checkpoint | Code, new implementation pack files, backlog, stories, sprint, Phase 2 docs |
| Phase 2 - Technical Implementation Documentation Pack | `bmad-agent-tech-writer` | Tạo docs triển khai từng component ở mức implementation contract. | Phase 0/1 docs, specs, design docs | `docs/implementation/*` component documentation pack | `bmad-checkpoint-preview` review no code/no backlog/no manual evidence MVP/no provider-only risk | Code, controller/schema/source generation, story/task creation |
| Phase 3 - Test Architecture and Quality Documentation | `bmad-tea`, `bmad-testarch-test-design`, `bmad-testarch-nfr`, `bmad-testarch-trace` | Tạo test/quality design tương ứng implementation docs. | Phase 0-2 docs, QA docs, traceability matrix | `docs/implementation/testing-implementation.md`, updated QA docs and traceability matrix | `bmad-checkpoint-preview` review coverage and quality risks | Playwright/Cypress/project scaffold, test source code, CI YAML |
| Phase 4 - Developer Context and Documentation Curation | `bmad-generate-project-context`, `bmad-index-docs`, `bmad-shard-doc`, `bmad-agent-tech-writer` | Tạo future developer context và docs navigation map. | Phase 0-3 docs | `docs/project-context.md`, `docs/README.md`, updated `docs/implementation/README.md` | `bmad-checkpoint-preview` review reading order and index completeness | Code, backlog, arbitrary sharding |
| Phase 5 - Adversarial Review and Readiness Check | `bmad-review-adversarial-general`, `bmad-check-implementation-readiness` | Review consistency toàn bộ documentation branch. | All branch outputs and source docs | `docs/implementation/implementation-documentation-review.md`, updated `docs/implementation-readiness.md` | Final documentation-only readiness review | Backlog unblock, implementation-ready status change, story/sprint/code |

## Phase 0 Execution Status

| Item | Status |
| --- | --- |
| `bmad-help` invocation check | Completed |
| Branch manifest | Completed |
| Canonical implementation contract | Completed |
| Checkpoint preview | Pending immediately after Phase 0 |
| Phase 1 | Blocked until checkpoint review completes |

## Phase 1B Amendment Order

Phase 1B is a mandatory architecture amendment before any resumed Phase 1 architecture checkpoint after this update.

Required order:

```text
Phase 1B.1 - bmad-spec
-> Phase 1B Checkpoint A - bmad-checkpoint-preview
-> Phase 1B.2 - bmad-create-architecture
-> Phase 1B Checkpoint B - bmad-checkpoint-preview
-> return to Phase 1 Architecture Checkpoint Review
```

Phase 1B.1 creates the canonical scanner specification and updates specs/QA/traceability only. Phase 1B.2 must not run until Checkpoint A passes.

Phase 1B does not permit code, backlog, epic, story, sprint, test source code, Phase 2 technical documentation pack or readiness status change.

## Phase 0 Checkpoint Scope

`bmad-checkpoint-preview` cho Phase 0 chỉ được review:

- Contract có nhất quán với authoritative decisions không.
- OAuth/OIDC có tách khỏi GitHub App không.
- Manager có còn bị phụ thuộc Developer trong MVP không.
- Conflict flow có còn dual confirmation trong MVP không.
- MVP evidence path có còn manual/local/submit evidence trong main flow không.
- AIUsageFlow có nằm sau TechnicalProfile và trước Reconciliation không.
- Security invariants có đủ không.
- Contract có tạo backlog/story/code hoặc đổi readiness không.

Checkpoint không được tạo story, backlog, sprint hoặc code.

## Final Status Constraint

Trong toàn bộ branch, status phải giữ nguyên:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
