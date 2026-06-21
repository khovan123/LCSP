# Phase 1 Architecture Summary

## Source Alignment Changes

Phase 1 bắt đầu bằng việc đồng bộ các source documents với canonical implementation contract và Phase 0 checkpoint review.

| Source File | Alignment Applied | Result |
| --- | --- | --- |
| `docs/product/prd.md` | Chuẩn hóa conflict flow MVP thành Manager conflict-resolution task; thay wording legacy yêu cầu Developer confirmation. | Manager là final resolver; Developer chỉ optional technical clarification/post-MVP. |
| `docs/product/prd.md` | Chuẩn hóa state liên quan technical evidence thành repository scan-driven evidence path. | Developer assignment không còn là điều kiện để connect repository, run scan, unlock classification hoặc build VerifiedProfile. |
| `docs/architecture/architecture.md` | Cập nhật main workflow thành Manager-owned flow: repository connection, Repository Scan, AIUsageFlow, reconciliation, Manager conflict resolution, VerifiedProfile, Legal RAG, classification. | MVP success path có thể hoàn tất chỉ với Manager. |
| `docs/architecture/architecture.md` | Cập nhật Human Attestation và state model để loại dual-confirmation bắt buộc khỏi MVP. | Developer clarification được ghi là optional/post-MVP. |
| `docs/architecture/architecture-decision-records.md` | Cập nhật ADR-011, ADR-012 và thêm ADR-013. | OAuth/OIDC là MVP; Manager là super-role; post-MVP delegation không giảm quyền Manager. |

## ADR Changes

| ADR | Change |
| --- | --- |
| ADR-011 — OAuth/OIDC Login as an Active MVP Authentication Capability | Xác nhận OAuth/OIDC Login là active MVP scope, tách khỏi Enterprise SSO/SAML/SCIM và tách khỏi GitHub App repository connection. |
| ADR-012 — Manager as the MVP Super-Role and Final Conflict Resolver | Xác nhận Manager có toàn bộ active MVP permissions, có thể hoàn tất assessment end-to-end, và là final resolver cho mọi MVP conflict. |
| ADR-013 — Post-MVP Scoped Developer Permission Delegation | Thêm quyết định delegation post-MVP: Manager có thể delegate scoped technical permissions, nhưng delegation không làm giảm quyền Manager và không trao final authority mặc định cho Developer. |

## Architecture Decisions

| Decision Area | Phase 1 Decision |
| --- | --- |
| Authentication | Password Login và OAuth/OIDC Login là MVP authentication capabilities; TOTP MFA vẫn là lớp xác thực bổ sung theo LCSP policy. |
| OAuth/GitHub boundary | OAuth/OIDC xác thực user identity; GitHub App cấp read-only repository access để scan; hai boundary không thay thế nhau. |
| Role model | Manager là MVP super-role và có thể hoàn tất toàn bộ workflow mà không cần Developer assignment. |
| Developer model | Developer là optional collaborator trong MVP; scoped permission delegation là post-MVP. |
| Evidence path | GitHub Repository Scan là active MVP technical evidence path duy nhất. Manual/Local CI/CLI/CI-CD/API probing là Future/Enterprise. |
| Orchestration | API enqueue jobs; Python Worker chạy LangGraph Orchestrator; Orchestrator gọi bounded nodes theo state graph. |
| AIUsageFlow | AI Usage Flow Analysis nằm sau TechnicalProfile và trước Reconciliation/Legal Rule Matching. |
| Risk classification | Risk Classification yêu cầu VerifiedProfile và legal rule/citation trace; provider/model/framework presence không đủ để tạo risk level. |
| Conflict handling | MVP routing là binary: có conflict thì pause và tạo Manager task; không conflict thì build VerifiedProfile. |
| Privacy | Raw source code, full system prompt và secrets không được đưa vào LLM hoặc audit logs. |

## Implementation Documents Created

| Document | Purpose |
| --- | --- |
| `docs/implementation/implementation-scope-and-invariants.md` | Ghi scope, non-goals và implementation invariants không được phá vỡ. |
| `docs/implementation/repository-and-module-layout.md` | Mô tả logical module layout, service boundaries và data ownership ở mức implementation design. |
| `docs/implementation/system-runtime-and-component-contracts.md` | Mô tả runtime architecture, component contracts, workflow path, failure/security boundaries. |

## Open Decisions

| Decision | Status / Dependency |
| --- | --- |
| OAuth/OIDC provider cụ thể | Configuration decision trước release; OAuth/OIDC capability đã là MVP. |
| Queue technology cuối cùng | Tạm mô tả `RabbitMQ / Job Queue`; cần chốt nếu source docs chọn technology khác. |
| Object storage provider | Provider-neutral object storage contract; không chọn cloud vendor mới trong Phase 1. |
| Vector store implementation | Legal RAG / Vector Store abstraction; cần aligned với architecture source khi final. |
| AIUsageFlow confidence threshold | Phụ thuộc A2-b validation. |
| Legal rule coverage/reliability | Phụ thuộc A2 validation. |
| Wizard completeness/usability | Phụ thuộc A1 validation. |
| Human attestation/delegation abuse controls | Phụ thuộc A3 validation. |

## Consistency Check Results

| ID | Check | Result | Evidence / Notes |
| --- | --- | --- | --- |
| P1-01 | OAuth/OIDC không còn ở Deferred/Future | PASS | Phase 1 docs ghi OAuth/OIDC là active MVP. Search hit còn lại nằm trong canonical legacy-mismatch note, không phải scope hiện hành. |
| P1-02 | Enterprise SSO vẫn được tách riêng ở Future/Enterprise | PASS | Future scope liệt kê Enterprise SSO, SAML, SCIM, directory federation và domain-restricted login riêng. |
| P1-03 | OAuth/OIDC không bị nhầm với GitHub App | PASS | `implementation-scope-and-invariants.md` và `system-runtime-and-component-contracts.md` tách identity login khỏi repository access. |
| P1-04 | Manager có thể run scan mà không cần Developer | PASS | MVP workflow và runtime contract ghi Manager connects GitHub Repository và runs Repository Scan. |
| P1-05 | Manager có thể giải quyết conflict mà không cần Developer | PASS | PRD/Architecture/ADR/Phase 1 docs đều ghi Manager final resolver; Developer optional clarification. |
| P1-06 | Developer không còn xuất hiện là mandatory MVP actor | PASS | Developer Workspace được mô tả là optional collaborator; no MVP transition requires Developer assignment. |
| P1-07 | Post-MVP delegation không giảm quyền Manager | PASS | ADR-013 và implementation invariants ghi delegation never removes Manager permissions. |
| P1-08 | Manual/local/CI/API probing không ở main MVP flow | PASS | Các path này chỉ xuất hiện trong Future/Enterprise scope hoặc non-goals. |
| P1-09 | AIUsageFlow đúng vị trí pipeline | PASS | Pipeline Phase 1: TechnicalProfile -> AI Usage Flow Analysis -> Reconciliation -> VerifiedProfile -> Legal RAG. |
| P1-10 | Provider/model detection không tự tạo risk | PASS | Invariant ghi provider/model/framework detection alone cannot determine legal risk. |
| P1-11 | VerifiedProfile là prerequisite của classification | PASS | VerifiedProfile-before-classification invariant và runtime workflow đều ghi rõ. |
| P1-12 | Unresolved conflict, evidence insufficient, usage unclear, citation missing khóa output phù hợp | PASS | Failure boundary và invariants mô tả classification/report locked, block hoặc degrade đúng policy. |
| P1-13 | LLM/source/privacy boundary có mặt trong implementation architecture | PASS | Raw source/full prompt/secrets không vào LLM, DB long-term, object storage long-term hoặc audit logs. |
| P1-14 | Không tạo code/backlog/story/sprint | PASS | Phase 1 chỉ tạo/cập nhật tài liệu architecture/spec; không có artifact backlog/story/sprint/code. |
| P1-15 | Readiness status không đổi | PASS | Readiness status vẫn giữ `PRODUCT_READY_FOR_VALIDATION`, `READY_FOR_ARCHITECTURE_REVIEW`, `VALIDATION_READY`, `IMPLEMENTATION_BACKLOG_BLOCKED`, `IMPLEMENTATION_NOT_READY`. |

## Checkpoint Preview

### Orientation

> **Intent:** Phase 1 đồng bộ source documents với canonical implementation contract, sau đó tạo architecture implementation guidance đầu tiên cho LCSP mà không tạo code, backlog hoặc readiness change.

Scope review: source alignment trong PRD/Architecture/ADR và ba tài liệu implementation architecture Phase 1.

### Walkthrough

#### Canonical Source Alignment

Phase 1 sửa các legacy assumptions có thể làm lệch implementation docs: OAuth/OIDC bị gộp với Future SSO, Developer bị hiểu là bắt buộc, và conflict bị route theo dual confirmation.

- `docs/product/prd.md` — normalized state/conflict wording.
- `docs/architecture/architecture.md` — Manager-owned MVP runtime flow.
- `docs/architecture/architecture-decision-records.md` — ADR-011/012 updates and ADR-013 addition.

#### Implementation Scope and Invariants

Tài liệu scope đặt các invariant mà Phase 2 không được phá vỡ, đặc biệt là Manager super-role, repository scan-only evidence, AIUsageFlow placement và LLM privacy boundary.

- `docs/implementation/implementation-scope-and-invariants.md` — branch scope, non-goals and invariant list.

#### Runtime and Component Boundaries

Runtime architecture tách Web, API, Queue, Worker, Orchestrator, Scanner, RAG, LLM Gateway, Object Storage và Audit Logger để làm rõ sync/async boundaries và security boundaries.

- `docs/implementation/repository-and-module-layout.md` — logical module ownership and service boundaries.
- `docs/implementation/system-runtime-and-component-contracts.md` — runtime graph, component contracts, workflow contract.

### Detail Pass

| Risk Spot | Review Note |
| --- | --- |
| Auth boundary | OAuth/OIDC Login và GitHub App Connection đã được tách rõ; cần giữ invariant này trong Phase 2 API/auth docs. |
| Role/permission model | Manager super-role được áp dụng nhất quán ở Phase 1; Developer delegation phải tiếp tục là post-MVP và scoped. |
| Evidence pipeline | Main flow chỉ còn Repository Scan; manual/local/CI/API probing chỉ nằm ở Future/Enterprise. |
| AIUsageFlow | Placement đúng, nhưng threshold/confidence vẫn phụ thuộc A2-b; Phase 2 không được biến uncertainty thành final classification. |
| Privacy boundary | Raw source/full prompt/secrets không vào LLM/audit; Phase 2 phải cụ thể hóa lifecycle cleanup và redaction. |

### Testing / Review Evidence

Phase 1 không tạo code nên không có automated runtime tests. Các kiểm tra đã thực hiện:

- grep consistency cho OAuth/OIDC Deferred/Future wording.
- grep consistency cho Developer mandatory/dual-confirmation legacy wording.
- grep consistency cho manual/local/CI/API probing trong MVP main flow.
- grep consistency cho AIUsageFlow placement, VerifiedProfile prerequisite, citation/privacy/audit invariants.
- `git diff --check` trên các file Phase 1/source-alignment, không phát hiện whitespace error.

## Required Phase 2 Inputs

Phase 2 có thể dùng các input sau:

- `docs/specs/implementation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/legal-rule-citation-contract.md`

## Phase 1 Decision

PHASE_1_CHECKPOINT_READY

Phase 1 architecture/design outputs are ready for checkpoint review. Phase 2 must not start until this checkpoint is accepted.

Current readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
