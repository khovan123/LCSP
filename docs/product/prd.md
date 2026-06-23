---
title: "LCSP - Conditional Product Requirements Document"
status: "conditional"
created: "2026-06-16"
updated: "2026-06-16"
sources:
  - docs/product/product-brief.md
  - docs/brainstorming/brainstorming-summary.md
  - docs/brainstorming/open-questions.md
  - docs/brainstorming/decision-candidates.md
  - docs/brainstorming/next-step-recommendation.md
  - LCSP_Technical_Specification.html
---

# PRD: LCSP - Legal Compliance Support Platform

## 1. Overview

LCSP là nền tảng hỗ trợ tuân thủ pháp lý cho doanh nghiệp sử dụng AI tại Việt Nam. PRD này mô tả bản **conditional PRD** cho MVP: đủ rõ để tiếp tục discovery, UX, architecture ở mức định hướng, nhưng chưa phải final PRD tuyệt đối vì vẫn còn ba assumption rủi ro cao cần validate.

Định vị bắt buộc: LCSP là **evidence-based compliance platform**, không phải chatbot pháp lý, không phải checklist tự khai đơn giản. Risk classification thật sự chỉ được chạy sau khi có WizardProfile, technical evidence, evidence gates, reconciliation và VerifiedProfile.

PRD này không tạo architecture document, backlog, implementation plan hoặc code. Các quyết định kỹ thuật sâu hơn phải được xử lý ở artifact downstream sau khi PRD được review.

## 2. Goals & Success Metrics

### Product Goals

- Giúp Manager hoàn tất assessment bằng ngôn ngữ nghiệp vụ/pháp lý, không cần hiểu scanner, GitHub Actions hoặc source code.
- Thu thập technical evidence từ Developer theo workflow được Manager dẫn dắt.
- Ngăn hệ thống tạo risk level khi chỉ có self-report từ Wizard.
- Đối chiếu WizardProfile và TechnicalProfile để tạo VerifiedProfile trước classification.
- Đảm bảo final report có audit trail: wizard answers, evidence metadata, conflict resolution, attestation, classification output, legal citation và document version.
- Giữ ranh giới rõ: LCSP hỗ trợ tuân thủ, không thay thế tư vấn pháp lý ràng buộc.

### Success Metrics

- **SM-1: Manager completion quality.** Manager có thể hoàn tất Wizard mà không cần trả lời câu hỏi kỹ thuật trực tiếp. Validates FR-E2-1, FR-E2-2.
- **SM-2: Evidence-gated classification.** 100% risk classification chỉ chạy khi technical evidence pass schema gate, quality gate, reconciliation tạo VerifiedProfile và không còn material/critical conflict unresolved. Validates FR-E4-1 đến FR-E6-4.
- **SM-3: No Wizard-only risk level.** 0 màn hình hoặc report hiển thị HIGH/MEDIUM/LOW khi assessment chỉ ở `SELF_DECLARED_READINESS` hoặc `EVIDENCE_PENDING`. Validates FR-E2-3, FR-E2-4.
- **SM-4: Conflict accountability.** 100% material conflicts có đúng role confirmation và audit trail. Validates FR-E5-3 đến FR-E5-6.
- **SM-5: Report traceability.** Final report trace được risk result về evidence, rule/citation và conflict/attestation nếu có. Validates FR-E6-5, FR-E7-2, FR-E8-5.

### Counter-Metrics

- **SM-C1: Avoid shallow completion.** Không tối ưu completion rate bằng cách bỏ critical Wizard fields.
- **SM-C2: Avoid scanner bypass.** Không tối ưu unlock classification bằng cách cho attestation thay thế metadata khách quan.
- **SM-C3: Avoid false certainty.** Không dùng ngôn ngữ khiến readiness/preliminary indicators bị hiểu là risk classification.

## 3. Target Users

### Manager

Manager là assessment owner. Trong MVP, Manager bao gồm business owner, legal/compliance owner, product owner hoặc người chịu trách nhiệm cuối cùng cho assessment.

Manager owns business/legal truth:

- hệ thống dùng để làm gì;
- ảnh hưởng ai;
- có human review không;
- quyết định nghiệp vụ là gì;
- ý nghĩa pháp lý/nghiệp vụ của technical evidence;
- final assessment confirmation.

### Developer

Developer là technical task participant. Trong MVP, Developer bao gồm developer, tech lead, DevOps, security engineer hoặc người hiểu source code/deployment/evidence.

Developer là optional collaborator trong MVP. Developer không phải điều kiện bắt buộc để hoàn tất assessment, unlock classification hoặc generate final report.

Developer owns technical truth:

- repo/branch/commit có đúng không;
- scanner finding đúng/sai;
- dependency/package có dùng thật không;
- logic có chạy production không;
- technical_profile cần correction gì;
- technical attestation có cấu trúc khi scanner không đủ.

### Non-Users for MVP

- External legal counsel như một role riêng trong sản phẩm.
- Organization Admin/IAM administrator như một role riêng.
- Auditor/regulator portal user.
- Multi-country compliance operator.

## 4. Role & Permission Model

MVP chỉ expose hai role user-facing: `Manager` và `Developer`.

### Manager Permissions

Manager mặc định có toàn quyền trong assessment:

- `CREATE_ASSESSMENT`
- `EDIT_WIZARD`
- `CONNECT_REPOSITORY`
- `RUN_REPOSITORY_SCAN`
- `VIEW_TECHNICAL_FINDINGS`
- `REVIEW_AI_USAGE_FLOW`
- `INVITE_DEVELOPER`
- `ASSIGN_DEVELOPER_POLICY`
- `VIEW_ALL_PROGRESS`
- `RESOLVE_BUSINESS_CONFLICTS`
- `RESOLVE_TECHNICAL_CONFLICTS`
- `FINALIZE_CONFLICT_RESOLUTION`
- `APPROVE_VERIFIED_PROFILE`
- `UNLOCK_CLASSIFICATION_AFTER_GATES`
- `GENERATE_REPORT`
- `EXPORT_AUDIT_TRAIL`

Manager is the required and sufficient role for completing an MVP assessment. Manager can perform every active MVP action that Developer may later receive through delegation.

### Developer Policies

Developer chỉ làm được task/policy được Manager cấp:

- `CONNECT_REPOSITORY`
- `RUN_REPOSITORY_SCAN`
- `VIEW_TECHNICAL_FINDINGS`
- `VIEW_ASSIGNED_REPOSITORY`
- `RESPOND_TO_TECHNICAL_CLARIFICATION`
- `ATTEST_TECHNICAL_CLAIMS`
- `VIEW_ASSIGNED_CONFLICT`
- `VIEW_LIMITED_ASSESSMENT_CONTEXT`

### Developer Restrictions

Developer không được:

- `EDIT_WIZARD_BUSINESS_ANSWERS`
- `FINALIZE_CONFLICT_RESOLUTION`
- `APPROVE_VERIFIED_PROFILE`
- `RUN_FINAL_CLASSIFICATION`
- `GENERATE_FINAL_REPORT`
- `EXPORT_COMPLIANCE_DOSSIER`
- `CHANGE_MANAGER_DECISIONS`
- `INVITE_OTHER_USERS`
- `MANAGE_ASSESSMENT_SETTINGS`

### MVP Conflict Resolution Rule

Trong MVP, mọi conflict được route thành Manager conflict resolution task. Manager reviews WizardProfile, TechnicalProfile và AIUsageFlow evidence, sau đó resolve hoặc update thông tin liên quan. Developer có thể cung cấp technical clarification nếu tồn tại trong hệ thống, nhưng Developer clarification không phải điều kiện bắt buộc để resume workflow.

Post-MVP, Manager may delegate selected technical clarification permissions to Developer, but delegation never removes Manager permissions and Developer technical input does not automatically finalize conflict resolution.

### OAuth/OIDC Login Boundary

OAuth/OIDC user login is an active MVP authentication capability. OAuth/OIDC login dùng để xác thực danh tính người dùng vào LCSP. GitHub App connection dùng để cấp read-only repository access cho Repository Scan. Hai boundary này tách biệt:

| Capability | Purpose |
| --- | --- |
| OAuth/OIDC Login | Đăng nhập/xác thực danh tính người dùng vào LCSP |
| GitHub App Connection | Cấp quyền read-only để LCSP scan repository |
| Repository Scan | Tạo TechnicalEvidenceReport từ repository đã kết nối |

OAuth/OIDC login không tự kết nối GitHub repository, không cấp repository scan permission và không thay thế LCSP authorization/RBAC.

Enterprise SSO/SAML/directory federation remains Deferred/Future unless explicitly activated later.

## 5. End-to-End User Journey

### UJ-1: Manager starts an evidence-based assessment

Manager tạo assessment mới, đăng nhập bằng password/email hoặc OAuth/OIDC, điền Wizard bằng ngôn ngữ nghiệp vụ, xem readiness/preliminary indicators, kết nối GitHub repository và chạy Repository Scan nếu muốn hoàn tất assessment một mình. Giá trị đạt được khi Manager có thể hoàn tất MVP flow mà không cần Developer assignment.

### UJ-2: Developer supplies technical evidence as an assigned task

Developer, nếu được mời, nhận delegated technical task từ Manager, có thể hỗ trợ repository connection, scan review hoặc technical clarification trong scope được cấp. Giá trị đạt được khi Manager có thể nhận thêm technical input mà không mất quyền owner/final resolver.

### UJ-3: Manager resolves a conflict

LCSP phát hiện conflict có thể ảnh hưởng risk level. Orchestrator pause workflow, API tạo Manager conflict resolution task, Manager review WizardProfile, TechnicalProfile và AIUsageFlow, rồi resolve hoặc cập nhật thông tin liên quan. Giá trị đạt được khi VerifiedProfile chỉ được tạo sau khi conflict đã resolve, không phụ thuộc Developer assignment.

### UJ-4: Manager generates final compliance report after classification is unlocked

Sau khi evidence pass gates, reconciliation tạo VerifiedProfile và không còn material/critical conflict unresolved, LCSP chạy Risk Classification Agent, tạo gap analysis và cho Manager generate final report. Giá trị đạt được khi report có risk result, legal citation/rule trace và audit trail.

### UJ-5: Manager exports readiness-only output when evidence is unavailable

Nếu chưa thể cung cấp technical evidence, Manager có thể xuất readiness-only output không có risk level để biết thông tin còn thiếu. Giá trị đạt được là preparation guidance, không phải compliance conclusion.

## 6. MVP Scope

### In Scope

- Manager-led assessment flow.
- OAuth/OIDC user login as active MVP authentication capability.
- Web Wizard cho Manager.
- Standalone Python Worker (`lcsp-scanner-worker`) thực thi Repository Scan độc lập.
- First-class Python static AST/CST analysis (imports, packages, functions, AI usage, I/O patterns).
- TypeScript/JavaScript analysis qua node subprocess adapter tích hợp.
- Kết nối GitHub repository (read-only) và Repository Scan tự động.
- Tích hợp nhà cung cấp LLM thật (Gemini, Claude, hoặc GPT) cho happy-path risk classification và document generation.
- Legal corpus bảo toàn provenance từ nguồn chính phủ chính thức, tổ chức thành các phiên bản `LegalCorpusVersion` bất biến.
- Hybrid retriever kết hợp pgvector (semantic search) và full-text search (FTS) trên PostgreSQL để truy xuất cơ sở pháp lý.
- Lưu trữ tài liệu kết quả bằng real S3-compatible object storage.
- Developer invitation và task/policy assignment as optional collaboration.
- Developer Workspace cho optional technical evidence/clarification tasks.
- Evidence schema completeness gate.
- Context-aware quality threshold gate ở mức MVP.
- Reconciliation giữa WizardProfile, TechnicalProfile và AIUsageFlow.
- Conflict Score, Evidence Confidence Score và AI Intervention Score.
- VerifiedProfile creation sau reconciliation.
- Risk classification chỉ sau VerifiedProfile.
- Gap analysis dựa trên risk result.
- Compliance report/document generation với gating.
- Audit trail cho toàn bộ decision path (bao gồm retrieval audit và model run audit).

### Out of Scope for MVP

- Nộp hồ sơ trực tiếp lên cổng MoST.
- Tư vấn pháp lý ràng buộc thay luật sư.
- Multi-country compliance frameworks.
- Full enterprise IAM hoặc nhiều role riêng ngoài Manager/Developer.
- CI/CD production-grade GitHub Action như default MVP path.
- Public auditor/regulator portal.
- Direct editing of raw legal corpus/rules by end users.
- Final report khi còn material/critical conflict unresolved.
- Enterprise SSO/SAML/directory federation, domain-restricted login, SCIM provisioning hoặc advanced organization identity policy.
- Local/CI scanner report upload hoặc manual technical evidence JSON trong MVP main flow.
- Risk level khi chỉ có Wizard/self-report.
- Deterministic mock LLM gateway làm mặc định cho happy-path classification (chỉ dùng cho tests, offline CI, dev không cấu hình key).
- Local JSONL legal corpus seed làm nguồn dữ liệu chính thức (chỉ dùng làm test fixture).
- Local filesystem artifact storage làm kho lưu trữ chính thức (chỉ dùng cho local development).

## 7. Functional Requirements

### Epic 1 - Assessment Setup & Role Management

**Description:** Manager tạo và sở hữu assessment. Developer chỉ tham gia qua task/policy được Manager cấp.

#### FR-E1-1: Create assessment

Manager can create a new assessment with basic system identity and assessment owner metadata.

**Consequences:**
- New assessment starts in `WIZARD_IN_PROGRESS`.
- Manager is recorded as assessment owner.

#### FR-E1-2: Invite Developer

Manager can invite a Developer to an assessment after or during Wizard completion.

**Consequences:**
- Invited Developer receives only the assigned task context.
- Assessment can move to `DEVELOPER_INVITED`.

#### FR-E1-3: Assign Developer policies

Manager can assign one or more Developer policies: connect repository, run scan, upload evidence, view findings, confirm findings, attest technical claims, resolve technical conflicts, view limited context.

**Consequences:**
- Developer cannot access actions outside assigned policy.
- Policy assignment is logged in audit trail.

#### FR-E1-4: Restrict Manager-only actions

System must prevent Developer from approving VerifiedProfile, running final classification, generating report, editing business Wizard answers, changing Manager decisions, inviting users or managing assessment settings.

**Consequences:**
- Unauthorized Developer action is blocked.
- Blocked action is auditable if attempted.

### Epic 2 - Web Wizard & Self-Declared Readiness

**Description:** Manager provides business/legal truth through Wizard. Wizard-only output is readiness/preliminary indicators, never risk level.

#### FR-E2-1: Capture WizardProfile

Manager can answer Wizard questions covering purpose, sector, data type, user group, user impact, decision role, human oversight, external LLM usage and biometric/high-impact use indicators.

**Consequences:**
- WizardProfile is created after submission.
- Each Wizard answer maps to a WizardProfile field.
- Critical WizardProfile fields are explicitly tracked for completeness and reconciliation use.

#### FR-E2-2: Use business language

Wizard questions must be phrased in business/legal language and avoid code-centric terms such as dependency, model call, CI, scanner, repo, API probe or AST unless hidden behind explanation.

**Consequences:**
- Critical questions include examples or help text.
- Progressive disclosure is used for complex questions.

#### FR-E2-3: Show readiness without risk level

When technical evidence is missing, system shows readiness checklist, missing evidence and preliminary indicators only.

**Consequences:**
- System must not show HIGH/MEDIUM/LOW.
- System must not use wording equivalent to "preliminary risk level".

#### FR-E2-4: Set Wizard-only state

After Wizard submission without technical evidence, system sets:

```text
mode = SELF_DECLARED_READINESS
classification_status = LOCKED_EVIDENCE_REQUIRED
risk_level = not_available
```

**Consequences:**
- Risk Classification Agent remains locked.
- Manager receives evidence collection next steps.

### Epic 3 - Technical Evidence Collection

**Description:** Manager provides MVP technical evidence by connecting GitHub repository and running Repository Scan. Developer may assist only as optional delegated collaborator; enterprise-safe alternatives are Deferred/Future.

#### FR-E3-1: GitHub App read-only evidence path

Manager can connect selected repository and run read-only scan for own assessment. Developer may do the same only when delegated `CONNECT_REPOSITORY` and `RUN_REPOSITORY_SCAN`.

**Consequences:**
- Raw source code must not be sent to LLM.
- Raw source code must not be stored long term.
- Evidence report must include provenance metadata.

#### FR-E3-2: Local/CI evidence upload

Developer with `UPLOAD_EVIDENCE` can upload Local/CI scanner report.

**Consequences:**
- Uploaded report must go through schema completeness gate.
- Uploaded report must include source type and provenance.

#### FR-E3-3: Manual technical evidence JSON upload

Developer with `UPLOAD_EVIDENCE` can upload manual technical evidence JSON when scanner runs outside LCSP or dynamic/wrapper logic is not detected automatically.

**Consequences:**
- Manual evidence must be structured.
- Free-text comment cannot unlock classification.

#### FR-E3-4: Privacy flags validation

System validates privacy flags for every technical evidence report.

**Consequences:**
- Evidence is rejected if privacy flags indicate raw source uploaded/stored improperly, full AST uploaded when disallowed, raw source sent to LLM, or secrets not redacted where required.

#### FR-E3-5: Human technical attestation as supplement

Developer can provide structured human technical attestation only as controlled evidence supplement.

**Consequences:**
- Attestation requires role-bound claims, scope, reason, supporting evidence refs where available and signed timestamp.
- Attestation cannot replace machine-generated metadata listed in A3.

### Epic 4 - Evidence Quality Gate

**Description:** LCSP checks whether evidence is structurally acceptable and sufficient for classification.

#### FR-E4-1: Schema completeness gate

System validates required evidence report groups: `assessment_id`, `source_type`, `system_identifier`, `provenance`, `scanner_version` or `report_version`, timestamp/generated_at, scope, privacy_flags, technical_profile, findings array, confidence_per_signal and report_hash.

**Consequences:**
- Missing required schema results in `TECHNICAL_EVIDENCE_REJECTED`.
- Rejected evidence cannot enter reconciliation.

#### FR-E4-2: Technical profile dimensions

System requires technical_profile to include four dimensions: AI usage signals, data type signals, decision flow signals and human oversight signals.

**Consequences:**
- Each dimension may be DETECTED, NOT_DETECTED or UNKNOWN.
- Missing dimension causes rejection or insufficient status depending on severity.

#### FR-E4-3: Quality threshold gate

System evaluates evidence quality according to Wizard context.

**Consequences:**
- Valid schema but low quality results in `TECHNICAL_EVIDENCE_INSUFFICIENT`.
- Passing schema and quality results in `TECHNICAL_EVIDENCE_READY`.

#### FR-E4-4: Context-aware threshold

Evidence requirement changes by scenario criticality. Internal chatbot, public chatbot, finance credit scoring, healthcare diagnosis and biometric use case must not use identical minimum evidence expectations.

**Consequences:**
- High-impact contexts require stronger evidence for data type, decision flow and human oversight.
- Low-impact contexts may unlock with narrower evidence if no material conflict exists.

### Epic 5 - Reconciliation

**Description:** LCSP compares WizardProfile and TechnicalProfile to create conflicts, route confirmations and produce VerifiedProfile only after required resolution.

#### FR-E5-1: Compare WizardProfile and TechnicalProfile

System compares business/legal answers with technical evidence across critical fields such as AI usage, data types, decision flow, human oversight, external LLM, biometric/high-impact use and production scope.

**Consequences:**
- Conflict records include field, Wizard value, technical evidence value, evidence refs, score and required resolver.

#### FR-E5-2: Generate Conflict Score

System computes Conflict Score for each conflict.

**Consequences:**
- Conflict Score is the only score that can block workflow.
- Evidence Confidence Score and AI Intervention Score are supporting signals only.

#### FR-E5-3: Route technical conflicts to Manager

Technical conflicts such as dependency use, false positive/negative, repo/branch/commit or production scope are routed to Manager in MVP. Manager may request re-scan/correction or optional delegated Developer clarification, but Developer action is not required to resume the MVP workflow.

**Consequences:**
- Manager is the final resolver for MVP technical conflicts.
- Optional Developer clarification is input only and cannot unlock classification by itself.
- Resolution is audited.

#### FR-E5-4: Route business/legal conflicts to Manager

Business/legal conflicts such as purpose, affected users, human review process or legal meaning are routed to Manager.

**Consequences:**
- Manager can resolve business/legal truth.
- Resolution is audited.

#### FR-E5-5: Manager resolves MVP conflicts

Any conflict that can affect risk level creates a Manager conflict resolution task. Manager resolution is required and sufficient to resume MVP workflow when evidence is adequate.

**Consequences:**
- Final classification remains blocked until Manager resolves the conflict and reconciliation passes.
- LCSP must not infer final truth without required confirmation.

#### FR-E5-6: Block critical unresolved conflicts

Critical conflicts remain blocking until resolved.

**Consequences:**
- No final report is generated while critical conflict is unresolved.
- Assessment state remains `RECONCILIATION_REQUIRED`, `CONFLICT_RESOLUTION_REQUIRED` or `MANAGER_CONFIRMATION_REQUIRED`.
- `DEVELOPER_CONFIRMATION_REQUIRED` is not an MVP blocking state; delegated Developer clarification is optional/post-MVP and cannot unlock classification by itself.

### Epic 6 - Verified Profile & Risk Classification

**Description:** LCSP creates VerifiedProfile only after reconciliation and runs Risk Classification only after all gates pass.

#### FR-E6-1: Create VerifiedProfile

System creates VerifiedProfile from WizardProfile, TechnicalProfile and resolved conflicts.

**Consequences:**
- VerifiedProfile cannot be created with unresolved material/critical conflict.
- VerifiedProfile version is auditable.

#### FR-E6-2: Lock classification until conditions pass

Risk Classification Agent remains locked until WizardProfile submitted, technical evidence received, schema gate passed, quality gate passed, VerifiedProfile exists and no material/critical conflict remains unresolved.

**Consequences:**
- Wizard-only assessments never trigger Risk Classification Agent.
- Evidence-pending assessments never show risk level.

#### FR-E6-3: Produce evidence-based risk output

When unlocked, Risk Classification Agent produces risk result with risk level, confidence, triggered rules, legal refs and trace to retrieved/legal-approved sources.

**Consequences:**
- Output must include rule/citation trace.
- Every risk output must trace to `rule_id` where a structured rule applies.
- Output without sufficient legal trace is not final.

#### FR-E6-4: Degrade or block when legal rule/citation is missing

If required legal rule or citation is missing, classification must be degraded or blocked rather than presented as final.

**Consequences:**
- System surfaces missing legal basis.
- Gap analysis and final report cannot rely on unsupported classification.
- LLM must not create legal conclusion when retrieved legal rule/citation is missing for a required conclusion.

#### FR-E6-5: Preserve rule precedence

Hard legal/compliance rules take precedence over LLM interpretation.

**Consequences:**
- LLM output cannot lower risk below hard-rule floor.
- Triggered hard rules are shown in trace.

### Epic 7 - Gap Analysis & Document Generation

**Description:** LCSP uses risk result and legal obligations to create gap analysis and compliance report, subject to gating.

#### FR-E7-1: Generate gap analysis after risk result

System generates gap analysis only after valid evidence-based risk classification exists.

**Consequences:**
- Gap items reference applicable obligations and evidence status.
- Gap analysis is not generated from Wizard-only readiness.

#### FR-E7-2: Generate compliance document/report

Manager can generate compliance document/report only when classification and gap analysis are valid and no material/critical conflict remains unresolved.

**Consequences:**
- Report includes classification, gap summary, legal refs, evidence trace and audit summary.
- Report cannot be generated as final from `SELF_DECLARED_READINESS`.

#### FR-E7-3: Support readiness-only export

Manager may export readiness-only output when technical evidence is unavailable.

**Consequences:**
- Readiness-only output contains missing evidence checklist and preliminary indicators.
- Readiness-only output does not contain HIGH/MEDIUM/LOW.

#### FR-E7-4: Disclose attestation use

If classification used human technical attestation because automated scanner evidence was insufficient, report must disclose that.

**Consequences:**
- Disclosure includes who attested, what was attested, when, based on which evidence and which conflict was resolved.

### Epic 8 - Audit Trail

**Description:** LCSP records every material input, decision and generated artifact required to trace assessment outcome.

#### FR-E8-1: Audit Wizard answers

System records Wizard answers, timestamps and Manager identity.

**Consequences:**
- Later edits are versioned.
- Audit can distinguish original and updated answers.

#### FR-E8-2: Audit technical evidence metadata

System records evidence source type, provenance, scanner/report version, ruleset version where applicable, timestamp, scope, privacy flags, report hash and evidence status.

**Consequences:**
- Evidence can be traced to source and version.
- Missing metadata prevents final classification.

#### FR-E8-3: Audit conflict resolution

System records conflict score, conflict type, resolver role, decision, rationale and timestamps.

**Consequences:**
- Conflict resolution shows Manager final resolution and any optional delegated clarification used as input.

#### FR-E8-4: Audit human technical attestation

System records attestation claims, role, scope, reasons, supporting evidence refs and signed timestamp.

**Consequences:**
- Attestation cannot be a free-text bypass.

#### FR-E8-5: Audit classification and generated documents

System records classification output, rule/citation trace, gap analysis output, generated document version and report/export timestamp.

**Consequences:**
- Final report can trace back to evidence, rules and decisions.

## 8. Non-Functional Requirements

### Product-Level Security and Privacy

- NFR-1: Raw source code must not be sent to LLM.
- NFR-2: Raw source code must not be stored long term.
- NFR-3: GitHub App access must be read-only and limited to selected repositories for MVP default path.
- NFR-4: Technical findings shown to Manager must avoid unnecessary source/code exposure.
- NFR-5: Secrets must be redacted before any evidence snippet or summary is stored.

### Reliability and Governance

- NFR-6: Risk classification must be repeatable for the same VerifiedProfile, legal corpus/rule version and evidence version.
- NFR-7: Every final report must be traceable to assessment, evidence, rules, conflict resolutions and document version.
- NFR-8: Legal corpus/rule version used for classification must be recorded.
- NFR-9: System must fail closed for missing critical evidence, missing legal trace or unresolved material conflict.

### Usability

- NFR-10: Manager-facing language must avoid technical implementation terms unless accompanied by plain-language explanation.
- NFR-11: Developer-facing tasks must include enough assessment context to act without exposing unnecessary business data.
- NFR-12: Evidence statuses must be understandable to both Manager and Developer.

### Accessibility and Localization

- NFR-13: MVP UI copy and documents should support Vietnamese as primary language.
- NFR-14: Web UI should target common accessibility expectations for forms, status messages and document review.

## 9. Status / State Model

PRD-level state model:

- `WIZARD_IN_PROGRESS`: Manager đang điền Wizard.
- `SELF_DECLARED_READINESS`: Wizard submitted, chưa có technical evidence, chỉ readiness/preliminary indicators.
- `TECHNICAL_EVIDENCE_REQUIRED`: Cần GitHub Repository Scan result; Manager can complete this path without Developer assignment.
- `DEVELOPER_INVITED`: Manager đã mời Developer.
- `EVIDENCE_COLLECTION_IN_PROGRESS`: Legacy umbrella state; MVP uses Manager-owned repository connection/scan states.
- `TECHNICAL_EVIDENCE_MISSING`: Chưa có report.
- `TECHNICAL_EVIDENCE_REJECTED`: Report thiếu schema hoặc vi phạm privacy.
- `TECHNICAL_EVIDENCE_INSUFFICIENT`: Report hợp lệ nhưng quality thấp.
- `TECHNICAL_EVIDENCE_READY`: Report đủ schema và đạt quality.
- `RECONCILIATION_REQUIRED`: Có conflict cần xử lý.
- `CONFLICT_RESOLUTION_REQUIRED`: Có conflict, cần Manager xử lý trước khi classification.
- `MANAGER_CONFIRMATION_REQUIRED`: Cần Manager resolve conflict hoặc confirm business/legal/technical interpretation.
- `DEVELOPER_CONFIRMATION_REQUIRED`: Legacy/post-MVP optional delegated clarification; không phải MVP blocking state.
- `VERIFIED_PROFILE_READY`: VerifiedProfile đã sẵn sàng.
- `READY_FOR_CLASSIFICATION`: Đủ điều kiện chạy Risk Classification Agent.
- `CLASSIFIED`: Risk classification hoàn tất với legal trace.
- `GAP_ANALYZED`: Gap analysis hoàn tất.
- `REPORT_READY`: Có thể generate final report.
- `BLOCKED_BY_CONFLICT`: Có material/critical conflict chưa resolve.

## 10. Scoring Model

### Evidence Confidence Score

Purpose: evidence kỹ thuật đáng tin tới đâu.

Rules:

- Supporting signal only.
- Không tự block workflow.
- Có thể kích hoạt Manager conflict resolution nếu cao và mâu thuẫn với Wizard.

### AI Intervention Score

Purpose: AI can thiệp sâu tới đâu vào workflow/decision.

Rules:

- Supporting signal only.
- Không tự block workflow.
- Dùng làm input cho classification sau VerifiedProfile.

### Conflict Score

Purpose: WizardProfile và TechnicalProfile mâu thuẫn nghiêm trọng không.

Rules:

- Score duy nhất có thể block workflow.
- Material conflict threshold candidate: `>= 0.75`.
- Critical conflict threshold candidate: `>= 0.85` trên critical fields.

Critical fields:

- `auto_decision`
- `data_types`
- `sector`
- `ai_type`
- `human_oversight`
- `external_llm_user_facing`
- `biometric_processing`

Blocking rule:

```text
Conflict Score >= 0.75
AND conflict ảnh hưởng đến risk classification hoặc nghĩa vụ pháp lý
```

## 11. Evidence Requirements

### Minimum Evidence Sources

Accepted evidence sources for MVP/near-MVP:

- GitHub App read-only scan.
- Local/CI scanner report.
- Manual technical evidence JSON.
- API probe result, if available.
- Structured human technical attestation as supplement.

### Minimum Evidence Schema Groups

Technical evidence report must include:

- `assessment_id`
- `source_type`
- `system_identifier`
- `provenance`
- `scanner_version` or `report_version`
- `timestamp` or `generated_at`
- `scope`
- `privacy_flags`
- `technical_profile`
- `findings[]`
- `confidence_per_signal`
- `report_hash`

### Minimum Technical Profile Dimensions

`technical_profile` must include:

- `ai_usage_signals`
- `data_type_signals`
- `decision_flow_signals`
- `human_oversight_signals`

Each dimension may be `DETECTED`, `NOT_DETECTED` or `UNKNOWN`, but the field must exist.

### Attestation Guardrails

Human technical attestation can supplement low-quality scanner evidence only if:

- source type is structured as human technical attestation;
- attester is authorized Developer;
- claims are role-bound and structured;
- claim scope includes relevant system/repo/branch/commit/environment where applicable;
- reason is provided per claim;
- supporting evidence refs are included where available;
- signed timestamp is recorded;
- audit trail records who, what, when, why and based on which evidence.

Attestation cannot replace these machine-generated or external metadata:

- report hash;
- scanner version;
- ruleset version;
- scan timestamp;
- repo/commit metadata;
- privacy flags generated by scanner;
- dependency inventory/SBOM;
- legal corpus version;
- evidence report integrity;
- machine-generated privacy flags;
- vendor compliance documents.

## 12. Reconciliation Rules

- LCSP compares WizardProfile, TechnicalProfile and AIUsageFlow only after technical evidence is accepted for reconciliation.
- Any MVP conflict pauses workflow and creates a Manager conflict-resolution task.
- Manager reviews WizardProfile, TechnicalProfile and AIUsageFlow evidence, then resolves or updates relevant information.
- Manager remains final resolver for technical, business/legal and cross-boundary MVP conflicts.
- Developer may provide technical clarification if assigned, but Developer is not required to resume MVP workflow.
- LCSP coordinates and records the process but does not act as the human authority.
- VerifiedProfile cannot be created while any conflict remains unresolved.
- Every conflict resolution must be auditable.

Examples:

- Scanner detects dependency/package AI use: Manager resolves or requests re-scan/correction.
- Scanner false positive/false negative: Manager resolves with evidence review; optional Developer clarification may be requested post-MVP.
- Wizard business purpose is wrong: Manager resolves.
- AI affects decision/workflow: Manager resolves using WizardProfile, TechnicalProfile and AIUsageFlow evidence.
- Auto decision or human oversight conflict: Manager resolves; optional Developer clarification does not finalize the conflict.

## 13. Reporting Rules

- Final report cannot be generated before evidence-based classification and gap analysis are valid.
- Final report cannot be generated while material/critical conflict remains unresolved.
- Readiness-only export is allowed without technical evidence but must not include HIGH/MEDIUM/LOW.
- Classification output must include legal citation/rule trace.
- If required legal rule/citation is missing, classification must be degraded or blocked, not finalized.
- If classification uses human technical attestation, report must disclose that.
- Report must include enough audit summary to trace major decisions.

## 14. Audit Trail Expectations

LCSP audit trail must record:

- Wizard answers and versions.
- Assessment owner and Developer task policies.
- Evidence source metadata.
- Scanner/report version and ruleset version where applicable.
- Report hash and timestamp.
- Scope and privacy flags.
- Evidence gate result and reason.
- Conflict records, score and required resolver.
- Manager conflict resolutions and any optional delegated technical clarification.
- Human technical attestation claims.
- VerifiedProfile version.
- Classification output and rule/citation trace.
- Gap analysis output.
- Generated document version and export timestamp.

Audit trail must support the question: "Why did LCSP reach this conclusion, based on what evidence, under which rules, and who confirmed unresolved ambiguity?"

## 15. High-Risk Assumptions & Validation Requirements

### A1. Wizard simplicity vs completeness

**Risk:** Wizard quá đơn giản thì thiếu business/legal truth. Wizard quá chi tiết thì Manager không hoàn tất được hoặc phải cần Developer hỗ trợ.

**PRD Requirements:**

- Wizard question design must use business/legal language, not code terms.
- Wizard must use progressive disclosure for complex topics.
- Wizard must include examples for high-risk fields such as auto decision, human review, affected rights, personal/sensitive data, external LLM and biometric use.
- Every Wizard question must map to a WizardProfile field.
- Wizard must capture enough critical fields for MVP:
  - purpose;
  - sector;
  - data type;
  - user group;
  - user impact;
  - decision role;
  - human oversight;
  - external LLM usage.
- Every required WizardProfile field must map to reconciliation use, classification use, document output or compliance trace.
- Critical unknown answers must route to evidence/readiness tasks rather than silently becoming final input.

**Validation Plan:**

- Prototype Wizard question set for at least public chatbot, credit scoring and internal HR screening.
- Test with non-technical Manager-like users.
- Measure completion, confusion points and fields requiring Developer help.
- Revise Wizard before final PRD acceptance if users cannot answer critical fields.

### A2. Legal corpus/rule reliability

**Risk:** Classification is weak if legal rules are not versioned, cited and traceable. LCSP must not let LLM infer law without legal basis.

**PRD Requirements:**

- Classification output must include citation from legal corpus/rules.
- Legal rules must be versioned.
- Important rules must trace to legal source.
- Every important risk output must trace to a `rule_id`.
- Legal corpus/rule version must be recorded in audit.
- If rule/citation is missing for a required conclusion, classification must be degraded or blocked.
- LLM must not create legal conclusion if retrieved legal rule/citation is missing.
- LLM output cannot override hard rules or invent legal references outside approved sources.

**Validation Plan:**

- Define MVP legal corpus inventory.
- Draft sample compliance rules for representative scenarios.
- Create scenario/evaluation fixtures with expected risk, rules and citations.
- Validate citation accuracy before final PRD signoff for classification scope.

### A3. Human attestation abuse risk

**Risk:** Developer/Manager could use attestation to legitimize weak evidence.

**PRD Requirements:**

- Attestation must have schema.
- Attestation claims must be role-bound.
- Manager can confirm only business/legal meaning.
- Manager is the final reviewer for classification-relevant attestation in MVP.
- Developer can provide technical clarification only when delegated, and that clarification does not finalize conflict resolution.
- Attestation must include provenance, scope, reason and timestamp.
- Attestation cannot replace machine-generated or external metadata:
  - report hash;
  - scanner version;
  - ruleset version;
  - scan timestamp;
  - repo/commit metadata;
  - legal corpus version;
  - evidence report integrity;
  - machine-generated privacy flags.
- Report must disclose if classification used human technical attestation.
- Audit trail must store the full attestation record.

**Validation Plan:**

- Define attestation claim schema.
- Define allowed Developer claims and Manager confirmations.
- Test abuse cases: "bỏ qua scanner", unsupported claim, missing provenance, manager-only technical override.
- Require product review before attestation can unlock classification in critical contexts.

## 16. Open Questions

### Wizard

- Minimum business/legal truth required for MVP classification is not fully validated.
- Exact Wizard field list and wording still need user testing.
- Behavior for Manager "I don't know" on critical fields needs final product decision.

### Legal Corpus and Rules

- MVP legal corpus inventory needs confirmation.
- Minimum compliance rule schema needs confirmation.
- Rule review/approval owner is not yet defined.
- Behavior for incomplete legal corpus in a scenario needs final decision.

### Evidence and Scanner

- GitHub App read-only acceptance by target MVP users needs validation.
- Scope coverage for monorepos needs definition.
- Stale evidence behavior when commit/branch changes needs decision.
- API probe evidence trust model needs decision.

### Attestation

- Exact list of Developer-attestable claims needs confirmation.
- Confidence impact of attestation needs decision.
- Policy for excessive attestation use needs decision.

### Reporting

- Exact contents of readiness-only export need definition.
- Exact disclosure text for attestation-assisted classification needs review.

## 17. Acceptance Criteria

### Product Acceptance Criteria

- AC-1: A Wizard-only assessment never displays HIGH/MEDIUM/LOW.
- AC-2: Risk Classification Agent cannot run before VerifiedProfile exists.
- AC-3: Technical evidence must pass schema completeness gate before reconciliation.
- AC-4: Technical evidence must pass quality threshold gate before classification unlock.
- AC-5: Any unresolved conflict blocks final classification/report until resolved.
- AC-6: Manager conflict resolution is required and sufficient for MVP conflict completion when evidence gates pass.
- AC-7: Evidence Confidence Score and AI Intervention Score never block workflow alone.
- AC-8: Conflict handling uses binary MVP routing: conflict exists or not. Conflict Score may explain seriousness but does not create multiple routes.
- AC-9: Human technical attestation cannot replace machine-generated metadata listed in A3.
- AC-10: Final report includes legal citation/rule trace or is not final.
- AC-11: Final report discloses human technical attestation when used for classification.
- AC-12: Audit trail records wizard, evidence, conflict, attestation, classification and document generation events.

### PRD Acceptance Criteria

- AC-13: PRD preserves all mandatory product decisions from Product Brief.
- AC-14: PRD contains section for high-risk assumptions and validation requirements.
- AC-15: PRD does not define architecture, backlog or code.
- AC-16: PRD is clear enough for Architect Agent to identify product constraints and unresolved assumptions.

## 18. PRD Readiness for Architecture

**Current status:** Conditional PRD is ready for architecture exploration only with explicit caveats. It is not a final PRD that should be treated as fully validated.

Architecture may proceed to explore system boundaries and feasibility only if it preserves these non-negotiable product constraints:

- no risk level without technical evidence;
- no Risk Classification before VerifiedProfile;
- no human attestation bypass for machine-generated metadata;
- any unresolved conflict blocks classification/report until Manager resolution is complete;
- Wizard-only remains readiness/preliminary indicators only.

Before final architecture signoff, product must validate or carry forward these blockers:

1. Wizard question model can collect enough business/legal truth without technical wording.
2. Legal corpus/rule reliability can support cited, traceable classification.
3. Human attestation guardrails prevent evidence bypass.

Recommended next step:

```text
Proceed to architecture discovery only as conditional, with A1-A3 tracked as validation requirements.
Do not create implementation backlog until A1-A3 have owner, validation method and acceptance threshold.
```
