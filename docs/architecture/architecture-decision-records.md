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

## ADR-003 - Manager-led workflow with task-based Developer participation

**Status:** Accepted for MVP

### Context

PRD xác định MVP chỉ expose 2 role: Manager và Developer. Manager owns assessment và business/legal truth. Developer owns technical truth và chỉ nhận technical tasks/policies do Manager gán.

### Decision

Architecture phải support **Manager-owned assessment** và **task-based Developer participation**.

### Rationale

- Giữ UX đơn giản cho MVP.
- Tránh full enterprise IAM/parallel collaboration quá sớm.
- Phù hợp product decision: Manager-led workflow with Developer tasks.
- Bảo vệ ranh giới business/legal truth và technical truth.

### Alternatives Considered

- Sequential handoff cứng: Manager xong hết rồi Developer làm rồi Manager quay lại.
- Full parallel collaboration với nhiều role, field locking và concurrent edits.
- Multi-role enterprise IAM từ MVP.

### Consequences

- RBAC/permission phải hỗ trợ 2 role.
- Developer không có Manager permissions.
- Developer chỉ thấy assigned technical tasks và limited context.
- Manager xem progress tổng.
- Audit phải ghi policy assignment và task actions.

### Validation Dependency

- Không phụ thuộc mạnh vào A1-A3 để giữ nguyên direction, nhưng A1 có thể ảnh hưởng task routing nếu Wizard field model thay đổi.

### Revisit Trigger

- User testing cho thấy Developer cần chủ động hơn trong assessment.
- Compliance review yêu cầu thêm reviewer/approver role riêng.
- Enterprise buyer yêu cầu admin/IAM role trong MVP.

## ADR-004 - Evidence-first classification gate

**Status:** Accepted for MVP

### Context

PRD cấm Wizard-only risk level. Risk Classification Agent chỉ chạy khi WizardProfile submitted, Technical Evidence received, schema completeness gate passed, quality threshold gate passed, reconciliation tạo VerifiedProfile và không còn material/critical conflict unresolved.

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

Product Brief và PRD chọn Hybrid Evidence Strategy: GitHub App read-only là default MVP path; Local/CI scanner hoặc manual evidence upload là enterprise-safe alternative.

### Decision

Architecture phải support nhiều evidence collection modes nhưng normalize về một **Evidence Report Contract** thống nhất.

### Rationale

- GitHub App path phục vụ UX/demo/SME.
- Local/CI path phục vụ source privacy/enterprise.
- Manual evidence upload hỗ trợ scanner chạy ngoài hệ thống hoặc dynamic/wrapper logic.
- Reconciliation và gates không nên phụ thuộc từng source cụ thể.

### Alternatives Considered

- GitHub App-only.
- Local/CI-only.
- Fully pluggable evidence marketplace từ MVP.

### Consequences

- Cần adapter per evidence source.
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

## ADR-007 - Conflict Score as the only blocking score

**Status:** Accepted for MVP

### Context

PRD định nghĩa ba score: Evidence Confidence Score, AI Intervention Score và Conflict Score. Chỉ Conflict Score có quyền block workflow.

### Decision

Workflow engine chỉ block theo Conflict Score. Evidence Confidence Score và AI Intervention Score chỉ là supporting signals.

### Rationale

- Evidence mạnh không tự động là legal conclusion.
- AI intervention cao không tự động là violation.
- Mâu thuẫn giữa WizardProfile và TechnicalProfile mới là lý do cần block workflow.
- Giữ scoring model dễ audit.

### Alternatives Considered

- Cho Evidence Confidence Score block workflow.
- Cho AI Intervention Score block workflow.
- Dùng một composite score duy nhất.

### Consequences

- Score service/module phải tách 3 score.
- Workflow engine chỉ dùng Conflict Score để block.
- Evidence Confidence ảnh hưởng review/Developer confirmation.
- AI Intervention là input cho risk classification sau VerifiedProfile.
- Conflict records phải lưu score, threshold, field và resolver.

### Validation Dependency

- **A1:** Wizard field model ảnh hưởng conflict calculation.
- **A3:** attestation policy ảnh hưởng conflict resolution, không thay đổi nguyên tắc score.

### Revisit Trigger

- Evaluation cho thấy Conflict Score threshold không ổn.
- Product thay đổi material/critical conflict definition.
- Legal review yêu cầu hard-block theo một field bất kể score.

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
- Critical claim cần dual confirmation.
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
