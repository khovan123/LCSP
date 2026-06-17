# LCSP Validation Plan for High-Risk Assumptions

## Purpose

Tài liệu này khóa cách validate ba assumption rủi ro cao A1-A3 trước khi LCSP dùng Conditional PRD làm input cho Architecture Exploration hoặc backlog/implementation planning.

Mục tiêu không phải tạo architecture, backlog hay code. Mục tiêu là làm rõ owner, validation method, sample/test case, acceptance threshold, failure condition và PRD update trigger để các assumption quan trọng không bị coi như đã được giải quyết.

Nguồn chính:

- `docs/product/prd.md`
- `docs/product/product-brief.md`
- `docs/brainstorming/brainstorming-summary.md`
- `docs/brainstorming/open-questions.md`
- `docs/brainstorming/decision-candidates.md`
- `docs/brainstorming/next-step-recommendation.md`
- `LCSP_Technical_Specification.html`

## Validation Scope

Validation scope chỉ bao gồm ba assumption:

- **A1 - Wizard simplicity vs completeness**
- **A2 - Legal corpus / rule reliability**
- **A3 - Human attestation abuse risk**

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
| A3 - Human attestation abuse risk | Manager/Developer dùng attestation hoặc delegated clarification để hợp thức hóa evidence yếu hoặc bypass scanner/evidence | Product Manager, phối hợp Compliance/Governance Reviewer | Attestation schema review, Manager final-resolution review, delegated permission review, abuse-case testing, audit trail inspection | 100% attestation có role/claim/reason/scope/timestamp/assessment id/audit log; 100% MVP conflict resolution có Manager final resolution; 0 attestation thay machine-generated metadata | Free-text attestation bypasses classification gates; role claim sai; Developer clarification tự finalize conflict; metadata khách quan bị thay bằng attestation | Sửa attestation requirements, permission model, reporting disclosure, blocking rules hoặc audit requirements trong PRD |

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

## A3 - Human Attestation Abuse Risk

### Why This Is High Risk

Structured human technical attestation giúp LCSP xử lý trường hợp scanner không bắt được dynamic/wrapper/runtime logic. Nhưng nếu không kiểm soát, attestation sẽ biến thành nút bypass scanner/evidence, làm hỏng định vị evidence-based.

### Data to Validate

- Attestation schema.
- Role-claim matrix.
- Danh sách allowed claims.
- Danh sách forbidden claims.
- Danh sách claims cần Manager final review hoặc optional delegated clarification.
- Audit log fields.
- Report disclosure behavior.
- Abuse-case test results.

### Owner

- **Primary owner:** Product Manager.
- **Supporting reviewers:** Compliance/governance reviewer, technical reviewer, audit/reporting reviewer.

### Validation Method

- Review attestation schema có đủ role, claim, reason, scope, timestamp, assessment_id và audit log.
- Review role-bound claims:
  - Manager chỉ confirm business/legal meaning.
  - Developer chỉ confirm technical truth.
- Review critical claims cần Manager final review và không được để Developer clarification tự bypass evidence/reconciliation/classification gates.
- Test abuse cases:
  - Developer viết "bỏ qua scanner" dạng free text.
  - Manager cố confirm technical truth.
  - Developer cố confirm legal/business meaning.
  - Attestation thiếu scope hoặc timestamp.
  - Attestation cố thay report hash/scanner version/repo commit.
- Kiểm tra final report disclosure khi classification dùng attestation.

### Allowed Claims

Developer có thể attest technical truth như:

- AI usage detected/not detected when scanner missed dynamic/wrapper logic.
- Model call is production logic.
- Decision flow exists in code.
- Scanner false positive/false negative.
- Technical profile correction.
- Deployment/production scope, nếu có supporting context.

Manager có thể confirm business/legal meaning như:

- Business purpose.
- User impact.
- Human review process.
- Decision owner.
- Legal/compliance meaning of evidence.

### Forbidden Claims

Attestation không được thay các metadata khách quan:

- report hash;
- scanner version;
- ruleset version;
- scan timestamp;
- repo/commit metadata;
- legal corpus version;
- evidence report integrity;
- machine-generated privacy flags.

### Dual-Confirmation Claims

Các claim cần Manager final review trong MVP; post-MVP có thể dùng optional Developer clarification:

- auto decision;
- AI-assisted decision;
- human oversight;
- sensitive data usage;
- user-facing external LLM;
- biometric/high-impact use case;
- any conflict that can change risk level.

### Audit Requirements

100% attestation phải lưu:

- assessment_id;
- attested_by;
- role;
- claim field;
- claim value;
- reason;
- scope;
- timestamp;
- supporting evidence refs nếu có;
- related conflict id nếu có;
- report disclosure flag nếu ảnh hưởng materially đến classification-relevant Manager decision.

### Acceptance Threshold

Pass khi tất cả điều kiện sau đạt:

- 100% attestation có role, claim, reason, scope, timestamp và assessment_id.
- 100% attestation được ghi audit log.
- 100% classification-relevant attestation có Manager final review.
- 0 trường hợp attestation thay machine-generated metadata.
- 0 trường hợp Manager confirm technical truth.
- 0 trường hợp Developer confirm business/legal meaning.
- Nếu attestation ảnh hưởng materially đến classification-relevant Manager decision, final report và audit trail ghi rõ điều đó.

### Failure Condition

Fail nếu một trong các điều kiện sau xảy ra:

- Free-text attestation bypasses classification gates.
- Attestation thiếu role, claim, reason, scope, timestamp hoặc assessment_id.
- Critical claim hoặc delegated clarification tự bypass evidence/reconciliation/classification gates mà không có Manager final review.
- Attestation thay report hash, scanner version, ruleset version, scan timestamp, repo/commit metadata, legal corpus version, evidence report integrity hoặc machine-generated privacy flags.
- Report không disclose khi classification dùng attestation.

### If Failed, What PRD Must Change

- Sửa Epic 3, Epic 5, Epic 6, Epic 7 hoặc Epic 8 để siết attestation.
- Sửa permission model nếu role-bound claims chưa đủ rõ.
- Bổ sung blocking rule cho attestation abuse.
- Bổ sung report disclosure requirements.
- Nếu không kiểm soát được abuse, loại attestation khỏi mọi classification-relevant decision path trong MVP.

## Acceptance Threshold Summary

| Assumption | Minimum Pass Threshold |
|---|---|
| A1 - Wizard simplicity vs completeness | Manager hiểu Wizard không cần Developer; Wizard capture đủ critical fields; 100% câu hỏi quan trọng map về WizardProfile; unknown critical fields không trở thành final input |
| A2 - Legal corpus / rule reliability | 100% critical rules có source/citation/version/rule_id; 100% risk output trace về rule_id; A2-b usage-purpose mapping đúng legal corpus/rule family hoặc blocked/uncertain; no final classification without required legal citation; LLM không tạo legal conclusion thiếu retrieved rule/citation |
| A3 - Human attestation abuse risk | 100% attestation có role/claim/reason/scope/timestamp/assessment_id/audit; 100% classification-relevant attestation có Manager final review; 0 Developer clarification tự finalize conflict; 0 attestation thay machine-generated metadata; report disclose khi dùng attestation |

## PRD Update Triggers

PRD phải được cập nhật nếu xảy ra bất kỳ điều kiện nào:

- A1 fail vì Wizard thiếu critical field hoặc Manager không hiểu câu hỏi.
- A1 fail vì Wizard question không map được WizardProfile.
- A2 fail vì rule/citation/version/rule_id thiếu cho critical classification rule.
- A2 fail vì classification có thể final khi thiếu legal citation.
- A2 fail vì LLM có thể tạo legal conclusion thiếu retrieved legal rule/citation.
- A3 fail vì attestation có thể bypass classification gates bằng free text hoặc sai role.
- A3 fail vì attestation thay machine-generated metadata.
- A3 fail vì final report không disclose attestation-assisted classification.

PRD update có thể bao gồm:

- Thu hẹp MVP classification scope.
- Sửa WizardProfile fields.
- Sửa functional requirements.
- Sửa acceptance criteria.
- Sửa report/disclosure rules.
- Loại hoặc hạn chế attestation khỏi classification-relevant decision path.

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
- Attestation unlock path có thể bị siết hoặc loại khỏi MVP sau A3.

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
