# LCSP Implementation Contract

## Purpose

Tài liệu này là canonical implementation contract cho nhánh `LCSP - Conditional Implementation Documentation Branch`. Nó khóa các quyết định implementation-ready ở mức design/spec để các tài liệu kỹ thuật tiếp theo không mâu thuẫn nhau.

Tài liệu này không tạo code, không tạo epics/stories, không tạo sprint và không mở implementation backlog.

## Scope and Non-goals

### Scope

Contract này định nghĩa:

- MVP workflow bắt buộc.
- Authentication boundary cho Password Login, OAuth/OIDC Login và TOTP MFA.
- GitHub App và Repository Scan boundary.
- Manager super-role và optional Developer model.
- Post-MVP permission delegation.
- Repository Scan-only evidence model.
- `AIUsageFlow` contract.
- Gates, blocking conditions và conflict handling.
- Legal rule/citation requirements.
- LLM, source-code privacy, audit và security invariants.
- Future/Enterprise scope.
- Open technical decisions cần giữ trước khi tạo implementation docs.

### Non-goals

- Không tạo implementation code.
- Không tạo Prisma schema, database migration, controller, route handler hoặc worker code.
- Không tạo backlog, epic, story, sprint hoặc task.
- Không thay đổi readiness status.
- Không xác nhận A1, A2, A2-b hoặc A3 đã pass.
- Không xem LCSP là implementation-ready khi validation chưa chạy.

## Source Priority and Mismatch Handling

Khi tài liệu cũ mâu thuẫn với contract này, ưu tiên:

```text
Authoritative decisions in this branch
-> PRD
-> ADR
-> Architecture
-> Specs
-> Detailed Design
-> QA documents
```

### Known Mismatches to Carry Forward

| Source | Mismatch | Contract Resolution |
| --- | --- | --- |
| `LCSP_Technical_Specification.html` | Một số flow cũ còn mô tả Developer hoặc Manager+Dev là actor bắt buộc cho evidence/conflict. | MVP dùng Manager-only success path; Developer là optional collaborator. |
| `docs/product/prd.md` section Reconciliation Rules | Đoạn cũ còn nói technical conflict do Developer, material conflict cần Manager+Developer. | Authoritative decision mới: mọi MVP conflict route đến Manager conflict-resolution task; Developer clarification optional/post-MVP. |
| Một số docs cũ trước ADR-011/ADR-012 | OAuth/OIDC từng bị gộp với SSO/Future hoặc Developer là dependency cho technical evidence. | OAuth/OIDC Login là MVP; Enterprise SSO/SAML/Federation là Future; Manager là super-role. |

Phase tiếp theo phải sửa source docs phù hợp nếu mismatch còn nằm trong tài liệu nguồn đang được cập nhật.

## MVP Workflow

MVP workflow canonical:

```text
Manager signs in using Password Login or OAuth/OIDC Login
-> LCSP enforces TOTP MFA when enabled
-> Manager creates assessment
-> Manager completes WizardProfile
-> Manager connects GitHub Repository
-> Manager runs Repository Scan
-> Scanner creates TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> Conflict exists?
   -> Yes: pause workflow and create Manager conflict-resolution task
   -> No: build VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
-> Gap Analysis
-> Document Generation
-> Audit Trail
```

Developer không là prerequisite trong MVP workflow. Không workflow transition nào được block chỉ vì Developer chưa được assign.

## OAuth/OIDC and GitHub App Separation

| Capability | Purpose | MVP Status | Boundary |
| --- | --- | --- | --- |
| Password Login | Login nội bộ vào LCSP nếu vẫn giữ trong auth scope | Active MVP if enabled | LCSP authentication |
| OAuth/OIDC Login | Đăng nhập và xác thực danh tính user vào LCSP | Active MVP | LCSP authentication only |
| TOTP MFA | Xác thực bổ sung trong LCSP | Active MVP when enabled | LCSP session assurance |
| GitHub App Connection | Cấp quyền read-only để scan repository | Active MVP | Repository integration |
| Repository Scan | Tạo `TechnicalEvidenceReport` từ selected repo/branch/commit | Active MVP | Evidence collection |

OAuth/OIDC Login:

- Không tự kết nối GitHub repository.
- Không cấp `CONNECT_REPOSITORY`.
- Không cấp `RUN_REPOSITORY_SCAN`.
- Không thay thế LCSP RBAC/authorization.
- Không thay thế GitHub App installation/authorization.
- Phải validate redirect URI, `state`, `nonce`, issuer, audience, token expiry và PKCE policy khi applicable.
- Không expose OAuth client secret ở frontend.
- Không lưu/log raw provider token.
- Vẫn phải tuân thủ LCSP session, lockout và TOTP MFA policy.

Enterprise SSO, SAML, SCIM, directory federation, domain-restricted organization login và advanced organization identity policy là Future/Enterprise scope.

## Manager Super-role Model

Manager là required and sufficient MVP role.

Manager có tất cả active MVP permissions:

- Create assessment.
- Complete WizardProfile.
- Connect GitHub repository.
- Manage connected repository.
- Run and re-run Repository Scan.
- View scan status.
- View TechnicalEvidenceReport and findings.
- Review AIUsageFlow.
- Resolve all MVP conflicts.
- Create or approve VerifiedProfile.
- Trigger Risk Classification.
- View Gap Analysis.
- Request Document Generation.
- View Audit History.
- Manage own assessment workflow end-to-end.

Rule:

```text
Manager can perform every active Developer action in MVP.
Developer absence must not block MVP assessment completion.
```

## Optional Developer Model

Developer là optional collaborator, không phải required actor.

Trong MVP:

- Developer workspace có thể tồn tại nhưng không bắt buộc.
- Developer không sở hữu workflow transition bắt buộc.
- Developer input không finalize conflict.
- Developer input không unlock classification.
- Developer không approve VerifiedProfile.
- Developer không trigger final classification hoặc final document.

Nếu Developer được dùng trong MVP demo/documentation, wording phải là optional delegated collaborator, không phải mandatory technical owner.

## Post-MVP Permission Delegation Model

Manager remains owner and superset role.

Post-MVP, Manager có thể delegate scoped permission cho Developer theo:

- organization;
- assessment;
- repository;
- task;
- time period nếu sau này được hỗ trợ.

Allowed future Developer permission codes:

```text
CONNECT_REPOSITORY
RUN_REPOSITORY_SCAN
VIEW_TECHNICAL_FINDINGS
VIEW_ASSIGNED_REPOSITORY
RESPOND_TO_TECHNICAL_CLARIFICATION
SUBMIT_TECHNICAL_ATTESTATION
VIEW_ASSIGNED_CONFLICT
```

Developer không tự động có:

```text
FINALIZE_CONFLICT_RESOLUTION
APPROVE_VERIFIED_PROFILE
TRIGGER_FINAL_RISK_CLASSIFICATION
GENERATE_FINAL_COMPLIANCE_DOCUMENT
MANAGE_ORGANIZATION_MEMBERSHIP
MANAGE_ORGANIZATION_SECURITY_POLICY
```

Delegation invariants:

- Delegation never removes Manager permissions.
- Manager can revoke, override, reassign or perform delegated actions.
- Permission grants/revocations/actions must be audited.
- Developer clarification does not automatically close conflict.
- Manager remains final resolver and VerifiedProfile approver.

## Repository Scan-only Evidence Model

Active MVP evidence path:

```text
Manager connects GitHub Repository
-> Manager selects repository / branch / commit
-> Manager runs Repository Scan
-> Scanner creates TechnicalEvidenceReport
-> Evidence Normalization
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
```

`TechnicalEvidenceReport` MVP source type:

```text
GITHUB_REPOSITORY_SCAN
```

Required scan metadata:

- assessment_id;
- repository_id or repository reference;
- branch;
- commit_sha;
- scanner_version;
- ruleset_version;
- scan_started_at;
- scan_completed_at;
- scan_status;
- report_hash;
- scope;
- privacy_flags;
- provenance.

Not in MVP main flow:

- Generic Submit Evidence.
- Manual Technical Evidence JSON.
- Local/CI Scanner Report Upload.
- CLI Evidence Submission.
- CI/CD Evidence Submission.
- API Probing.

Các capability này chỉ được mô tả là Deferred/Future/Enterprise path nếu cần trace roadmap.

## Static Analysis Scanner Contract

MVP Repository Scan is implemented as a static-analysis-only scanner. The canonical scanner contract is `docs/specs/static-analysis-scanner-contract.md`.

Scanner principle:

```text
Scanner collects traceable technical evidence.
Scanner does not determine legal risk directly.
```

Allowed scanner behavior:

- read repository files;
- parse source code, dependency manifests, configuration templates and database schemas/migrations;
- build AST, call graph, data-flow graph and evidence graph;
- use OpenAPI/README only as low-confidence contextual signals.

Forbidden scanner behavior:

- execute customer source code;
- run package installation, build, test, Docker Compose, shell scripts, CI workflows or repository scripts;
- probe customer API endpoints;
- persist raw source code long-term;
- send raw source code, full prompts or secrets to LLM.

MVP scanner technology direction:

| Concern | MVP Direction |
| --- | --- |
| Generic parsing | Tree-sitter |
| TypeScript/JavaScript semantics | Node.js TypeScript Analyzer using TypeScript Compiler API |
| Python semantics | Python built-in `ast` + custom import/module resolver |
| Graph assembly | Python + NetworkX scan-local in-memory graph |
| Graph persistence | PostgreSQL normalized graph metadata + JSONB evidence payloads; no source bodies |
| Detection rules | Versioned YAML/JSON scanner rulesets |
| Secret handling | Deterministic redaction before persistence |
| Workspace | Ephemeral isolated container or restricted temporary volume |
| LLM | LLM Gateway only, sanitized metadata only |

CodeQL is not an MVP runtime dependency. It is a Future evaluation option only.

Scanner output feeds:

```text
TechnicalFinding
-> TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow claim-level evidence
```

AIUsageFlow claims must carry claim-level evidence refs. A claim without evidence refs cannot be used for legal rule matching.

## AIUsageFlow Contract

`AIUsageFlow` là mandatory bridge giữa technical evidence và legal rule matching.

Pipeline placement:

```text
TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

`TechnicalProfile` trả lời AI tồn tại như thế nào về mặt kỹ thuật. `AIUsageFlow` trả lời AI được dùng để làm gì trong business flow.

Required `AIUsageFlow` fields:

| Field | Meaning |
| --- | --- |
| `business_process` | Quy trình nghiệp vụ nơi AI xuất hiện |
| `ai_purpose` | Mục đích AI: summarize, chatbot, score, rank, recommend, approve/reject, etc. |
| `ai_input_types` | Loại dữ liệu đưa vào AI |
| `ai_output_types` | Loại output AI tạo ra |
| `downstream_action` | Output được display, recommend, rank, approve/reject, escalate, etc. |
| `affected_subjects` | Customer, employee, student, patient, citizen, internal staff, etc. |
| `human_review` | present, absent hoặc unclear |
| `automation_level` | assistive, decision_support, semi_automated, fully_automated hoặc unclear |
| `potential_harm_categories` | privacy, financial loss, discrimination, denial of service, misinformation, health/safety, etc. |
| `evidence_refs` | Scanner finding refs/supporting evidence refs |
| `confidence` | 0.0-1.0 confidence for usage-flow inference |
| `uncertainty_reasons` | Lý do field unknown/unclear |

If usage purpose is unclear:

```text
Do not final classify.
Record unknown or unclear.
Populate uncertainty_reasons.
Request clarification or create conflict where appropriate.
```

LLM use for AI Usage Flow Analysis:

- Rule-first.
- AST/call graph/data flow extraction must be deterministic where possible.
- LLM may only receive sanitized metadata/evidence summaries.
- Raw source code and full prompt content must not be sent to LLM.
- LLM cannot create legal conclusion.
- LLM output must be schema-validated and cannot override deterministic evidence.

## Gates and Blocking Conditions

| Gate / Control | Required Before | Blocks When |
| --- | --- | --- |
| Wizard submission | Technical evidence workflow | Required WizardProfile fields missing |
| Repository connection | Repository Scan | No selected GitHub repository |
| Repository Scan completion | TechnicalEvidenceReport | Scan not run, failed or invalid metadata |
| Schema Gate | Quality Gate | Required evidence contract fields missing/invalid |
| Quality Gate | TechnicalProfile / Reconciliation | Evidence insufficient, stale or not relevant |
| AI Usage Flow Analysis | Reconciliation / Legal Rule Matching | Critical usage-purpose fields unclear without resolution |
| Reconciliation | VerifiedProfile | Any unresolved conflict |
| Manager conflict resolution | VerifiedProfile | Conflict exists and Manager has not resolved it |
| VerifiedProfile | Risk Classification | VerifiedProfile missing or not approved |
| Legal Rule Matching / Citation Guardrail | Final classification | Required rule/citation missing |
| Final Report Gate | Final document | Unresolved conflict, missing classification, missing legal trace or invalid gap analysis |

## Conflict Handling

MVP conflict routing is binary:

```text
WizardProfile + TechnicalProfile + AIUsageFlow
-> Reconciliation
-> Conflict exists?
   -> No: build VerifiedProfile
   -> Yes: pause workflow and create Manager conflict-resolution task
```

Conflict rules:

- Any conflict pauses workflow.
- Any unresolved conflict blocks Risk Classification.
- Any unresolved conflict blocks final compliance document.
- Manager resolves all MVP conflicts.
- Manager may update business/legal information, request re-scan/correction, or use optional delegated technical clarification.
- Developer clarification is post-MVP/optional input and is not required to resume MVP workflow.
- Severity, if stored, is informational only in MVP and must not create separate workflow branches.
- Conflict Score may explain seriousness, but MVP routing remains conflict exists / no conflict.

## Legal Rule and Citation Requirements

Legal Rule Matching must use `VerifiedProfile` and `AIUsageFlow`, not provider/model presence alone.

Rule matching inputs:

- `business_process`
- `ai_purpose`
- `automation_level`
- `affected_subjects`
- `ai_input_types`
- `ai_output_types`
- `downstream_action`
- `human_review`
- `potential_harm_categories`
- `evidence_refs`

Legal rule/citation requirements:

- `rule_id`
- legal source
- citation
- version
- effective date if available
- legal document version
- traceability from output back to rule/citation

Rules:

- Do not classify high-risk only because repo contains OpenAI, Gemini, LangChain, TensorFlow, PyTorch, model endpoint or AI framework.
- Legal Retrieval/RAG retrieves rules/citations; it does not conclude risk alone.
- Risk Classification Agent uses only `VerifiedProfile` + retrieved legal rules/citations.
- Missing legal citation must block or degrade output.
- LLM cannot invent legal rules/citations outside approved corpus.

## LLM Boundary

LCSP owns:

- workflow;
- rules;
- prompts;
- schemas;
- legal corpus;
- evidence contracts;
- output validation;
- audit.

LLM provider is only an inference backend.

LLM guardrails:

- Raw source code must not be sent to LLM.
- Full system prompt must not be sent to LLM by default.
- Secret values must not be sent to LLM.
- LLM calls go through LLM Gateway.
- LLM Gateway enforces timeout, retry, token limit, prompt version, model/provider logging and schema validation.
- Rule/gate decisions override LLM output.
- Unsupported legal conclusion is blocked/degraded.

## Security Invariants

- Raw source code must not be sent to LLM.
- Raw source code must not be stored long-term.
- Full system prompt must not be stored by default.
- Secrets must be redacted before persistence/logs/evidence output.
- GitHub App must use least privilege, read-only selected repository access.
- OAuth/OIDC provider token must not be exposed in UI/logs/audit export.
- OAuth/OIDC login must not grant GitHub repository access.
- Repository scan workspace must be temporary and cleaned up after success/failure.
- Evidence reports must be hashable and auditable.
- Legal conclusion requires legal rule/citation trace.
- Classification requires VerifiedProfile.
- Any unresolved conflict blocks classification and final document.
- Audit logs must not contain raw source, secrets or raw provider tokens.

## Audit Requirements

Audit events must cover:

- authentication and OAuth/OIDC login success/failure;
- OAuth/OIDC callback validation failure;
- OAuth account linking/unlink request/completion;
- MFA setup/enable/login failure/login success/disable/reset;
- assessment creation and Wizard submission;
- GitHub repository connection/disconnection;
- Repository Scan requested/started/completed/failed;
- TechnicalEvidenceReport created/rejected/insufficient/ready;
- Schema Gate and Quality Gate result;
- AIUsageFlow generated/unclear/conflict-created;
- Reconciliation started/completed/conflict-found/no-conflict;
- Manager conflict resolution task created/resolved;
- optional Developer clarification requested/submitted if enabled;
- VerifiedProfile created/approved;
- Legal rule retrieval and legal corpus version used;
- Risk Classification started/completed/blocked/degraded;
- Gap Analysis generated;
- Document Generation requested/completed/blocked;
- output guardrail failure;
- permission grant/revocation/denied action;
- configuration/security-relevant changes.

Each audit event should include:

- assessment_id;
- organization_id;
- actor/system;
- actor role;
- action;
- target object;
- timestamp;
- status;
- input reference;
- output hash where applicable;
- blocking reason where applicable;
- model/provider/version and prompt version for LLM calls;
- legal corpus version where applicable.

## Future / Enterprise Scope

Future/Enterprise only:

- Upload Local/CI Scanner Report.
- Manual Technical Evidence JSON.
- Generic manual evidence submission.
- CLI evidence submission.
- CI/CD compliance gate.
- API probing.
- Pull request / push-time enforcement.
- Enterprise SSO.
- SAML federation.
- SCIM provisioning.
- Directory federation.
- Domain-restricted organization login.
- Advanced organization identity policy.
- Legal corpus admin workflow.
- Rule authoring/maintenance workflow.
- Legal update monitoring.
- Automatic reassessment after legal update.

Future scope must not appear in MVP main workflow or active MVP implementation contracts.

## Open Technical Decisions

| Area | Decision Needed Before Implementation | Current Handling |
| --- | --- | --- |
| OAuth/OIDC provider | Which provider(s) are configured for MVP release | Configuration decision; OAuth/OIDC capability is MVP |
| Password login | Whether password login remains active beside OAuth/OIDC for first release | Treat as active if existing auth scope remains |
| Provider MFA vs LCSP MFA | Whether provider MFA can satisfy LCSP MFA | Future enterprise policy; LCSP TOTP remains enforced when enabled |
| Queue technology | RabbitMQ or equivalent queue technology | Use docs' queue abstraction until Phase 1 confirms |
| Vector store | ChromaDB/vector store choice | Use architecture docs; do not introduce new vendor without source |
| Object storage | MinIO/S3-compatible choice | Keep provider-neutral unless source docs decide |
| AIUsageFlow confidence threshold | Exact threshold for blocking/clarification | Validation A2-b required |
| Legal corpus inventory | Exact rules/citations for MVP scenarios | Validation A2 required |
| A1 Wizard fields | Final wording/field completeness | Validation A1 required |
| A3 attestation limits | Whether attestation can unlock any path | Validation A3 required |

## Traceability References

| Concern | Source Reference |
| --- | --- |
| Project summary and MVP workflow | `docs/project/project-overview.md` |
| Product scope and constraints | `docs/product/product-brief.md`, `docs/product/prd.md` |
| OAuth/OIDC MVP decision | `docs/architecture/architecture-decision-records.md` ADR-011 |
| Manager super-role and conflict resolver decision | `docs/architecture/architecture-decision-records.md` ADR-012 |
| Repository Scan-only evidence decision | `docs/architecture/architecture-decision-records.md` ADR-010 |
| Multi-agent/orchestrator pattern | `docs/architecture/multi-agent-system-architecture.md` |
| Domain model | `docs/specs/domain-model.md` |
| State model | `docs/specs/state-machine.md` |
| Evidence report contract | `docs/specs/evidence-report-contract.md` |
| AIUsageFlow design | `docs/specs/ai-usage-flow-analysis-spec.md` |
| Scanner signal taxonomy | `docs/specs/scanner-signal-taxonomy.md` |
| AI usage to legal rule mapping | `docs/specs/ai-usage-rule-mapping-spec.md` |
| Reconciliation policy | `docs/specs/reconciliation-policy.md` |
| Legal rule/citation contract | `docs/specs/legal-rule-citation-contract.md` |
| Use cases and FR/BR/NFR mappings | `docs/design/use-case-specification.md`, `docs/design/functional-requirements.md`, `docs/design/business-rules.md`, `docs/design/non-functional-requirements.md`, `docs/design/traceability-matrix.md` |
| Security/privacy | `docs/security/source-code-privacy-policy.md`, `docs/security/threat-model.md` |
| QA/acceptance | `docs/qa/test-strategy.md`, `docs/qa/acceptance-criteria.md` |
| Readiness status | `docs/implementation-readiness.md` |

## Phase 0 Checkpoint Criteria

Before Phase 1 starts, checkpoint review must confirm:

- No code, backlog, story, sprint or implementation task was created.
- Contract distinguishes OAuth/OIDC Login from GitHub App Connection.
- OAuth/OIDC is active MVP and not Deferred/Future.
- Enterprise SSO/SAML/Federation remains Future/Enterprise.
- Manager is required and sufficient MVP role.
- Developer is optional and not a workflow prerequisite.
- MVP conflict handling routes to Manager, not mandatory Manager+Developer confirmation.
- Repository Scan is the only MVP evidence acquisition path.
- Manual/Local/CI/API evidence paths are Future/Enterprise.
- `AIUsageFlow` sits between `TechnicalProfile` and Reconciliation.
- Unclear usage purpose cannot proceed to final classification.
- Provider/model/framework presence alone cannot create high-risk classification.
- VerifiedProfile is required before classification.
- Missing legal citation blocks/degrades output.
- Raw source/full prompt/secrets are excluded from LLM and audit logs.
- Readiness remains unchanged.

## Readiness Status

Contract status:

```text
PHASE_0_CONTRACT_CREATED
CHECKPOINT_PREVIEW_REQUIRED_BEFORE_PHASE_1
```

Project readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
