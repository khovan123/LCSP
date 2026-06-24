# LCSP Validation Plan for High-Risk Assumptions

## Purpose

Tài liệu này khóa cách validate ba assumption rủi ro cao A1-A3 trước khi LCSP dùng Conditional PRD làm input cho Architecture Exploration hoặc backlog/implementation planning.

Mục tiêu không phải tạo architecture, backlog hay code. Mục tiêu là làm rõ owner, validation method, sample/test case, acceptance threshold, failure condition và PRD update trigger để các assumption quan trọng không bị coi như đã được giải quyết.

Nguồn chính:

- `docs/product/prd.md`
- `docs/product/system-context.md`
- `docs/product/business-rules.md`
- `docs/planning-artifacts/sprint-change-proposal-2026-06-24-phase-5-2l.md`
- `docs/specs/functional-requirements.md`
- `docs/specs/acceptance-criteria-catalog.md`
- `docs/specs/requirements-traceability-matrix.md`

## Validation Scope

Validation scope chỉ bao gồm ba assumption:

- **A1 - Wizard simplicity vs completeness**
- **A2 - Legal corpus / rule reliability**
- **A3 - PBAC and trusted-trigger abuse risk**

Ngoài scope:

- Không chọn thêm tech stack.
- Không thiết kế architecture.
- Không tạo backlog.
- Không viết code.
- Không mở rộng MVP scope ngoài Conditional PRD.

## Assumption Validation Matrix

| Assumption | Risk | Owner | Validation Method | Acceptance Threshold | Failure Condition | PRD Update Trigger |
|---|---|---|---|---|---|---|
| A1 - Wizard simplicity vs completeness | Wizard quá đơn giản thì thiếu business/legal truth; quá chi tiết thì Manager không hoàn tất hoặc cần Developer hỗ trợ | Product Manager, phối hợp UX/Domain Reviewer | Wizard question review, WizardProfile mapping, scenario walkthrough, user testing với Manager persona | Manager hiểu câu hỏi không cần Developer; Wizard capture đủ critical fields; mỗi câu hỏi quan trọng map được về WizardProfile | Manager không hiểu câu hỏi; thiếu critical field; câu hỏi dùng thuật ngữ code; câu hỏi không map được field | Sửa Wizard scope, wording, progressive disclosure, field model hoặc readiness behavior trong PRD |
| A2 - Legal corpus / rule reliability | Classification yếu nếu legal rules không versioned/cited/traceable; LLM suy luận luật không có căn cứ; scanner + AI Usage Flow có thể map sai usage purpose sang legal corpus/rule | Product Manager, phối hợp Legal/Domain Rule Owner và AI Usage Flow Reviewer | Rule inventory review, rule-to-source trace test, scenario classification trace test, citation audit, AIUsageFlow-to-rule mapping test | 100% critical classification rules có legal source, citation, version/effective date nếu có, rule_id; 100% risk output trace được rule_id; A2-b usage-purpose mapping đạt acceptance threshold | Rule thiếu citation/version/source; risk output thiếu rule trace; LLM tạo conclusion không có retrieved rule/citation; usage purpose map sai rule/corpus hoặc confidence/uncertainty không được ghi | Sửa classification requirements, legal corpus scope, rule schema, AIUsageFlow contract, degraded/blocked behavior trong PRD |
| A3 - PBAC and trusted-trigger abuse risk | PBAC policy, delegated scope, service identity hoặc automatic trusted scan trigger bị dùng để bypass tenant boundary, scan sai repository/assessment, hoặc hợp thức hóa evidence yếu | Product Manager, phối hợp Compliance/Governance Reviewer, Architect/Platform Reviewer và Scanner Owner | PBAC policy review, subject/resource/action/context trace review, trusted-trigger mapping test, duplicate/out-of-order trigger abuse-case testing, audit trail inspection | 100% material actions có PBAC decision trace; 100% trusted triggers resolve tenant/repository/assessment/branch/commit safely or block/wait; 0 scan starts on missing/ambiguous mapping; 0 role label/delegation/service identity bypasses evidence/classification gates | Role label được coi là authority; Developer/service identity vượt policy scope; trigger thiếu/ambiguous mapping vẫn scan; duplicate/out-of-order trigger tạo artifact sai; audit thiếu policy/version/correlation trace | Sửa PBAC requirements, automatic trigger lifecycle, scanner evidence gates, blocking rules, audit requirements hoặc PRD scope |

## A1 - Wizard Simplicity vs Completeness

### Why This Is High Risk

Manager là entry point chính của LCSP. Nếu Wizard hỏi quá kỹ thuật, Manager không hoàn tất được hoặc phải kéo Developer vào quá sớm. Nếu Wizard hỏi quá nông, WizardProfile thiếu business/legal truth, làm Reconciliation, VerifiedProfile, Risk Classification, Gap Analysis và Document Generation lệch từ đầu.

### Data to Validate

- Danh sách câu hỏi Wizard dự kiến.
- Mapping từ câu hỏi sang WizardProfile field.
- Mapping từ WizardProfile field sang reconciliation/classification/document output.
- Cách diễn đạt câu hỏi và help text.
- Hành vi khi Manager chọn "không biết" hoặc bỏ trống field quan trọng.

Critical fields bắt buộc phải được capture hoặc route rõ:

- `purpose`
- `sector`
- `data_type`
- `user_impact`
- `decision_role`
- `human_oversight`
- `external_llm_usage`

### Owner

- **Primary owner:** Product Manager.
- **Supporting reviewers:** UX reviewer, legal/domain reviewer, technical reviewer khi câu hỏi cần liên kết với evidence.

### Validation Method

- Review từng Wizard question theo Manager persona.
- Kiểm tra câu hỏi có dùng ngôn ngữ nghiệp vụ, không dùng thuật ngữ code như dependency, model call, CI, scanner, repo, API probe hoặc AST.
- Kiểm tra mỗi câu hỏi quan trọng map được về một WizardProfile field cụ thể.
- Kiểm tra mỗi critical field có ít nhất một câu hỏi hoặc một route thu thập rõ.
- Chạy scenario walkthrough với:
  - Internal AI chatbot.
  - Credit scoring / loan approval.
  - HR screening / recruitment AI.
- User testing với 2-3 người đóng vai Manager không chuyên kỹ thuật.

### Sample User / Test Case

- **Internal AI chatbot:** Manager cần mô tả purpose, user group, external LLM usage, data type và human oversight mà không cần hiểu implementation.
- **Credit scoring / loan approval:** Manager cần xác định decision role, affected benefits, human oversight và data type.
- **HR screening / recruitment AI:** Manager cần xác định user impact, decision role, sensitive data và human review process.

### Acceptance Threshold

Pass khi tất cả điều kiện sau đạt:

- Manager hiểu câu hỏi mà không cần Developer giải thích trong các scenario test.
- Wizard capture đủ các critical fields: purpose, sector, data type, user group, user impact, decision role, human oversight, external LLM usage.
- 100% câu hỏi quan trọng map được về WizardProfile field.
- 100% required WizardProfile field map được về reconciliation use, classification use, document output hoặc compliance trace.
- Câu hỏi khó có ví dụ hoặc progressive disclosure.
- Critical unknown không silently trở thành final input; nó tạo readiness/evidence task hoặc open conflict.

### Failure Condition

Fail nếu một trong các điều kiện sau xảy ra:

- Manager không hiểu câu hỏi nếu không có Developer giải thích.
- Câu hỏi dùng thuật ngữ code mà không có giải thích nghiệp vụ.
- Thiếu một critical field bắt buộc.
- Một câu hỏi quan trọng không map được về WizardProfile.
- Wizard tạo cảm giác đã classification trong khi chỉ có self-report.
- "Không biết" ở critical field vẫn cho flow đi tiếp như input final.

### If Failed, What PRD Must Change

- Sửa wording Wizard requirements.
- Thêm progressive disclosure hoặc examples.
- Sửa WizardProfile field model.
- Sửa readiness behavior cho unknown critical fields.
- Sửa functional requirements ở Epic 2 và Epic 5 nếu thiếu route reconciliation.
- Cập nhật Open Questions nếu chưa thể chốt field/question.

## A2 - Legal Corpus / Rule Reliability

### Why This Is High Risk

LCSP không thể là evidence-based compliance platform nếu Risk Classification chỉ dựa vào LLM tự suy luận luật. Technical evidence có thể đúng, nhưng classification vẫn yếu nếu legal corpus/rules không versioned, cited, traceable và mapping rõ vào risk criteria.

### Data to Validate

- MVP legal corpus inventory.
- Compliance rules draft.
- Rule schema.
- Mapping từ rule_id sang legal source/citation.
- Mapping từ risk output sang rule_id.
- Legal corpus/rule version.
- Scenario evaluation set.
- AIUsageFlow fixtures từ repository scan cho từng scenario.
- Expected usage-purpose to legal-rule mapping.

### Owner

- **Primary owner:** Product Manager.
- **Supporting reviewers:** Legal/domain rule owner, AI/classification reviewer, QA/evaluation owner.

### Validation Method

- Mỗi classification rule phải được review để có legal source/citation.
- Mỗi `rule_id` phải trace được về legal document, version và effective date nếu có.
- Mỗi risk output trong scenario evaluation phải trace được về `rule_id`.
- Chạy scenario trace test cho ít nhất:
  - Internal AI chatbot.
  - Credit scoring / loan approval.
  - HR screening / recruitment AI.
- Kiểm tra degraded/blocked behavior khi legal rule/citation thiếu.
- Kiểm tra LLM không tạo legal conclusion nếu thiếu retrieved legal rule/citation.
- Kiểm tra A2-b: scanner + AI Usage Flow Analysis có đủ chính xác để map usage purpose sang legal rule/corpus không.

### A2-b - Scanner + AI Usage Flow to Legal Rule Mapping

Question:

```text
Scanner + AI Usage Flow Analysis có đủ chính xác để map usage purpose sang legal rule/corpus không?
```

Why this matters:

Legal corpus có thể đúng và có citation, nhưng LCSP vẫn sẽ classification sai nếu AIUsageFlow hiểu sai business purpose. Ví dụ repo có OpenAI API không đồng nghĩa high risk; cần biết AI dùng để summarize nội bộ, rank ứng viên, score khoản vay hay auto approve/reject.

Data to validate:

- Scanner findings for AI input/output/decision-flow/human-review/user-impact/domain-context signals.
- AIUsageFlow output: `business_process`, `ai_purpose`, `automation_level`, `affected_subjects`, `ai_input_types`, `human_review`, `potential_harm_categories`, `evidence_refs`, `confidence`.
- Expected legal corpus/rule set for each usage scenario.
- Ground-truth scenario label reviewed by Product + Legal/Domain Rule Owner.

Validation method:

1. Prepare labeled scenario fixtures for at least:
   - Internal summarization / internal assistant.
   - Loan approval / credit scoring.
   - HR screening / recruitment ranking.
   - Customer-facing chatbot with no automated decision.
2. For each fixture, run scanner/evidence review and derive AIUsageFlow.
3. Compare derived `business_process`, `ai_purpose`, `automation_level`, `affected_subjects`, `human_review` and `potential_harm_categories` with expected labels.
4. Check that Legal RAG / Rule Matching selects the expected rule family/corpus.
5. Check that unclear or low-confidence usage purpose is marked `unknown` / `unclear` and routes to confirmation instead of forcing a legal classification.

Acceptance threshold:

- 100% high-impact fixtures map to the correct legal rule family/corpus or are explicitly blocked for uncertainty.
- 0 provider/model-only mapping accepted as sufficient legal-rule basis.
- 0 internal summarization/internal assistant fixtures are mapped to automated decision/high-impact rules solely because an AI provider/framework is present.
- 100% AIUsageFlow claims used for legal matching have `evidence_refs`.
- If usage purpose confidence is below threshold, classification is blocked/degraded or routed to confirmation.

Failure condition:

- Scanner/AIUsageFlow maps internal summarization to automated decision/high-impact legal rules without evidence.
- Loan approval or HR ranking usage is missed or mapped to generic low-risk/internal-assistant rules.
- Legal Rule Matching ignores `AIUsageFlow` fields and uses only provider/model/dependency.
- Unclear usage purpose still produces final classification.
- AIUsageFlow conclusion lacks evidence refs for critical purpose/downstream-action claims.

### Legal Rule Source

Nguồn legal/rule cho MVP phải được ghi theo inventory có version. Mỗi rule quan trọng cần có:

- legal document id/name;
- legal source/citation;
- legal corpus version;
- effective date nếu có;
- `rule_id`;
- rule condition;
- risk/obligation mapping;
- hard-rule/advisory classification.

### Rule Traceability Requirement

Trace chain tối thiểu:

```text
risk output -> rule_id -> legal source/citation -> legal document version -> assessment audit
```

### Citation Requirement

- 100% critical classification rules phải có citation.
- Classification output phải hiển thị hoặc lưu legal citation/rule trace.
- Citation ngoài retrieved/approved legal sources không được chấp nhận.

### Acceptance Threshold

Pass khi tất cả điều kiện sau đạt:

- 100% critical classification rules có legal source, citation, version, effective date nếu có và `rule_id`.
- 100% risk classification output trong scenario validation trace được về `rule_id`.
- 100% `rule_id` trace được về legal document/version.
- A2-b usage-purpose to rule/corpus mapping passes the acceptance threshold above.
- Không có final classification nếu thiếu legal citation cho rule quan trọng.
- LLM không tạo legal conclusion nếu không có retrieved legal rule/citation.

### Failure Condition

Fail nếu một trong các điều kiện sau xảy ra:

- Critical rule thiếu legal source/citation/version.
- Risk output không trace được về `rule_id`.
- Rule_id không trace được về legal document/version.
- Classification vẫn final khi legal citation thiếu cho field quan trọng.
- LLM tạo conclusion pháp lý không có retrieved legal rule/citation.
- AIUsageFlow maps usage purpose to wrong legal corpus/rule family without blocking or confirmation.
- Classification relies only on model/provider/framework detection.

### If Failed, What PRD Must Change

- Sửa requirements ở Epic 6 để block/degrade rõ hơn khi thiếu legal trace.
- Sửa Evidence/Legal Corpus assumptions và Open Questions.
- Bổ sung rule schema requirements.
- Bổ sung rule approval/review owner.
- Sửa AIUsageFlow contract, scanner finding requirements hoặc rule matching inputs.
- Thu hẹp MVP classification scope nếu legal rules chưa đủ.

## A3 - PBAC and Trusted-Trigger Abuse Risk

### Why This Is High Risk

Phase 5.2L removes structured attestation from active MVP and makes PBAC plus automatic trusted scan initiation the critical abuse surface. If policy scope, service identity or trigger mapping is weak, LCSP can scan the wrong tenant/repository/assessment, allow delegated actors to perform Manager-only actions, or produce classification/report artifacts from unsafe evidence context.

Structured attestation remains `SUPERSEDED_FOR_ACTIVE_MVP`. It is not validated here as an active feature, schema, claim workflow, Manager review input, report disclosure input or audit dependency.

### Data to Validate

- PBAC subject attributes, resource types, action catalog and request/runtime context.
- Policy IDs, policy versions, assignment lifecycle and denial behavior.
- Service identities for API, scheduler, GitHub webhook handling and Python Worker Platform consumers.
- Trusted trigger context: organization, account, GitHub App installation, repository connection, repository, assessment, branch, commit SHA, trigger source and correlation ID.
- Mapping outcomes: `PENDING_MAPPING`, `BLOCKED_MAPPING`, `WAITING_FOR_CONTEXT`, ready-to-snapshot and safe no-op.
- Idempotency key fields and duplicate/out-of-order trigger behavior.
- Audit fields for material PBAC and trigger decisions.
- Abuse-case test results.

### Owner

- **Primary owner:** Product Manager.
- **Supporting reviewers:** Compliance/governance reviewer, Architect/platform reviewer, scanner owner, audit/reporting reviewer.

### Validation Method

- Review PBAC policy model for subject, organization, resource, action, request/runtime context, policy and policy version.
- Review deny-by-default behavior for user actors and service identities.
- Test Manager, Developer, scheduler, GitHub webhook handler and Python worker identities against allowed and denied actions.
- Review automatic trigger mapping for tenant, repository, assessment, branch and commit.
- Test duplicate delivery, out-of-order delivery, revoked repository connection, missing mapping and ambiguous assessment mapping.
- Verify no trigger starts a scan when tenant/repository/account/assessment mapping is missing or ambiguous.
- Verify every material PBAC and trigger decision writes audit fields with actor/service identity, organization, resource, action, policy ID, policy version, decision, safe context refs and correlation ID.

### Required Guardrails

- Roles are subject attributes, grouping labels or policy templates only; role names are not authorization authority.
- Developer scope must be expressed as PBAC policy, not implicit role capability.
- Service identities must be evaluated by PBAC for material internal actions.
- Automatic scan triggers must use trusted integration context; no manual scanner report upload path is allowed.
- Missing or ambiguous mapping must wait or block; it must not select a best-effort assessment.
- Duplicate and out-of-order triggers must not create duplicate artifacts or mutate completed history.
- Scanner evidence remains evidence only and cannot become legal truth or classification truth without downstream gates.

### Acceptance Threshold

Pass khi tất cả điều kiện sau đạt:

- 100% material user and service actions have PBAC decision trace with policy ID/version and correlation ID.
- 100% Developer actions are denied unless an explicit scoped policy permits the action on that assessment/resource.
- 100% Manager-only actions reject Developer and service identities without explicit approved policy.
- 100% trusted triggers resolve to the correct tenant, repository, assessment, branch and commit or enter `PENDING_MAPPING`, `BLOCKED_MAPPING` or `WAITING_FOR_CONTEXT`.
- 0 scan starts when repository/account/assessment mapping is missing, ambiguous, revoked or cross-tenant.
- Duplicate delivery with the same idempotency context returns/resumes the existing workflow without duplicate artifacts.
- Out-of-order trigger events wait, no-op safely or block with auditable reason.
- Audit trail records actor/service identity, organization, resource, action, policy ID, policy version, decision, safe context refs and correlation ID for material PBAC/trigger decisions.

### Failure Condition

Fail nếu một trong các điều kiện sau xảy ra:

- Role label or UI state is treated as final authorization authority.
- Developer performs Manager-only action without explicit scoped policy.
- Service identity starts scan, classification, document generation or audit export outside approved policy scope.
- Trigger with missing, ambiguous, revoked or cross-tenant mapping starts a scan.
- Duplicate or out-of-order trigger creates duplicate artifacts, mutates completed history or scans stale context.
- PBAC denial, trigger block/wait or mapping ambiguity lacks audit trace.
- Scanner/evidence artifact can unlock classification/report despite failed evidence, mapping, PBAC or citation gate.

### If Failed, What PRD Must Change

- Sửa PBAC requirements, subject/resource/action model hoặc policy assignment lifecycle.
- Sửa automatic trusted trigger lifecycle, mapping states, idempotency and recovery behavior.
- Sửa scanner/evidence gate requirements để fail closed khi trigger context không an toàn.
- Sửa audit requirements để bắt buộc policy/trigger trace.
- Thu hẹp Developer collaboration hoặc service-trigger scope nếu không thể validate policy safety.

## Acceptance Threshold Summary

| Assumption | Minimum Pass Threshold |
|---|---|
| A1 - Wizard simplicity vs completeness | Manager hiểu Wizard không cần Developer; Wizard capture đủ critical fields; 100% câu hỏi quan trọng map về WizardProfile; unknown critical fields không trở thành final input |
| A2 - Legal corpus / rule reliability | 100% critical rules có source/citation/version/rule_id; 100% risk output trace về rule_id; A2-b usage-purpose mapping đúng legal corpus/rule family hoặc blocked/uncertain; no final classification without required legal citation; LLM không tạo legal conclusion thiếu retrieved rule/citation |
| A3 - PBAC and trusted-trigger abuse risk | 100% material actions có PBAC decision trace; 100% trusted triggers resolve correct tenant/repository/assessment/branch/commit or block/wait; 0 scan starts on missing/ambiguous/revoked/cross-tenant mapping; duplicate/out-of-order triggers do not create duplicate or stale artifacts |

## PRD Update Triggers

PRD phải được cập nhật nếu xảy ra bất kỳ điều kiện nào:

- A1 fail vì Wizard thiếu critical field hoặc Manager không hiểu câu hỏi.
- A1 fail vì Wizard question không map được WizardProfile.
- A2 fail vì rule/citation/version/rule_id thiếu cho critical classification rule.
- A2 fail vì classification có thể final khi thiếu legal citation.
- A2 fail vì LLM có thể tạo legal conclusion thiếu retrieved legal rule/citation.
- A3 fail vì role label, delegated scope hoặc service identity bypass PBAC.
- A3 fail vì trusted trigger thiếu/ambiguous/revoked/cross-tenant mapping vẫn start scan.
- A3 fail vì duplicate/out-of-order trigger tạo duplicate artifact, stale artifact hoặc mutate completed history.
- A3 fail vì PBAC/trigger decision thiếu policy/version/correlation audit trace.

PRD update có thể bao gồm:

- Thu hẹp MVP classification scope.
- Sửa WizardProfile fields.
- Sửa functional requirements.
- Sửa acceptance criteria.
- Sửa automatic trigger mapping/recovery rules.
- Sửa audit trace requirements.
- Thu hẹp Developer collaboration hoặc service-trigger scope nếu policy safety không validate được.

## Readiness Gate Before Architecture

Có thể chuyển sang Architecture Exploration nếu:

- A1-A3 đã có owner rõ.
- A1-A3 đã có validation method rõ.
- A1-A3 đã có acceptance threshold rõ.
- Architect Agent đọc `validation-plan.md` cùng với `prd.md`.
- Architecture chỉ exploration, không khóa implementation design dựa trên assumption chưa validate.

Architecture Exploration phải giữ các caveat:

- Wizard field model có thể còn thay đổi sau A1.
- Classification/rule boundary có thể còn thay đổi sau A2.
- PBAC policy model, trusted-trigger lifecycle hoặc Developer/service-identity scope có thể còn thay đổi sau A3.

## Readiness Gate Before Backlog

Chưa được tạo implementation backlog nếu:

- A1-A3 chưa có acceptance threshold rõ.
- A1-A3 chưa có owner chịu trách nhiệm.
- A1-A3 chưa có validation method cụ thể.
- Một assumption đã fail nhưng PRD chưa cập nhật.
- Architecture đã chọn design dựa trên assumption chưa validate.

Chỉ được chuyển sang backlog khi:

- A1-A3 đã pass hoặc được PRD cập nhật để giảm scope/rủi ro.
- PRD phản ánh kết quả validation mới nhất.
- Các remaining open questions không còn là blocker cho implementation sequencing.

## Required Conclusion

Có thể chuyển sang Architecture Exploration nếu validation plan đã có owner, method và threshold rõ cho A1-A3.

Chưa được tạo implementation backlog nếu A1-A3 chưa có acceptance threshold rõ.

Architect Agent bắt buộc phải đọc `docs/product/validation-plan.md` cùng với `docs/product/prd.md`.

Nếu một assumption fail trong validation, PRD phải được cập nhật trước khi tiếp tục sang backlog.

Architecture có thể bắt đầu ở mức exploration, nhưng không được khóa implementation design nếu validation chưa hoàn tất.
