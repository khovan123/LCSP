# LCSP Architecture Exploration

## Purpose

Tài liệu này là **Architecture Exploration** cho LCSP dựa trên Conditional PRD và Validation Plan. Mục tiêu là phân tích boundary, module, trade-off, rủi ro kiến trúc và hướng ưu tiên trước khi tạo architecture document chính thức.

Đây không phải final architecture. Tài liệu này không tạo implementation backlog, không viết code, không finalize database schema chi tiết, không finalize infrastructure deployment, và không khóa implementation design khi A1-A3 trong `validation-plan.md` chưa được validate.

## Input Documents

- `docs/product/prd.md`
- `docs/product/validation-plan.md`
- `docs/product/product-brief.md`
- `docs/brainstorming/decision-candidates.md`
- `LCSP_Technical_Specification.html`

## Product Constraints from PRD

Kiến trúc phải giữ các constraint sản phẩm sau:

- LCSP là evidence-based compliance platform, không phải chatbot hoặc checklist đơn giản.
- MVP chỉ expose 2 role: Manager và Developer.
- Manager owns assessment và business/legal truth.
- Developer receives task-based policies và owns technical truth.
- Không có technical evidence thì không có risk level.
- Wizard-only chỉ tạo `SELF_DECLARED_READINESS`, readiness checklist và preliminary indicators.
- Risk Classification chỉ chạy sau VerifiedProfile.
- Conflict Score là score duy nhất có thể block workflow.
- GitHub App read-only là default MVP evidence path.
- Local/CI scanner hoặc manual evidence upload là enterprise-safe alternative.
- Human technical attestation là controlled evidence supplement, không phải bypass.
- Không gửi raw source code cho LLM.
- Không lưu raw source code dài hạn.
- Không final report nếu còn unresolved material/critical conflict.

## Validation Caveats from Validation Plan

Architecture Exploration được phép tiếp tục, nhưng final architecture và backlog không được khóa khi các caveat này chưa được xử lý:

- **A1 - Wizard simplicity vs completeness:** WizardProfile field model có thể thay đổi sau user testing. Kiến trúc cần tránh hard-code question/field mapping vào UI hoặc classification logic.
- **A2 - Legal corpus / rule reliability:** Rule schema, rule_id trace và legal corpus versioning có thể thay đổi sau validation. Kiến trúc cần tách rule/corpus lifecycle khỏi LLM prompt logic.
- **A3 - Human attestation abuse risk:** Attestation unlock path có thể bị siết hoặc loại khỏi MVP. Kiến trúc cần thiết kế attestation như evidence supplement có policy gate, không phải bypass hard-coded.

Architect Agent bắt buộc đọc `validation-plan.md` cùng với `prd.md` khi dùng tài liệu này.

## System Boundary

LCSP boundary gồm các capability product-level:

- Manager Workspace: assessment setup, Wizard, readiness, conflict resolution, VerifiedProfile approval, report generation.
- Developer Workspace: repository connection, scan/upload evidence, findings review, technical confirmation, structured attestation.
- Evidence collection and normalization.
- Evidence gates: schema completeness, privacy flags, quality threshold.
- Reconciliation and conflict workflow.
- Scoring: Evidence Confidence, AI Intervention, Conflict Score.
- VerifiedProfile lifecycle.
- Risk Classification Agent boundary.
- Legal corpus/RAG and compliance rules.
- Gap analysis and document generation.
- Audit trail and decision provenance.

Out of boundary for this exploration:

- Final deployment topology.
- Detailed database schema.
- Implementation backlog.
- CI/CD production-grade GitHub Action as default path.
- Multi-country compliance.
- Direct MoST submission.

## User-Facing Workspaces

### Manager Workspace

Responsibilities:

- Create and own assessment.
- Fill Wizard in business/legal language.
- View readiness and preliminary indicators.
- Invite Developer and assign policies.
- Track full assessment progress.
- Resolve business/legal conflicts.
- Approve VerifiedProfile.
- Generate report only when gates pass.

Architectural implication:

- Manager Workspace should call assessment, wizard, conflict, VerifiedProfile and reporting capabilities through a stable API.
- It should never need raw source code or scanner internals.
- It should render technical evidence through business-facing summaries and conflict explanations.

### Developer Workspace

Responsibilities:

- Connect GitHub selected repo or upload Local/CI/manual evidence.
- Run/re-run scan where authorized.
- Review technical findings and evidence refs.
- Confirm false positive/false negative.
- Provide structured technical attestation.
- Resolve technical conflicts assigned by Manager policy.

Architectural implication:

- Developer Workspace needs task-scoped access and limited assessment context.
- It should be able to inspect technical findings without exposing Manager-only actions.
- It must not approve VerifiedProfile, run final classification or generate final report.

## Core Domain Modules

The following modules are domain boundaries, not necessarily separate deployable services in MVP:

- **Assessment Module:** assessment lifecycle, owner, role/policy assignment, state transitions.
- **Wizard Module:** Wizard question definitions, WizardProfile mapping, readiness/preliminary indicators.
- **Developer Task Module:** invitations, task policies, task status, limited context.
- **Evidence Module:** source registration, upload/scan result intake, evidence report storage, provenance.
- **Evidence Gate Module:** schema validation, privacy validation, quality threshold evaluation.
- **Scanner Adapter Module:** GitHub App read-only scan, Local/CI/manual upload adapters, normalization.
- **Reconciliation Module:** WizardProfile vs TechnicalProfile comparison, conflict creation, confirmation routing.
- **Scoring Module:** Evidence Confidence, AI Intervention and Conflict Score calculation.
- **VerifiedProfile Module:** creation, versioning and approval after conflict resolution.
- **Classification Module:** risk classification orchestration after VerifiedProfile.
- **Legal Corpus / Rule Module:** corpus ingestion/read model, rule_id trace, retrieval and citation validation.
- **Document Module:** gap analysis and report/document generation.
- **Audit Module:** immutable decision provenance across all major actions.

## Evidence Collection Architecture

MVP evidence architecture should support three intake modes:

1. **GitHub App read-only scan** as default MVP path.
2. **Local/CI scanner report upload** as enterprise-safe alternative.
3. **Manual technical evidence JSON upload** as fallback for externally-run scanner or runtime logic not captured automatically.

All evidence modes converge into one normalized Technical Evidence Report contract before gates and reconciliation.

Important boundary:

```text
Evidence source -> Evidence Normalizer -> Evidence Report -> Schema/Privacy/Quality Gates -> Reconciliation
```

The architecture should avoid separate reconciliation behavior per evidence source. Source-specific differences belong in adapters and provenance.

## Scanner and Source Code Boundary

Scanner boundary is security-critical:

- Scanner creates technical evidence; it does not make legal conclusions.
- Raw source code must not be sent to LLM.
- Raw source code must not be stored long term.
- GitHub App must use least privilege and selected repositories only.
- Scanner output should be evidence summary, findings, confidence and provenance.
- Full AST should not be uploaded/stored as long-term product data.
- Snippets, if ever enabled, must be redacted and controlled; MVP should keep snippets off by default unless explicitly validated.

Scanner tools referenced by technical specification:

- Syft for SBOM/dependency inventory.
- Knip/deptry for dependency usage.
- Semgrep for AI pattern detection.
- tree-sitter/custom analysis for import/call graph summaries.
- Evidence Normalizer for TechnicalProfile and finding normalization.

Architecture risk:

- Dynamic imports, wrappers and runtime behavior may not be detected. This is why manual evidence/API probe/structured attestation exists, but those paths must remain controlled.

## Evidence Report Contract

This exploration does not finalize schema, but the contract boundary must include these groups:

- `assessment_id`
- `source_type`
- `system_identifier`
- `provenance`
- `scanner_version` or `report_version`
- `timestamp` / `generated_at`
- `scope`
- `privacy_flags`
- `technical_profile`
- `findings[]`
- `confidence_per_signal`
- `report_hash`

Minimum TechnicalProfile dimensions:

- `ai_usage_signals`
- `data_type_signals`
- `decision_flow_signals`
- `human_oversight_signals`

Contract design rule:

- Missing schema blocks report intake.
- Valid schema but weak evidence can be accepted as evidence object but must not unlock classification.
- Contract must preserve source provenance and integrity for audit.

## Evidence Gate Architecture

Evidence gates should be deterministic and auditable.

### Gate 1 - Schema Completeness

Purpose: ensure report can be parsed, mapped to assessment and audited.

Failure state:

```text
TECHNICAL_EVIDENCE_REJECTED
```

### Gate 2 - Privacy Flags

Purpose: reject evidence that violates source-code/privacy guardrails.

Failure state:

```text
TECHNICAL_EVIDENCE_REJECTED
```

### Gate 3 - Quality Threshold

Purpose: decide whether evidence is sufficient for reconciliation/classification unlock, using Wizard context.

Failure state:

```text
TECHNICAL_EVIDENCE_INSUFFICIENT
```

Pass state:

```text
TECHNICAL_EVIDENCE_READY
```

Architecture caveat:

- Context-aware quality thresholds depend on A1 Wizard field validation. Avoid baking thresholds into scattered business logic; keep them configurable/rule-driven.

## Reconciliation Architecture

Reconciliation compares WizardProfile and TechnicalProfile, creates conflict records, routes confirmations and produces VerifiedProfile only when allowed.

Inputs:

- WizardProfile
- TechnicalProfile
- Evidence findings and refs
- Evidence scores
- Manager/Developer confirmations
- Attestations where accepted

Outputs:

- Conflict records
- Reconciliation status
- VerifiedProfile candidate
- Audit events

Boundary rules:

- Reconciliation is not a legal classification service.
- Reconciliation cannot produce VerifiedProfile with unresolved material/critical conflict.
- Material conflicts route to both Developer and Manager.
- Technical conflicts route to Developer.
- Business/legal conflicts route to Manager.

Implementation packaging can be either:

- Module inside NestJS backend for MVP, coordinating with Python agent only after gates; or
- Dedicated service in a service-oriented future.

## Scoring Architecture

Scoring should be a deterministic, auditable module/service.

### Evidence Confidence Score

- Measures confidence in technical evidence.
- Supporting signal only.
- Can trigger Developer confirmation.
- Cannot block workflow alone.

### AI Intervention Score

- Measures depth of AI involvement in workflow/decision.
- Input to classification after VerifiedProfile.
- Cannot block workflow alone.

### Conflict Score

- Measures severity of WizardProfile vs TechnicalProfile mismatch.
- Only score that can block workflow.
- Must be persisted on conflict records.

Architecture rule:

```text
Only Conflict Score can block workflow.
```

Scoring should be versioned or at least audit-tagged, because threshold changes can affect outcomes.

## VerifiedProfile Lifecycle

VerifiedProfile is the contractual handoff from reconciliation to classification.

Lifecycle:

```text
WizardProfile + TechnicalProfile
-> Evidence gates pass
-> Reconciliation
-> Conflict resolution / dual confirmation where needed
-> VerifiedProfile candidate
-> Manager approval
-> VERIFIED_PROFILE_READY
-> READY_FOR_CLASSIFICATION
```

Constraints:

- No VerifiedProfile while material/critical conflict is unresolved.
- No Risk Classification before VerifiedProfile.
- VerifiedProfile must be versioned/audited.
- VerifiedProfile field model may change if A1 validation changes WizardProfile fields.

## Risk Classification Agent Boundary

Risk Classification Agent is downstream of VerifiedProfile.

Inputs:

- VerifiedProfile
- Legal rules
- Retrieved legal chunks/citations
- Technical evidence summary
- Scoring inputs

Outputs:

- risk level only when allowed
- confidence
- triggered rules
- legal refs/citations
- retrieved chunks/trace
- model/prompt/version metadata

Boundary rules:

- It must not run on Wizard-only profile.
- It must not run before evidence gates and reconciliation.
- It must not create legal conclusion without retrieved legal rule/citation.
- Hard rules win over LLM interpretation.
- Missing rule/citation for critical conclusion degrades or blocks final classification.

Architecture caveat:

- A2 can change legal rule schema and retrieval/citation validation requirements. Keep classification boundary dependent on a stable rule/citation interface, not ad hoc prompt text.

## Legal Corpus / RAG Architecture

Legal Corpus / RAG boundary should support:

- Legal document inventory with version/checksum/effective date.
- Segmenting by legal structure, not blind token chunking.
- Stable IDs for document, article, clause, point.
- Reference expansion for cross-references.
- Retrieval constrained to current/valid legal corpus version.
- Citation validation: agent output can cite only retrieved/approved legal refs.
- Rule table or rule source that maps `rule_id` to legal source/citation/version.

Not finalized here:

- exact schema;
- ingestion job design;
- corpus update workflow;
- storage optimization.

Architecture risk:

- If A2 fails, architecture must either block classification scope or reduce MVP legal coverage until rule/corpus reliability is sufficient.

## Document Generation Architecture

Document generation is downstream of:

- evidence-based Risk Classification;
- gap analysis;
- legal citations;
- audit summary;
- no unresolved material/critical conflict.

Boundary rules:

- Readiness-only export is allowed without technical evidence, but must not include HIGH/MEDIUM/LOW.
- Final compliance report must not be generated from `SELF_DECLARED_READINESS`.
- Final report must disclose if classification used structured human technical attestation.
- Generated documents need version/checksum/audit metadata.

Technical spec references DOCX template -> PDF pipeline and object storage, but this exploration does not finalize implementation detail.

## Audit Trail Architecture

Audit is cross-cutting and should be treated as a first-class boundary, not a logging afterthought.

Audit must record:

- assessment creation and ownership;
- Manager and Developer policy assignment;
- Wizard answers and versions;
- evidence source metadata;
- scanner/report/ruleset versions;
- report hash;
- scope and privacy flags;
- evidence gate results and reasons;
- conflict records and scores;
- Manager/Developer confirmations;
- human technical attestation;
- VerifiedProfile version;
- classification output and rule/citation trace;
- gap analysis output;
- generated document version and export timestamp.

Architecture guidance:

- In Option A, Audit Module can live in NestJS with strict append-only write patterns.
- In Option B, Audit Service becomes independent, but that increases integration complexity.
- In both options, workers must emit audit events through a controlled interface, not direct ad hoc writes.

## Privacy & Security Architecture

Security boundaries:

- GitHub App read-only permissions.
- Selected repository access.
- Short-lived installation tokens.
- No raw source sent to LLM.
- No long-term raw source storage.
- Secret redaction before any persisted snippet/evidence excerpt.
- Manager sees business-readable evidence summaries, not raw source.
- Developer sees technical findings only within assigned task policy.
- Attestation cannot replace machine-generated metadata.

Data minimization:

- Persist evidence summaries, findings, hashes, provenance and graph summaries.
- Avoid persisting full source, full AST, secrets or unnecessary snippets.
- Object storage is suitable for reports/evidence artifacts, but final retention policy remains an open architecture question.

## Human Attestation Architecture

Human technical attestation must be modeled as controlled evidence supplement.

Required boundaries:

- Attestation schema.
- Role-bound claims.
- Policy check: only authorized Developer can attest technical truth.
- Manager can only confirm business/legal meaning.
- Critical claims require dual confirmation.
- Attestation is linked to assessment, evidence refs, conflict id where relevant and audit.
- Report discloses attestation-assisted classification.

Forbidden replacement metadata:

- report hash;
- scanner version;
- ruleset version;
- scan timestamp;
- repo/commit metadata;
- legal corpus version;
- evidence report integrity;
- machine-generated privacy flags.

Architecture caveat:

- A3 may reduce or remove attestation as an unlock path. Therefore, attestation should be modular and policy-gated, not embedded as a shortcut in classification.

## State Model

Architecture should preserve PRD state semantics:

- `WIZARD_IN_PROGRESS`
- `SELF_DECLARED_READINESS`
- `TECHNICAL_EVIDENCE_REQUIRED`
- `DEVELOPER_INVITED`
- `EVIDENCE_COLLECTION_IN_PROGRESS`
- `TECHNICAL_EVIDENCE_MISSING`
- `TECHNICAL_EVIDENCE_REJECTED`
- `TECHNICAL_EVIDENCE_INSUFFICIENT`
- `TECHNICAL_EVIDENCE_READY`
- `RECONCILIATION_REQUIRED`
- `DEVELOPER_CONFIRMATION_REQUIRED`
- `MANAGER_CONFIRMATION_REQUIRED`
- `VERIFIED_PROFILE_READY`
- `READY_FOR_CLASSIFICATION`
- `CLASSIFIED`
- `GAP_ANALYZED`
- `REPORT_READY`
- `BLOCKED_BY_CONFLICT`

State transitions must be guarded by product rules, not UI convention. Example: UI hiding a button is not sufficient; backend/module boundary must reject invalid transition.

## Integration Points

External/internal integration boundaries:

- GitHub App API for read-only repository access.
- Local/CI evidence report upload.
- Manual evidence JSON upload.
- Optional API probe evidence.
- LLM provider for controlled low-temperature agent calls.
- Legal corpus/vector store for retrieval.
- Object storage for reports/evidence artifacts.
- Queue for scan/agent jobs and progress.
- SSE or similar one-way progress feed for UI updates, already present in technical spec.

Open integration questions:

- Exact Local/CI report compatibility format.
- API probe trust model.
- Evidence retention and deletion policy.
- Report signing/e-signature boundary for MVP vs later phase.

## Architecture Options Comparison

### Option A - Monolith-first Modular Backend

Shape:

- Next.js frontend.
- NestJS backend modular API.
- Python scanner/agent worker separate.
- PostgreSQL.
- ChromaDB.
- MinIO.
- Queue for scan/agent jobs.

Modules such as Assessment, Wizard, Evidence Gate, Reconciliation, Scoring, Audit and Document Coordination live as modules in the NestJS backend. Scanner/agent/RAG-heavy execution lives in Python worker boundaries where appropriate.

#### Pros

- Lowest coordination overhead for MVP.
- Fits current technical specification.
- Faster demo path.
- Easier to maintain transactional assessment state and permissions.
- Fewer distributed failure modes.
- Clear path to later service extraction when boundaries prove stable.

#### Cons

- Backend module can grow large if boundaries are not enforced.
- Audit and reconciliation could become tightly coupled to assessment code.
- Scaling individual modules independently is harder early on.
- Requires discipline to avoid leaking implementation details across modules.

#### Complexity

Medium-low for MVP. Most complexity stays in domain logic, not deployment topology.

#### MVP Suitability

High. This option best matches conditional PRD and validation-plan uncertainty because A1-A3 may still change boundaries.

#### Security Impact

Good if module boundaries enforce:

- task-scoped Developer policies;
- source code privacy rules;
- audit write discipline;
- evidence gate checks before classification.

Security risk is mainly accidental coupling, not distributed trust.

#### Demo Suitability

High. Easier to run and demonstrate end-to-end Wizard -> evidence -> gates -> reconciliation -> classification -> report.

#### Enterprise Path

Good if modules are designed as extraction candidates:

- Scanner adapter can become Scanner Service.
- Audit module can become Audit Service.
- RAG/legal corpus can become RAG Service.
- Document generation can become Document Service.

#### Failure Modes

- Backend module boundary erosion.
- A bad release affects multiple modules.
- Queue/worker failure can stall scanner/agent jobs.
- Reconciliation/audit coupling could make state recovery harder if not designed carefully.

### Option B - Service-oriented MVP

Shape:

- Web/API service.
- Scanner service.
- Agent orchestration service.
- Document generation service.
- RAG service.
- Audit service.

Each boundary becomes independently deployable earlier.

#### Pros

- Clear ownership boundaries from day one.
- Easier independent scaling for scanner, RAG and document workloads.
- Audit can be isolated as a stronger compliance boundary.
- Enterprise story may look cleaner.

#### Cons

- Higher MVP complexity.
- More integration contracts before A1-A3 are validated.
- More failure modes: network, retries, idempotency, partial state, distributed tracing.
- Slower demo path.
- Risk of premature service boundaries if WizardProfile/rule/attestation models change.

#### Complexity

High for MVP. Much of the effort goes into service coordination rather than validating product risk.

#### MVP Suitability

Medium-low. It is attractive long-term but heavy while A1-A3 remain unvalidated.

#### Security Impact

Potentially strong with isolated services, but also expands attack surface and operational burden:

- service-to-service auth;
- data leakage between services;
- distributed audit consistency;
- broader secrets/config management.

#### Demo Suitability

Medium-low. More moving parts make demo reliability harder.

#### Enterprise Path

High long-term. Natural fit once domain contracts stabilize.

#### Failure Modes

- Distributed transaction and state drift.
- Audit event loss or ordering issues.
- Reconciliation waits on multiple services.
- Classification may run against stale evidence if orchestration is weak.
- Complex local development slows delivery.

## Recommended Architecture Direction

Recommended direction for this stage:

```text
Option A - Monolith-first modular backend + separate Python scanner/agent worker
```

Reasoning:

- It matches the existing technical specification.
- It keeps MVP demo feasible.
- It avoids premature service boundaries while A1-A3 can still change data contracts.
- It still respects the strongest technical boundary already present: Python scanner/agent worker separated from NestJS API orchestration.
- It allows later extraction into Option B style services after validation stabilizes WizardProfile, legal rule/citation contracts and attestation policy.

Recommended architecture posture:

- Design modules as extraction candidates.
- Keep domain contracts explicit.
- Keep worker boundaries for scan/agent execution.
- Keep audit interface strict.
- Keep evidence gates deterministic and centralized.
- Do not lock final infrastructure/deployment yet.

## Architecture Risks

- **A1 dependency:** WizardProfile field model may change, affecting evidence quality thresholds, reconciliation and VerifiedProfile.
- **A2 dependency:** Legal rule/citation schema may change, affecting RAG, classification and report traceability.
- **A3 dependency:** Attestation unlock path may be restricted, affecting evidence gate and reconciliation flows.
- **Scanner reliability:** Static analysis may miss dynamic or runtime AI behavior.
- **Source privacy:** GitHub App path must avoid raw source leakage to LLM/storage.
- **Audit consistency:** Worker and API actions must produce coherent audit trail.
- **State machine correctness:** Invalid transitions must be blocked server-side.
- **Module coupling:** Monolith-first approach can degrade into a tangled backend if module boundaries are weak.
- **RAG legal correctness:** Citation validation must prevent hallucinated legal refs.

## Open Architecture Questions

- A1: What final WizardProfile fields will survive user testing?
- A1: Should Wizard question definitions be stored/configured as data to allow iteration without code change?
- A2: What is the final legal rule schema and rule_id format?
- A2: How will legal corpus version pinning be represented at assessment level?
- A2: What is the degraded state when legal rule/citation is missing?
- A3: Is human technical attestation allowed to unlock classification in MVP, or only to create review task?
- A3: What exact attestation schema and policy evaluator are required?
- How should Local/CI evidence upload authenticate provenance?
- How should API probe evidence be trusted and versioned?
- What is the retention policy for evidence artifacts and generated reports?
- What audit storage pattern is sufficient for "immutable enough" in MVP?
- Which modules are first candidates for service extraction after MVP?

## Readiness for Final Architecture Document

This Architecture Exploration can be used to start Architecture Exploration and discuss final system boundaries. It is not ready to be treated as final architecture until validation caveats are addressed or explicitly carried as architecture assumptions.

Final architecture document can proceed when:

- Product confirms whether Option A direction is accepted as MVP baseline.
- A1 has at least a validated WizardProfile field model or an explicit change-tolerant design requirement.
- A2 has a minimum legal rule/citation contract.
- A3 has a final attestation policy stance for MVP.
- Open Architecture Questions have owners or are marked non-blocking.

Final architecture must not:

- create implementation backlog;
- lock service boundaries prematurely;
- assume WizardProfile/rule/attestation contracts are final if validation is incomplete;
- allow Wizard-only risk level;
- allow Risk Classification before VerifiedProfile;
- allow attestation to bypass machine-generated metadata.

Required conclusion:

```text
Architecture Exploration may recommend Option A as the preferred direction.
Implementation backlog must not be created yet.
Final architecture must not be locked while A1-A3 remain unvalidated.
Architect Agent must treat validation-plan.md as a required companion to prd.md.
Any architecture assumption affected by A1-A3 must remain visible in Open Architecture Questions.
Architecture may begin at exploration level, but implementation design cannot be locked until validation is complete or PRD is updated.
```
