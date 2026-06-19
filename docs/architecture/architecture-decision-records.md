# LCSP Architecture Decision Records

## Purpose

Tài liệu này ghi lại các Architecture Decision Records ở mức **conditional ADR** cho LCSP. Mục tiêu là khóa tạm thời các hướng kiến trúc đủ cơ sở từ Architecture Exploration, đồng thời chỉ rõ quyết định nào phụ thuộc validation A1-A3 và quyết định nào chưa được phép khóa.

Đây không phải final architecture document. Tài liệu này không tạo implementation backlog, không viết code, không finalize database schema chi tiết và không finalize infrastructure deployment.

## Input Documents

- `docs/architecture/architecture-exploration.md`
- `docs/product/prd.md`
- `docs/product/validation-plan.md`
- `docs/product/product-brief.md`
- `LCSP_Technical_Specification.html`

## ADR Status Legend

- **Accepted for MVP:** đủ chắc để dùng làm constraint MVP, trừ khi PRD thay đổi.
- **Conditionally Accepted:** hướng ưu tiên hiện tại, nhưng phụ thuộc validation hoặc review trước final architecture.
- **Needs Validation:** quyết định có giá trị nhưng chưa đủ an toàn để khóa nếu chưa validate.
- **Deferred:** chưa quyết định; không được dùng làm cơ sở implementation backlog.

## Summary of Architecture Direction

Architecture Exploration đề xuất hướng:

```text
Option A - Monolith-first modular backend + separate Python scanner/agent worker
```

Đây là **Recommended conditional architecture direction**, không phải final architecture tuyệt đối.

Lý do:

- Phù hợp MVP.
- Dễ demo end-to-end.
- Giảm premature service boundaries.
- Phù hợp technical specification hiện tại.
- Multi-agent workflow được kiểm soát bởi Orchestrator trong Python worker, không dùng free-form autonomous agents.
- Vẫn giữ đường nâng cấp sang service-oriented architecture sau này.
- Tránh khóa thiết kế quá sớm khi A1-A3 còn cần validate.

## ADR-001 - Monolith-first modular backend for MVP

**Status:** Conditionally Accepted

### Context

LCSP cần triển khai MVP với nhiều capability: Manager Workspace, Developer Workspace, assessment lifecycle, evidence gates, reconciliation, scoring, audit, document coordination và worker jobs. Architecture Exploration so sánh Option A monolith-first modular backend với Option B service-oriented MVP.

### Decision

LCSP MVP ưu tiên **monolith-first modular backend** thay vì full service-oriented/microservices từ đầu.

Backend chính nên được tổ chức theo module domain rõ ràng: Assessment, Wizard, Developer Task, Evidence, Evidence Gate, Reconciliation, Scoring, VerifiedProfile, Classification coordination, Document coordination và Audit.

### Rationale

- Giảm coordination overhead cho MVP.
- Dễ demo end-to-end hơn.
- Phù hợp technical specification hiện tại.
- Tránh premature service boundaries khi A1-A3 có thể làm thay đổi WizardProfile, rule/citation và attestation contracts.
- Dễ quản lý assessment state, permission, audit và reconciliation trong một transaction boundary tương đối gần nhau.
- Vẫn cho phép extract module thành service sau khi contracts ổn định.

### Alternatives Considered

- **Service-oriented MVP:** Web/API service, Scanner service, Agent orchestration service, Document service, RAG service, Audit service.
- **Fully integrated single runtime:** không chọn vì scanner/agent workloads khác web request lifecycle và cần Python ecosystem.

### Consequences

- Cần discipline mạnh để giữ module boundaries.
- Backend có nguy cơ phình nếu domain boundaries không rõ.
- Scaling từng module riêng chưa tối ưu ở MVP.
- Phải thiết kế modules như extraction candidates.

### Validation Dependency

- **A1:** WizardProfile field model có thể thay đổi; Wizard module và Reconciliation module phải chịu được thay đổi field/mapping.
- **A2:** Legal rule/citation contract có thể thay đổi; Classification coordination không được hard-code rule schema chưa validate.
- **A3:** Attestation policy có thể thay đổi; Evidence/Reconciliation modules phải policy-gated.

### Revisit Trigger

- A1-A3 thay đổi contract cốt lõi.
- Module coupling khiến audit/reconciliation khó test hoặc khó trace.
- MVP cần enterprise isolation sớm hơn dự kiến.
- Scanner/RAG/document workloads cần scale độc lập trước MVP.

## ADR-002 - Separate Python worker for scanner and agent workloads

**Status:** Conditionally Accepted

### Context

Technical specification hiện tại dùng NestJS API cho orchestration và Python LangGraph worker cho scanner + multi-agent pipeline. Scanner, RAG, classification/gap/document agent calls và evidence normalization có workload khác web request lifecycle.

### Decision

Scanner, evidence normalization và agent pipeline nên chạy trong **Python worker/service tách khỏi NestJS API runtime**.

### Rationale

- Scanner/AI workload khác web request lifecycle.
- Dễ queue job, retry, back-pressure và progress tracking.
- Dễ cô lập source handling.
- Dễ scale riêng sau này.
- Giảm rủi ro raw source đi vào web backend.
- Phù hợp Python ecosystem cho LangGraph, scanner integration, RAG tooling và document processing.

### Alternatives Considered

- Chạy scanner/agent trực tiếp trong NestJS backend.
- Tách thành nhiều service riêng ngay từ MVP: scanner service, agent orchestration service, RAG service, document service.

### Consequences

- Cần job boundary rõ giữa API và worker.
- Cần idempotency/retry semantics cho scan/agent jobs.
- Cần audit event contract giữa worker và backend.
- Cần kiểm soát dữ liệu nào được truyền qua queue để tránh raw source leakage.

### Validation Dependency

- **A2:** rule/citation contract ảnh hưởng Classification Agent inputs/outputs.
- **A3:** nếu attestation unlock path thay đổi, worker orchestration có thể cần thay đổi gate trước classification.

### Revisit Trigger

- Worker cần split thành scanner worker và agent worker riêng.
- Queue throughput hoặc isolation không đủ.
- Security review yêu cầu scanner chạy trong môi trường tách biệt hơn.

## ADR-003 - Manager-led workflow with optional Developer participation

**Status:** Accepted for MVP

### Context

PRD xác định MVP chỉ expose 2 role: Manager và Developer. Updated canonical contract makes Manager the required and sufficient MVP actor. Developer is optional and may provide technical clarification only when scoped/delegated, without blocking MVP workflow transitions.

### Decision

Architecture phải support **Manager-owned assessment** và **optional Developer participation**. Manager can complete repository connection, Repository Scan, conflict resolution, VerifiedProfile approval, classification and document generation without Developer assignment.

### Rationale

- Giữ UX đơn giản cho MVP.
- Tránh full enterprise IAM/parallel collaboration quá sớm.
- Phù hợp product decision: Manager-owned MVP workflow.
- Bảo vệ ranh giới final compliance authority: Manager remains final resolver; Developer input is optional clarification.

### Alternatives Considered

- Sequential handoff cứng: Manager xong hết rồi Developer làm rồi Manager quay lại.
- Full parallel collaboration với nhiều role, field locking và concurrent edits.
- Multi-role enterprise IAM từ MVP.

### Consequences

- RBAC/permission phải hỗ trợ 2 role.
- Developer không có Manager permissions.
- Developer chỉ thấy optional delegated tasks và limited context when delegation exists.
- Manager xem progress tổng.
- Audit phải ghi Manager actions, optional delegation, delegated task actions and revocation.
- No MVP workflow transition may require Developer assignment.

### Validation Dependency

- Không phụ thuộc mạnh vào A1-A3 để giữ nguyên direction, nhưng A1 có thể ảnh hưởng task routing nếu Wizard field model thay đổi.

### Revisit Trigger

- User testing cho thấy Developer cần chủ động hơn trong post-MVP delegated assessment collaboration.
- Compliance review yêu cầu thêm reviewer/approver role riêng.
- Enterprise buyer yêu cầu admin/IAM role trong MVP.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/workflows/phase-0-checkpoint-rerun-report.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/specs/reconciliation-policy.md`
- `docs/design/traceability-matrix.md`

## ADR-004 - Evidence-first classification gate

**Status:** Accepted for MVP

### Context

PRD cấm Wizard-only risk level. Risk Classification Agent chỉ chạy khi WizardProfile submitted, Technical Evidence received, schema completeness gate passed, quality threshold gate passed, reconciliation tạo VerifiedProfile và không còn unresolved conflict.

### Decision

Architecture phải enforce **evidence-first classification gate**.

### Rationale

- Bảo vệ định vị evidence-based compliance platform.
- Ngăn self-report trở thành classification.
- Đảm bảo Reconciliation và VerifiedProfile là upstream dependency bắt buộc.
- Giảm overclaim và false certainty.

### Alternatives Considered

- Cho Wizard-only tạo draft risk level.
- Cho classification chạy song song với evidence collection.
- Cho Manager override gate để tạo final report.

### Consequences

- Classification service/agent phải bị gate bởi assessment state.
- Wizard-only không được tạo risk level.
- Evidence gate và reconciliation là upstream dependency bắt buộc.
- State transition phải enforced ở backend/module boundary, không chỉ UI.

### Validation Dependency

- **A1:** WizardProfile shape ảnh hưởng readiness và evidence threshold.
- **A2:** legal rule/citation validation ảnh hưởng final classification.
- **A3:** attestation policy ảnh hưởng evidence sufficiency path.

### Revisit Trigger

- PRD thay đổi stance về Wizard-only behavior.
- Validation cho thấy readiness UX cần thêm output mới nhưng không phải risk level.
- Legal/rule validation yêu cầu thêm blocked/degraded classification state.

## ADR-005 - Hybrid evidence collection strategy

**Status:** Conditionally Accepted

### Context

Product Brief và PRD ban đầu chọn Hybrid Evidence Strategy: GitHub App read-only là default MVP path; Local/CI scanner hoặc manual evidence upload là enterprise-safe alternative. Sau scope simplification, MVP active path được thu hẹp trong ADR-010: GitHub Repository Scan là technical evidence path duy nhất của MVP.

### Decision

Architecture phải support **GitHub Repository Scan** như active MVP evidence path. Local/CI scanner report upload và manual technical evidence JSON được giữ như Deferred/Future/Enterprise paths và nếu được kích hoạt sau này vẫn phải normalize về một **Evidence Report Contract** thống nhất.

### Rationale

- GitHub Repository Scan đủ cho MVP demo/user flow và giảm UX/API/state complexity.
- Local/CI path phục vụ source privacy/enterprise nhưng chưa cần trong MVP main flow.
- Manual evidence upload có abuse risk cao và phụ thuộc A3; không thuộc MVP main flow.
- Reconciliation và gates vẫn nên phụ thuộc contract chuẩn để giữ migration path.

### Alternatives Considered

- GitHub App-only active MVP path.
- Local/CI-only.
- Fully pluggable evidence marketplace từ MVP.

### Consequences

- MVP cần adapter cho GitHub Repository Scan trước.
- Cần unified evidence report contract.
- Cần provenance và source_type rõ.
- Cần policy để phân biệt evidence rejected/insufficient/ready.

### Validation Dependency

- **A1:** Wizard context ảnh hưởng quality threshold.
- **A3:** manual/human evidence path có thể bị siết để tránh bypass.

### Revisit Trigger

- GitHub App read-only không được target users chấp nhận.
- Manual evidence upload tạo nhiều abuse/risk hơn value.
- Enterprise requirement đòi Local/CI path thành default.

## ADR-006 - No raw source to LLM and no long-term raw source storage

**Status:** Accepted for MVP

### Context

LCSP scanner cần đọc repository để tạo evidence. Product constraints bắt buộc không gửi raw source code cho LLM và không lưu raw source code dài hạn.

### Decision

Raw source code không được gửi cho LLM và không được lưu dài hạn. Scanner chỉ xuất technical evidence summary, findings, confidence, provenance và report hash.

### Rationale

- Giảm rủi ro bảo mật/source leakage.
- Tăng khả năng chấp nhận GitHub App read-only.
- Giữ boundary rõ giữa scanner và agent/RAG.
- Phù hợp least privilege và selected repositories.

### Alternatives Considered

- Gửi raw source hoặc snippets dài vào LLM để phân tích.
- Lưu full repo snapshot để audit.
- Lưu full AST lâu dài.

### Consequences

- Scanner phải tạo normalized evidence đủ giàu.
- Findings không chứa raw code dài.
- Temporary workspace phải bị xóa.
- Audit chỉ lưu metadata/evidence refs/report hash.
- Agent/RAG chỉ nhận normalized evidence.
- Dynamic/runtime logic có thể cần API probe/manual evidence/attestation.

### Validation Dependency

- Không phụ thuộc A1-A3 để giữ nguyên rule. A3 chỉ ảnh hưởng cách bổ sung evidence khi scanner thiếu.

### Revisit Trigger

- Security review yêu cầu stricter no-snippet policy.
- Legal/audit review yêu cầu stronger evidence retention nhưng vẫn không lưu raw source.
- Enterprise/on-prem mode cho phép scanner chạy trong customer environment.

## ADR-007 - Binary Conflict Routing with Scores as Supporting Signals

**Status:** Accepted for MVP

### Context

PRD định nghĩa nhiều score. Earlier docs treated Conflict Score as the only blocking score. Updated MVP scope simplifies conflict routing to a binary decision: conflict exists or no conflict. Scores may remain supporting/explanatory signals but must not create multiple workflow routes.

### Decision

Workflow engine blocks classification and final output when any unresolved conflict exists.

```text
if conflict_exists:
    route = CONFLICT_RESOLUTION_REQUIRED
else:
    route = VERIFIED_PROFILE_READY
```

Evidence Confidence Score, AI Intervention Score and optional Conflict Score are supporting signals only in MVP. They do not create warning/material/critical routing branches.

### Rationale

- Evidence mạnh không tự động là legal conclusion.
- AI intervention cao không tự động là violation.
- Mâu thuẫn giữa WizardProfile và TechnicalProfile mới là lý do cần block workflow.
- Giữ MVP workflow dễ hiểu và dễ audit.

### Alternatives Considered

- Cho Evidence Confidence Score block workflow.
- Cho AI Intervention Score block workflow.
- Dùng một composite score duy nhất.

### Consequences

- Score service/module phải tách 3 score.
- Workflow engine dùng binary unresolved conflict state để block.
- Evidence Confidence ảnh hưởng Manager review và optional delegated technical clarification.
- AI Intervention là input cho risk classification sau VerifiedProfile.
- Conflict records có thể lưu score/severity như informational metadata, nhưng routing vẫn binary.

### Validation Dependency

- **A1:** Wizard field model ảnh hưởng conflict calculation.
- **A3:** attestation policy ảnh hưởng conflict resolution, không thay đổi nguyên tắc score.

### Revisit Trigger

- Evaluation cho thấy binary conflict routing cần thêm governance detail.
- Product thay đổi binary conflict routing hoặc conflict resolution policy.
- Legal review yêu cầu hard-block theo một field bất kể score.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/scoring-model.md`
- `docs/specs/state-machine.md`
- `docs/implementation/implementation-scope-and-invariants.md`

## ADR-008 - Controlled human technical attestation

**Status:** Needs Validation

### Context

Human technical attestation giúp bổ sung evidence khi scanner không bắt được dynamic/wrapper/runtime logic. Nhưng A3 xác định risk lớn: attestation có thể bị dùng để hợp thức hóa evidence yếu hoặc bypass scanner.

### Decision

Human attestation là **controlled evidence supplement**, không phải bypass mechanism.

### Rationale

- Cần escape path khi scanner evidence insufficient nhưng Developer có technical truth hợp lệ.
- Vẫn giữ evidence-based stance bằng schema, role-bound claim và audit.
- Cho phép xử lý thực tế source/static analysis không hoàn hảo.

### Alternatives Considered

- Không cho attestation unlock classification.
- Cho attestation như free-text comment.
- Cho Manager override technical evidence.

### Consequences

- Attestation phải có schema.
- Claim phải role-bound.
- Classification-relevant claim cần Manager final review trong MVP.
- Không thay thế machine-generated metadata.
- Report/audit phải ghi rõ khi attestation được dùng.
- Attestation policy phải nằm trong evidence/reconciliation gate, không hard-code bypass trong classification.

### Validation Dependency

- **A3:** quyết định này chưa được khóa cho final architecture. Nếu A3 fail, attestation unlock path phải bị siết hoặc loại khỏi MVP.

### Revisit Trigger

- Abuse-case testing fail.
- Compliance reviewer không chấp nhận attestation unlock.
- Product quyết định chỉ cho attestation tạo review task, không unlock classification.
- Audit/report disclosure không đủ rõ.

## ADR-009 - Use Orchestrator-Controlled Multi-Agent Workflow for LCSP

**Status:** Conditionally Accepted

### Context

LCSP cần phối hợp nhiều capability chuyên biệt: scanner/evidence normalization, evidence gates, reconciliation, scoring, legal retrieval/RAG, risk classification, gap analysis, document generation và audit. Các bước này có thứ tự phụ thuộc rõ ràng và có nhiều gate bắt buộc: không technical evidence thì không có risk level, Risk Classification chỉ chạy sau VerifiedProfile, legal conclusion phải có citation, và unresolved conflict cần human-in-the-loop.

Tài liệu `docs/architecture/multi-agent-system-architecture.md` so sánh pattern từ OpenAI Agents SDK Multi-Agent Systems và Microsoft Azure AI Agent Design Patterns. Cả hai nguồn đều cho thấy có trade-off giữa orchestration bằng LLM/free handoff và orchestration bằng code/state. Với LCSP, compliance-critical flow cần deterministic routing, schema validation, audit và fail-closed behavior.

### Decision

LCSP dùng **Orchestrator-controlled, state-machine-driven multi-agent workflow** cho MVP architecture.

Diễn giải implementation direction ở mức conditional:

```text
Python Worker + LangGraph StateGraph workflow
```

Orchestrator gọi các agent/node như bounded subtasks, dùng RAG-grounded legal reasoning, deterministic gates, output guardrails và human-in-the-loop conflict resolution. LCSP không dùng free-form autonomous agents hoặc unrestricted handoffs trong compliance-critical path.

### Rationale

- Evidence-first classification cần gate ordering do code/state kiểm soát.
- Risk Classification Agent không được tự chạy trên Wizard-only hoặc tự gọi Document Generation Agent.
- Legal output cần rule_id/citation/version trace, không dựa vào LLM tự suy luận.
- Human-in-the-loop cho unresolved conflict cần pause/resume và persisted state.
- Audit every node cần input refs, output hash, status, model/version và blocking reason.
- Agents-as-tools/manager style phù hợp cho bounded subtasks; unrestricted handoff không phù hợp compliance audit.

### Alternatives Considered

- **Sequential pipeline only:** dễ hiểu nhưng không đủ cho conflict branch, human pause/resume và degraded/blocked citation behavior.
- **Single agent with tools:** đơn giản hơn nhưng khó enforce separation giữa evidence, legal RAG, classification, document và audit.
- **Free-form autonomous multi-agent collaboration:** linh hoạt nhưng rủi ro hallucination, handoff loop, legal overclaim và audit gap.
- **Full microservice agent platform:** quá sớm cho MVP và làm tăng premature service boundaries.

### Consequences

- Cần shared agent state rõ, typed input/output schema và checkpoint/retry semantics.
- Cần LLM Gateway làm boundary duy nhất cho LLM provider.
- Cần output guardrails deterministic trước khi ghi result hoặc chuyển node.
- Cần audit hooks cho mọi node start/success/failure.
- Python worker trở thành agent runtime/control plane, còn NestJS API giữ RBAC, job creation và UI-facing state.

### Validation Dependency

- **A1:** WizardProfile schema, Wizard critical fields và reconciliation input có thể thay đổi agent state và evidence quality context.
- **A2:** Legal corpus/rule reliability ảnh hưởng Legal RAG, citation contract, Risk Classification Agent và Citation Guardrail.
- **A3:** Human attestation abuse risk ảnh hưởng Human Attestation Review Node, HITL pause/resume, evidence gate và audit disclosure.

### Revisit Trigger

- A1-A3 validation làm thay đổi WizardProfile, legal citation contract hoặc attestation policy.
- Security review yêu cầu stricter LLM Gateway hoặc worker/source isolation.
- Legal review không chấp nhận degraded classification behavior.
- Orchestrator state graph trở nên quá phức tạp cho MVP hoặc cần split worker/service boundary.
- Agent output validation không đạt acceptance threshold trong evaluation.

## ADR-010 - Simplify MVP Evidence Collection to Repository Scan Only

**Status:** Conditionally Accepted

### Context

Detailed design và architecture trước đó mô tả nhiều technical evidence paths: GitHub scan, Local/CI scanner report upload, manual technical evidence JSON và generic evidence submission. Điều này làm MVP pipeline phức tạp: nhiều UI actions, nhiều API path, nhiều source_type, nhiều recovery branch và nhiều abuse surface, đặc biệt với A3 Human Attestation Abuse Risk.

### Decision

For MVP, LCSP uses **GitHub Repository Scan** as the only active technical evidence path.

Active MVP evidence flow:

```text
Manager connects GitHub Repository
-> Manager runs Repository Scan
-> Scanner creates TechnicalEvidenceReport
-> Evidence Normalization
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
```

Deferred/Future/Enterprise evidence paths:

- Upload Local/CI scanner report.
- Upload manual technical evidence JSON.
- Generic manual evidence submission.
- CLI evidence submission.
- CI/CD evidence submission.

### Rationale

- Current evidence pipeline is too complex for MVP.
- GitHub Repository Scan is enough for demo/user flow.
- Reduces UX complexity.
- Reduces API/data model complexity.
- Keeps evidence-first classification intact.
- Reduces manual evidence abuse surface before A3 validation.
- Future enterprise paths can be added later without changing downstream evidence gates if the Evidence Report Contract remains stable.

### Alternatives Considered

- Keep hybrid evidence active in MVP.
- Keep manual JSON as MVP fallback.
- Make Local/CI upload the default for enterprise privacy.
- Allow generic evidence submission action.

### Consequences

- MVP UI/API should not show manual evidence upload or Local/CI upload in main flow.
- Active MVP FR/BR/NFR should map evidence acquisition to `UC-M04-02 Connect GitHub Repository` and `UC-M04-08 Run Repository Scan`.
- `TechnicalEvidenceReport.source_type` for MVP should be `GITHUB_REPOSITORY_SCAN`.
- Local/CI/manual/CLI/CI source types remain Deferred/Future.
- If GitHub App read-only is rejected by validation/users, this ADR must be revisited before backlog.

### Security and Privacy Implications

Repository scan must use least-privilege GitHub App access, selected repository scope and temporary scanner workspace. Raw source code must not be sent to LLM, stored long-term or written into ordinary audit logs. Scanner output must persist evidence refs, hashes, metadata and redacted findings rather than raw source.

### MVP Behavior

Manager connects GitHub Repository and runs Repository Scan. Scanner creates TechnicalEvidenceReport, then Schema Gate and Quality Gate decide whether TechnicalProfile can be built. Manual, Local/CI, CLI, CI/CD and API probing evidence paths are not active MVP UI/API paths.

### Future/Post-MVP Behavior

Local/CI scanner reports, manual technical evidence JSON, CLI evidence submission, CI/CD evidence submission and API probing may be revisited for Future/Enterprise scope. If introduced, they must not bypass evidence gates, AIUsageFlow, reconciliation, legal citation or audit requirements.

### Open Questions

- Whether GitHub App read-only access satisfies target users' source privacy expectations.
- Whether Future/Enterprise Local/CI evidence requires signed report provenance.
- Whether scan sandbox technology requires additional isolation controls before implementation execution.

### Validation Dependency

- **A1:** Wizard context still determines quality threshold inputs.
- **A2:** Downstream classification still depends on legal corpus/rule reliability.
- **A3:** Deferring manual evidence reduces attestation/manual evidence abuse risk, but structured attestation policy still needs validation.

### Revisit Trigger

- GitHub App read-only path fails user/security acceptance.
- Enterprise customer requires source-private Local/CI path for MVP.
- Scanner coverage is insufficient without manual/Local-CI supplement.
- A3 validation changes how technical attestation may supplement insufficient repository scan evidence.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/specs/evidence-report-contract.md`
- `docs/design/use-case-specification.md`
- `docs/design/traceability-matrix.md`

## ADR-011 - OAuth/OIDC Login as an Active MVP Authentication Capability

**Status:** Conditionally Accepted

### Context

Previous design treated enterprise identity login broadly as future/enterprise scope. The updated product decision activates OAuth/OIDC user login for MVP while keeping GitHub App repository connection as a separate integration boundary.

### Decision

OAuth/OIDC user login is an active MVP capability. OAuth/OIDC authenticates users into LCSP and creates LCSP sessions subject to LCSP session/MFA/authorization policy.

OAuth/OIDC login does not connect GitHub repositories, does not grant repository scan permission and does not replace GitHub App repository authorization.

### Scope

MVP includes:

- OAuth/OIDC login initiation.
- OAuth/OIDC callback validation.
- Safe linked account handling.
- LCSP session creation after identity/session/MFA policy passes.
- Audit for OAuth login success/failure, linking and callback validation failure.

Enterprise SSO/SAML/directory federation, domain-restricted login, SCIM provisioning and advanced organization identity policies remain Deferred/Future.

### Consequences

- Auth docs must distinguish OAuth/OIDC login from GitHub App connection.
- API contract needs Authentication & OAuth/OIDC endpoint group.
- Threat model must include callback validation, unsafe account linking and token exposure.
- QA must verify OAuth login does not grant repository access.

### Alternatives Rejected

- Defer OAuth/OIDC Login together with enterprise identity features.
- Treat OAuth/OIDC Login as a substitute for GitHub App repository authorization.
- Let OAuth/OIDC provider identity automatically grant repository scan permission.

### Security Implications

OAuth/OIDC must use authorization code flow with PKCE for web client flow. LCSP must validate redirect URI, `state`, `nonce`, issuer, audience and token expiry. OAuth client secrets and raw provider tokens must not appear in frontend, logs or audit exports.

### MVP Behavior

User may sign in with password/email or configured OAuth/OIDC provider. If LCSP TOTP MFA is enabled for the user, LCSP MFA policy still applies.

### Post-MVP Behavior

Enterprise SSO/SAML/directory federation may be added later through explicit architecture decision and security review.

### Open Questions

- Which OAuth/OIDC provider(s) are configured for release?
- Whether provider MFA can satisfy LCSP MFA remains a future enterprise policy decision.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/design/use-case-specification.md`
- `docs/design/functional-requirements.md`
- `docs/security/threat-model.md`

## ADR-012 - Manager as the MVP Super-Role and Final Conflict Resolver

**Status:** Conditionally Accepted

### Context

Earlier docs assumed Developer was required for technical evidence and some conflict resolution. Updated MVP scope requires Manager to complete assessment end-to-end without Developer assignment.

### Decision

Manager is the required and sufficient MVP role for completing an assessment. Manager has all active MVP capabilities, including repository connection, repository scan, findings review, AIUsageFlow review, conflict resolution, VerifiedProfile approval, classification trigger, gap/report workflow and audit review.

Developer remains an optional technical collaborator. Developer receives scoped delegated permissions only when Manager assigns them. Delegation never removes Manager permissions.

### Scope

MVP conflict flow:

```text
Conflict detected
-> Orchestrator pauses workflow
-> API creates Manager conflict resolution task
-> Manager reviews WizardProfile, TechnicalProfile and AIUsageFlow evidence
-> Manager resolves or requests re-scan/correction
-> Reconciliation re-runs
-> VerifiedProfile can be built when no conflict remains
```

### Consequences

- Main MVP flow must not require Developer assignment.
- Reconciliation and state machine must use Manager resolution as resume condition.
- Developer permissions become optional delegation model.
- QA must prove Manager can complete assessment from start to document generation without Developer account.

### Alternatives Rejected

- Require Developer assignment for repository connection or repository scan.
- Require Developer confirmation to resolve technical conflicts in MVP.
- Require Manager + Developer dual confirmation for all conflicts in MVP.
- Make Developer the final technical authority for classification unlock.

### Security Implications

Manager super-role requires strict server-side authorization, clear audit events and strong authentication. Developer delegated permissions must be scoped, revocable and audited.

### MVP Behavior

No workflow may be blocked merely because Developer is absent. Any unresolved conflict blocks classification and final report, but Manager resolution is the required and sufficient human action for MVP conflict completion.

### Post-MVP Behavior

Manager may delegate selected permissions such as `CONNECT_REPOSITORY`, `RUN_REPOSITORY_SCAN`, `VIEW_TECHNICAL_FINDINGS`, `RESPOND_TO_TECHNICAL_CLARIFICATION`, `SUBMIT_TECHNICAL_ATTESTATION` and `VIEW_ASSIGNED_CONFLICT`. Developer cannot finalize conflict resolution, approve VerifiedProfile, trigger final risk classification, generate final compliance document, manage organization membership or manage organization security policy unless a future governance ADR explicitly changes this.

### Open Questions

- Which delegated permissions are exposed immediately after MVP?
- Whether future governance introduces additional roles beyond Manager/Developer.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/workflows/phase-0-checkpoint-rerun-report.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/state-machine.md`
- `docs/design/traceability-matrix.md`

## ADR-013 - Post-MVP Scoped Developer Permission Delegation

**Status:** Conditionally Accepted

### Context

MVP keeps Manager as the required and sufficient role. Developer collaboration is still useful for technical clarification and future enterprise workflows, but it must not create MVP deadlocks or reduce Manager authority.

### Decision

Post-MVP, Manager may delegate scoped technical permissions to Developer. Delegation is optional, scoped, revocable and audited. Delegation never removes Manager permissions and never gives Developer final compliance authority by default.

### Scope

Future delegated permissions may include:

```text
CONNECT_REPOSITORY
RUN_REPOSITORY_SCAN
VIEW_TECHNICAL_FINDINGS
VIEW_ASSIGNED_REPOSITORY
RESPOND_TO_TECHNICAL_CLARIFICATION
SUBMIT_TECHNICAL_ATTESTATION
VIEW_ASSIGNED_CONFLICT
```

Developer must not receive final authority by default for:

```text
FINALIZE_CONFLICT_RESOLUTION
APPROVE_VERIFIED_PROFILE
TRIGGER_FINAL_RISK_CLASSIFICATION
GENERATE_FINAL_COMPLIANCE_DOCUMENT
MANAGE_ORGANIZATION_MEMBERSHIP
```

### MVP Behavior

MVP does not require Developer delegation for assessment completion. Manager can perform repository connection, repository scan, technical finding review, conflict resolution, VerifiedProfile approval, classification trigger and document generation without Developer assignment.

### Post-MVP Behavior

Manager may grant, revoke, override or reassign delegated permissions by organization, assessment, repository, task or time period if supported. Delegated Developer clarification is input only unless a future governance ADR explicitly changes final authority.

### Security Implications

Permission grants, revocations, delegated actions and denied actions must be audited. Authorization must be enforced server-side. Revoked grants must stop new delegated actions. OAuth/OIDC identity must not grant delegation automatically.

### Consequences

- Data model and API docs may include `PermissionGrant` as future/post-MVP design.
- Developer workspace remains optional for MVP.
- QA should include design-level tests for delegation, revocation and no privilege escalation.

### Alternatives Rejected

- Give Developer broad technical permissions by default.
- Remove Manager permissions after delegation.
- Let Developer finalize conflict or approve VerifiedProfile through delegation.
- Make Developer assignment mandatory for technical evidence.

### Open Questions

- Which delegated permissions are exposed first after MVP?
- Whether delegation supports expiry in the first post-MVP release.
- Whether future governance introduces organization admin or reviewer roles.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/specs/domain-model.md`
- `docs/specs/data-model-draft.md`
- `docs/design/traceability-matrix.md`
- `docs/qa/acceptance-criteria.md`

## ADR-014 - AI Usage Flow Analysis as Mandatory Bridge Before Legal Rule Matching

**Status:** Conditionally Accepted

### Context

Repository scan can detect model providers, frameworks, prompts, vector stores and model calls, but these signals do not explain how AI is used in the business process. LCSP must not classify legal risk merely because a repository uses OpenAI, Gemini, LangChain, TensorFlow, PyTorch or a model endpoint.

### Decision

LCSP requires `AIUsageFlow` after `TechnicalProfile` and before Reconciliation, Legal Rule Matching/RAG and Risk Classification.

Canonical sequence:

```text
TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

`AIUsageFlow` must include business process, AI purpose, input/output types, downstream action, affected subjects, human review, automation level, potential harm categories, evidence refs, confidence and uncertainty reasons.

### Consequences

- Legal rule matching can use business purpose and impact, not provider/model presence alone.
- Reconciliation must compare WizardProfile against TechnicalProfile plus AIUsageFlow.
- If usage purpose is unclear, final classification remains blocked or must request traceable clarification.
- A2-b validation remains required before implementation backlog.

### Security and Privacy Implications

AI Usage Flow Analysis is rule-first. If LLM assistance is used, only sanitized metadata, redacted summaries and evidence refs may pass through LLM Gateway. Raw source, full prompts and secrets must not be sent to LLM.

### MVP Behavior

AIUsageFlow is mandatory in the MVP assessment path. It may create uncertainty/conflict, but it does not make legal conclusions by itself.

### Future/Post-MVP Behavior

Future scanner improvements may add richer call graph, data flow, dynamic prompt and runtime trace signals, but the same AIUsageFlow contract and privacy boundary remain.

### Open Questions

- Final confidence thresholds for usage-purpose certainty.
- Exact fixture corpus and acceptance thresholds for A2-b.
- Whether runtime telemetry is ever allowed as a future evidence source.

### Traceability References

- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`

## ADR-015 - LLM Gateway as the Only External Model Invocation Boundary

**Status:** Conditionally Accepted

### Context

LCSP may use LLMs for bounded reasoning, explanation and drafting, but compliance-critical workflow control, rules, schemas, citations and audit are LCSP-owned. Direct LLM calls from arbitrary modules would weaken privacy, logging, prompt versioning and output validation.

### Decision

All external model calls must go through an LLM Gateway. No Web, API, scanner, RAG, document or agent node may call an LLM provider directly.

### Consequences

- LLM provider SDK usage is isolated behind a gateway adapter.
- Gateway owns timeout, retry, token limit, model/provider/version logging, prompt versioning and schema validation.
- Deterministic rules and citation guardrails override LLM output.
- LLM provider remains replaceable.

### Security and Privacy Implications

Raw source code, full system prompt content, secrets, raw OAuth tokens and repository access tokens must not enter LLM calls. Gateway input must be sanitized and referenced by evidence ids/hashes rather than raw source.

### MVP Behavior

Risk Classification, Gap Analysis, Document Generation and optional AIUsageFlow explanation may use LLM only through the gateway and only after their prerequisites pass.

### Future/Post-MVP Behavior

Provider failover, model policy, enterprise tenant isolation and provider-specific controls require future architecture/security review.

### Open Questions

- Final LLM provider selection.
- Prompt versioning and rollback policy.
- Provider failover and cost-control policy.

### Traceability References

- `docs/architecture/multi-agent-system-architecture.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/security/source-code-privacy-policy.md`
- `docs/security/threat-model.md`

## ADR-016 - Temporary Isolated Scanner Workspace and No Raw Source Retention

**Status:** Conditionally Accepted

### Context

Repository scan is the only active MVP technical evidence path. Scanning source code creates privacy and security risks if raw source is retained, logged, sent to LLM or mixed with application persistence.

### Decision

Scanner runs in an isolated ephemeral workspace. Raw source is used only for scan execution, must not be sent to LLM, must not be stored long-term and must be cleaned up according to source privacy policy. Persisted evidence uses TechnicalEvidenceReport, evidence refs, hashes, metadata and redacted findings.

### Consequences

- Scanner output must be sufficient for evidence gates, AIUsageFlow and audit without retaining raw source.
- Object storage and PostgreSQL must not store raw repository source long-term.
- Scan failures must keep classification locked and produce audit/blocking reason.

### Security and Privacy Implications

Secrets must be redacted. Full prompt content must not be stored by default. Audit logs must store metadata, refs and hashes, not source content or secrets.

### MVP Behavior

Manager connects GitHub Repository and runs Repository Scan. Scanner creates TechnicalEvidenceReport and cleans temporary workspace.

### Future/Post-MVP Behavior

Alternative sandbox technology, enterprise local scanner and stricter source-private paths may be evaluated later without changing the no-raw-source-to-LLM invariant.

### Open Questions

- Exact scan sandbox technology.
- Cleanup verification mechanism.
- Whether certain redacted snippets can be retained under explicit policy.

### Traceability References

- `docs/security/source-code-privacy-policy.md`
- `docs/specs/evidence-report-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/implementation/system-runtime-and-component-contracts.md`

## ADR-017 - Queue-Based Orchestrator for Long-Running Compliance Workflows

**Status:** Conditionally Accepted

### Context

Repository scan, evidence normalization, AIUsageFlow, legal retrieval, classification, gap analysis and document generation are long-running or failure-prone operations that should not run inside synchronous web request handling.

### Decision

NestJS API enqueues long-running jobs. Python Worker consumes jobs and runs LangGraph Orchestrator. Orchestrator controls workflow state transitions, node routing, blocking logic, retry/fail-safe behavior, human-in-the-loop pause/resume and audit events.

### Consequences

- Web does not call Worker directly.
- API remains responsive and owns RBAC/state/job creation.
- Worker owns async workflow execution and node-level fail-closed behavior.
- Queue/job idempotency and retry contracts must be specified before implementation execution.

### Security and Privacy Implications

Queue payloads must carry refs/hashes, not raw source or secrets. Critical audit writes are required for state transitions and node completion/failure.

### MVP Behavior

Repository Scan, AIUsageFlow, classification, gap analysis and document generation are async jobs driven by Orchestrator.

### Future/Post-MVP Behavior

Queue topology, dead-letter handling, concurrency scaling and worker sharding can be refined after architecture review.

### Open Questions

- Final queue technology and deployment topology.
- Orchestrator checkpoint/persistence strategy.
- Retry/idempotency policy per job type.

### Traceability References

- `docs/architecture/multi-agent-system-architecture.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/specs/state-machine.md`

## ADR-018 - VerifiedProfile Required Before Classification and Document Generation

**Status:** Conditionally Accepted

### Context

LCSP is evidence-based. Wizard-only results may produce readiness/preliminary indicators but must not produce legal risk level. Classification and final compliance documents require reconciled, evidence-backed profile data and legal citation traceability.

### Decision

`VerifiedProfile` is mandatory before Risk Classification and final compliance document generation. VerifiedProfile may be built only after Repository Scan evidence passes gates, AIUsageFlow exists or uncertainty is resolved, and no unresolved conflict remains.

### Consequences

- Classification cannot run on WizardProfile-only or TechnicalProfile-only state.
- Unresolved conflict blocks classification and final report.
- Missing critical legal citation blocks or degrades legal output.
- Document Generation must check final report gate and output guardrail.

### Security and Privacy Implications

VerifiedProfile must retain traceability to Wizard answers, evidence refs, AIUsageFlow, Manager conflict resolution and audit metadata without storing raw source, full prompts or secrets.

### MVP Behavior

Manager can approve/build VerifiedProfile after conflict-free reconciliation. Risk Classification, Gap Analysis and Document Generation run only downstream.

### Future/Post-MVP Behavior

Future governance may add additional review roles, but must not remove the requirement that classification uses VerifiedProfile and legal citation trace.

### Open Questions

- Final VerifiedProfile approval UX detail.
- Whether readiness-only exports can include specific non-risk findings when classification is blocked.
- Final degraded-output policy for missing partial citations.

### Traceability References

- `docs/specs/implementation-contract.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`

## ADR-019 - Static Analysis Scanner with Language-Specific Semantic Analyzers

**Status:** Conditionally Accepted

### Context

LCSP needs repository-derived technical evidence for AI usage without executing customer code or leaking source to LLM. Provider/framework detection alone is insufficient for legal risk classification. Scanner output must be rich enough to support TechnicalEvidenceReport, TechnicalProfile, AIUsageFlow and A2-b validation.

### Decision

Use a static-analysis-only scanner subsystem inside the Python Worker:

- Tree-sitter for generic multi-language parsing and fallback structural analysis.
- Isolated Node.js TypeScript Analyzer Sidecar using TypeScript Compiler API for TypeScript/JavaScript semantic analysis.
- Python `ast` plus custom import/module resolver for Python semantic analysis.
- Versioned YAML/JSON scanner rulesets for provider/framework/API invocation, decision, review, domain and data signals.
- NetworkX for scan-local in-memory evidence graph assembly only.
- PostgreSQL for normalized graph metadata, evidence refs, hashes, paths and structured findings only.

The scanner must not execute customer code, run package installs/builds/tests, run Docker/shell/CI workflows, probe APIs, persist raw source/full AST bodies/full prompts/secrets or send raw source/full prompts/secrets to LLM.

### Consequences

- TS/JS and Python receive first-class semantic analysis in MVP.
- Other languages are limited to basic signal detection or coverage limitations.
- Scanner evidence is traceable and reproducible via commit SHA, scanner version and ruleset version.
- Scanner does not produce legal conclusions; it produces technical findings and graph paths for downstream analysis.

### Security and Privacy Implications

Raw source exists only in an isolated temporary workspace. The scanner persists metadata, refs, hashes, graph paths, redacted findings and coverage limitations. LLM Gateway receives no raw source, full prompt or secret values.

### MVP Behavior

Manager requests Repository Scan. Python Worker shallow-clones the pinned commit, runs static analyzers, generates TechnicalFindings and TechnicalEvidenceReport, persists metadata only, redacts secrets and cleans up the workspace.

### Future/Post-MVP Behavior

CodeQL may be evaluated later as an optional analysis input, but it is not an MVP runtime dependency. Additional language analyzers may be added if A2-b or customer validation shows need.

### Open Questions

- Exact scanner sandbox technology.
- TypeScript analyzer packaging as process or sidecar.
- Final physical schema for graph metadata.

### Traceability References

- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/evidence-report-contract.md`
- `docs/security/source-code-privacy-policy.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/repository-and-module-layout.md`

## ADR-020 - Claim-Level Evidence References for AIUsageFlow

**Status:** Conditionally Accepted

### Context

AIUsageFlow bridges technical scanner findings to business/legal meaning. A single global evidence list is not sufficient because each usage-purpose claim can have different evidence strength, source type and uncertainty.

### Decision

Each material AIUsageFlow claim must carry claim-level evidence:

- `value`
- `confidence`
- `evidence_refs[]`
- `source_type`
- `uncertainty_reason` when applicable

Required claim families include business process, AI purpose, input types, output types, downstream action, affected subjects, human review, automation level and potential harm categories.

Claims without evidence refs cannot be used for legal rule matching or final classification. Manager-declared claims can supplement business context but must remain distinguishable from scanner-derived evidence. Reconciled claims must preserve scanner-derived and Manager-declared refs where applicable.

### Consequences

- Legal Rule Matching can select rule families only from traceable claims.
- Unclear or unsupported usage-purpose claims block final classification or route Manager clarification.
- AIUsageFlow supports audit and A2-b validation at claim granularity.

### Security and Privacy Implications

Evidence refs point to sanitized findings, hashes, graph paths and metadata. They must not point to raw source, full prompt content or secrets. LLM output cannot create unsupported claims.

### MVP Behavior

AIUsageFlow is generated after TechnicalProfile and before Reconciliation. Reconciliation compares WizardProfile with TechnicalProfile plus claim-level AIUsageFlow evidence. VerifiedProfile and Legal Rule Matching require resolved/evidence-backed material claims.

### Future/Post-MVP Behavior

Future runtime traces or enterprise evidence paths may add additional evidence source types, but must preserve claim-level refs and source-type distinction.

### Open Questions

- Final confidence threshold for blocking vs clarification.
- Final UX for showing claim-level evidence to Manager.
- A2-b acceptance thresholds for claim completeness and mapping eligibility.

### Traceability References

- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/design/traceability-matrix.md`

## ADR-021 - Controlled Multi-Level Data-Flow Analysis Instead of Whole-Repository Global Analysis

**Status:** Conditionally Accepted

### Context

LCSP needs enough flow analysis to understand AI purpose, inputs, outputs, downstream action and human review. Unrestricted whole-repository global data-flow analysis is too complex and risky for MVP, especially across dynamic imports, queues, remote configuration and generated/minified code.

### Decision

Use controlled L0-L4 analysis depth:

| Level | Scope | Behavior |
| --- | --- | --- |
| L0 | Repository inventory | Languages, manifests, configs, routes, schemas |
| L1 | Single-function local flow | Input -> model -> output -> local branch/return/update |
| L2 | Same-module flow | Follow nearby service/function calls |
| L3 | Controlled cross-module flow | Route/controller -> service -> AI invocation -> action |
| L4 | Dynamic or unsupported boundary | Emit uncertainty; do not infer |

L2/L3 tracing starts only after an AI invocation candidate is detected. Dynamic imports, reflection, runtime prompts, remote config, queue boundaries, external proprietary AI services, generated/minified code and unresolved output paths must emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION`.

### Consequences

- Scanner avoids overclaiming complete code understanding.
- A2-b validation can measure precision, false positives, abstention and evidence completeness.
- Unknown/unclear usage purpose blocks final classification or routes traceable Manager clarification.

### Security and Privacy Implications

Controlled static analysis reduces need to execute code or inspect runtime systems. Uncertainty is preserved instead of using LLM or speculation to fill gaps.

### MVP Behavior

Scanner traces bounded evidence paths from repository route/controller/service signals through AI invocation, input/output, downstream action and human review when statically supported. Unsupported boundaries produce coverage limitations.

### Future/Post-MVP Behavior

Future enterprise modes may add richer analyzers, optional runtime traces or CodeQL evaluation, but must preserve no-source-execution and privacy boundaries unless explicitly re-approved.

### Open Questions

- Exact A2-b thresholds for acceptable unknown/abstain rates.
- Whether future queue/event-flow analysis should be added after MVP.
- Whether customer-provided architecture docs can become structured supporting evidence.

### Traceability References

- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/qa/test-strategy.md`
- `docs/qa/acceptance-criteria.md`

## Deferred Architecture Decisions

Các quyết định sau chưa được khóa và không được dùng làm cơ sở implementation backlog:

- Final service boundary.
- Final database schema.
- Final deployment topology.
- Final scaling model.
- Final queue technology.
- Final scanner packaging.
- Final legal rule engine implementation.
- Final document generation implementation.
- Final Orchestrator checkpoint/retry implementation.
- Final LLM Gateway implementation.
- Final enterprise/on-prem mode.

## Validation Dependencies

### A1 affects

- WizardProfile schema.
- Wizard UI.
- Reconciliation input.
- State model.
- Manager Workspace.
- Evidence quality threshold inputs.

### A2 affects

- Legal corpus architecture.
- Rule/citation contract.
- Risk Classification Agent boundary.
- RAG retrieval and rule traceability.
- Citation Guardrail and LLM Gateway requirements.
- Document/report legal basis.
- Audit fields for legal versioning.

### A3 affects

- Attestation schema.
- Permission model.
- Audit trail.
- Evidence gate.
- Conflict resolution workflow.
- Report disclosure.
- Classification unlock path.

## Revisit Triggers

ADR phải được revisit khi:

- A1 validation changes WizardProfile fields or required Wizard behavior.
- A2 validation changes legal rule schema, citation contract or rule_id trace.
- A3 validation rejects or restricts attestation unlock path.
- PRD changes any non-negotiable product constraint.
- Architecture Exploration changes preferred Option A direction.
- Security review tightens source-code handling rules.
- MVP scope changes GitHub App/Local-CI/manual evidence priorities.

## Readiness for Final Architecture Document

Final architecture document có thể được tạo sau khi:

- Product/architecture review chấp nhận Option A là MVP baseline hoặc ghi rõ alternative.
- A1-A3 có validation result hoặc explicit unresolved caveat.
- ADR status được review.
- Deferred Architecture Decisions được giữ deferred hoặc có owner.
- Open architecture questions từ `architecture-exploration.md` được phân loại blocker/non-blocker.

Final architecture document phải dùng cùng lúc:

- `docs/architecture/architecture-exploration.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/product/prd.md`
- `docs/product/validation-plan.md`

## Required Conclusion

ADR này chỉ khóa hướng kiến trúc ở mức conditional.

Có thể dùng ADR này để tạo final architecture document sau khi review.

Chưa được tạo implementation backlog nếu A1-A3 chưa có acceptance threshold và validation result rõ.

Nếu validation A1-A3 làm thay đổi PRD, các ADR liên quan phải được revisit.

Architect Agent phải dùng `architecture-exploration.md`, `architecture-decision-records.md`, `prd.md` và `validation-plan.md` khi tạo final architecture document.
