# AI Usage Flow Analysis Specification

## Purpose

AI Usage Flow Analysis identifies how AI is used inside the business workflow, what input it receives, what output it produces, what downstream action uses that output, who is affected, whether human review exists, and what potential harm category may apply.

Diễn giải nghiệp vụ:

```text
Không thể phân loại risk chỉ vì repo có OpenAI, Gemini, LangChain hoặc TensorFlow.
Cần biết AI được dùng để làm gì.
AI dùng để gợi ý tiêu đề bài viết khác với AI dùng để duyệt khoản vay.
```

Tài liệu này là specification ở mức design/spec để developer sau này có thể implement scanner integration, AI Usage Flow Analysis Node và rule matching. Tài liệu này không tạo backlog, không viết code, không tạo story implementation.

## Problem Statement

Repository Scan có thể phát hiện dependency, provider, model API call, prompt template hoặc vector database. Những tín hiệu đó chỉ trả lời câu hỏi “có AI không” và “AI được tích hợp về mặt kỹ thuật như thế nào”. Chúng chưa đủ để trả lời câu hỏi compliance quan trọng hơn:

- AI được dùng trong business process nào?
- AI nhận input gì?
- AI tạo output gì?
- Output đó có được dùng để ra quyết định không?
- Ai bị ảnh hưởng bởi quyết định hoặc output đó?
- Có human review thực chất không?
- Có harm potential hoặc protected/high-impact context không?

Nếu thiếu tầng phân tích này, LCSP có thể tạo false positive hoặc false negative nghiêm trọng: internal summarization bị map như automated decision, hoặc loan scoring bị hiểu nhầm là generic analytics.

## Why Model/Provider Detection Is Not Enough

Không đúng:

```text
Repo có OpenAI API -> high risk
```

Đúng:

```text
Repo có OpenAI API
+ AI dùng trong loan approval
+ AI output tạo risk score
+ score dùng để approve/reject customer
+ xử lý financial/personal data
-> retrieve legal rules liên quan automated decision / high impact / financial service / affected person
```

Model/provider/framework là technical signal. Risk classification cần business usage signal. AI Usage Flow Analysis là bridge giữa `TechnicalProfile` và Legal Rule Matching.

## Position in Pipeline

Pipeline bắt buộc:

```text
Repository Scan
-> TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal RAG / Rule Matching
-> Risk Classification
```

Contract:

- `TechnicalProfile` trả lời: AI tồn tại và vận hành như thế nào về mặt kỹ thuật.
- `AIUsageFlow` trả lời: AI được dùng vào mục đích gì trong business flow.
- `VerifiedProfile` phải chứa hoặc reference `AIUsageFlow`.
- Legal Rule Matching phải dùng `AIUsageFlow`.
- Risk Classification không được chạy khi usage purpose conflict chưa resolve.

## Input Contract

| Input | Source | Required | Purpose |
| --- | --- | ---: | --- |
| `TechnicalProfile` | Evidence Normalization | Yes | Technical facts about AI usage |
| `TechnicalFindings[]` | Scanner | Yes | Raw normalized findings, not raw source |
| `WizardProfile` | Manager Wizard | Yes | Business declaration and comparison context |
| `RepositoryScanMetadata` | Scanner | Yes | repo, branch, commit, scanner version |
| `EvidenceRefs[]` | Scanner/Normalizer | Yes | Traceability for every claim |
| `PromptSignals[]` | Scanner | Optional | System/user prompt purpose |
| `CallGraph` | Scanner | Optional | Endpoint/service/model flow |
| `DataFlowGraph` | Scanner | Optional | Input/output/data path |
| `LogicFlowSignals[]` | Scanner | Optional | Auto decision / human review signals |
| `EvidenceGraph` | Static Analysis Scanner | Optional but expected when graph analysis succeeds | Route/service/model/output/action path evidence |
| `CoverageLimitations[]` | Static Analysis Scanner | Yes, may be empty | Unknown/unclear boundary tracking |

Input guardrails:

- No raw source code.
- No full prompt by default.
- No secret values.
- All source-derived references must use finding ids, symbol refs, graph path ids, hashes or redacted snippets where policy allows.

## Output Contract

AI Usage Flow Analysis Node outputs:

```text
AIUsageFlow
```

Output is written only after schema validation. Invalid output is rejected or retried under Orchestrator control.

## AIUsageFlow Object

Conceptual object:

```json
{
  "ai_usage_flow_id": "string",
  "assessment_id": "string",
  "source": "REPOSITORY_SCAN",
  "business_process": "loan_approval | recruitment | customer_support | content_generation | education | healthcare | internal_productivity | unknown",
  "ai_purpose": "summarization | recommendation | scoring | classification | decision_support | automated_decision | chatbot | content_generation | unknown",
  "ai_input_types": ["user_input", "personal_data", "financial_data"],
  "ai_output_types": ["summary", "score", "recommendation", "decision_label", "generated_text"],
  "downstream_action": "none | display_to_user | recommend | rank | approve_reject | notify | escalate | unknown",
  "affected_subjects": ["customer", "employee", "student", "patient", "citizen", "internal_staff"],
  "human_review": "present | absent | unclear",
  "automation_level": "assistive | decision_support | semi_automated | fully_automated | unclear",
  "potential_harm_categories": ["privacy_risk", "financial_loss", "discrimination", "denial_of_service", "misinformation", "none_detected"],
  "evidence_refs": ["finding_id_1", "finding_id_2"],
  "claim_evidence": {},
  "confidence": 0.0,
  "uncertainty_reasons": []
}
```

Field rules:

| Field | Required | Rule |
| --- | ---: | --- |
| `ai_usage_flow_id` | Yes | Stable id for trace/audit |
| `assessment_id` | Yes | Must match assessment |
| `source` | Yes | MVP value is `REPOSITORY_SCAN` |
| `business_process` | Yes | Use known enum or `unknown` |
| `ai_purpose` | Yes | Use known enum or `unknown` |
| `ai_input_types` | Yes | Empty is allowed only if uncertainty reason exists |
| `ai_output_types` | Yes | Empty is allowed only if uncertainty reason exists |
| `downstream_action` | Yes | Use `unknown` if not inferable |
| `affected_subjects` | Yes | Use `unknown` or empty with reason if not inferable |
| `human_review` | Yes | `present`, `absent`, or `unclear` |
| `automation_level` | Yes | Derived from downstream action and human review |
| `potential_harm_categories` | Yes | `none_detected` allowed only with supporting evidence |
| `evidence_refs` | Yes | Required for every material claim |
| `claim_evidence` | Yes | Claim-level value/confidence/evidence_refs/source_type |
| `confidence` | Yes | 0.0-1.0 |
| `uncertainty_reasons` | Yes if uncertain | Required when critical fields are `unknown` / `unclear` |

## Analysis Stages

Static scanner inputs come from `docs/specs/static-analysis-scanner-contract.md`. The analysis node consumes scanner findings, graph paths and coverage limitations; it does not execute source code and does not receive raw source.

### Stage 1 - AI Entry Point Detection

Mục tiêu: xác định AI được gọi ở đâu.

Signals:

- model API call;
- local model inference;
- AI SDK usage;
- inference endpoint;
- prompt template;
- vector search + generation chain;
- `model.predict`, `pipeline`, `chat completion`.

Output:

```text
ai_entry_points[]
```

### Stage 2 - Business Flow Context Detection

Mục tiêu: xác định AI nằm trong luồng nghiệp vụ nào.

Signals:

- API route name: `/loan`, `/recruitment`, `/chat`, `/medical`, `/education`;
- service/class/function name;
- folder/module name;
- DTO/schema names;
- database table/entity names;
- prompt purpose;
- README/API docs if available.

Output:

```text
business_process
```

Examples:

| Evidence | Business Process |
| --- | --- |
| `/loan/approve`, `CreditScoringService` | `loan_approval` |
| `candidate_ranker`, `resume_screening` | `recruitment` |
| `medical_record_summary` | `healthcare` |
| `support_chatbot` | `customer_support` |
| `article_generator` | `content_generation` |

### Stage 3 - AI Input Detection

Mục tiêu: xác định AI nhận dữ liệu gì.

Signals:

- function arguments passed to model;
- prompt variables;
- DTO/request fields;
- data flow into model call;
- variable names;
- schema names.

Output:

```text
ai_input_types[]
```

Examples:

| Signal | Input Type |
| --- | --- |
| `customer_income`, `credit_history` | `financial_data` |
| `resume`, `candidate_profile` | `employment_data` |
| `medical_record`, `diagnosis` | `health_data` |
| `chat_message`, `question` | `user_input` |

### Stage 4 - AI Output Detection

Mục tiêu: xác định AI trả ra gì.

Signals:

- variable assigned from model output;
- parser/schema after model output;
- output field names;
- downstream function names.

Output:

```text
ai_output_types[]
```

Examples:

| Signal | Output Type |
| --- | --- |
| `risk_score` | `score` |
| `candidate_rank` | `ranking` |
| `approval_label` | `decision_label` |
| `summary` | `summary` |
| `recommendation` | `recommendation` |

### Stage 5 - Downstream Action Detection

Mục tiêu: xác định output AI được dùng làm gì.

Signals:

- `if/else` using AI output;
- score threshold;
- approve/reject function call;
- ranking/sorting;
- notification/escalation;
- human review function.

Output:

```text
downstream_action
```

Examples:

| Code Pattern | Downstream Action |
| --- | --- |
| `if ai_score > threshold: approve()` | `approve_reject` |
| `sort(candidates, ai_rank)` | `rank` |
| `send_to_manager_review(ai_result)` | `escalate` / `human_review` |
| `return summary to user` | `display_to_user` |

### Stage 6 - Human Review Detection

Mục tiêu: xác định có con người review output AI không.

Output:

```text
human_review = present | absent | unclear
```

Signals for present:

- `manager_review`;
- `human_approval`;
- `manual_review`;
- `send_to_reviewer`;
- `requiresApproval`;
- workflow state `PENDING_REVIEW`.

Signals for absent:

- direct approve/reject after AI output;
- automatic status update;
- no review stage found.

If unclear:

```text
human_review = unclear
```

Không được tự claim có human review nếu evidence không rõ.

### Stage 7 - Affected Subject Detection

Mục tiêu: xác định ai bị ảnh hưởng.

| Evidence | Affected Subject |
| --- | --- |
| customer loan flow | `customer` |
| resume screening | `candidate` / `employee` |
| student grading | `student` |
| patient triage | `patient` |
| citizen service eligibility | `citizen` |
| internal code assistant | `internal_staff` |

### Stage 8 - Harm Potential Detection

Mục tiêu: xác định category nguy hại tiềm năng.

| AI Usage | Harm Category |
| --- | --- |
| loan approval | `financial_loss` / `denial_of_service` |
| recruitment ranking | `discrimination` / `employment_impact` |
| medical triage | `health_safety` |
| public service eligibility | `denial_of_service` / `rights_impact` |
| internal summarization | `low_or_none_detected` |
| chatbot advice | `misinformation` / `user_reliance` |

### Stage 9 - AIUsageFlow Assembly

Sau khi có signals, node tạo `AIUsageFlow`.

If evidence is missing:

```text
field = unknown / unclear
uncertainty_reasons[] must be populated
```

Không được tự suy đoán quá mức. Output phải validate schema trước khi ghi vào DB hoặc dùng cho Reconciliation.

## Claim-level Evidence Model

AIUsageFlow must track evidence per claim, not only as one global evidence list.

Conceptual claim:

```json
{
  "value": "loan_approval",
  "confidence": 0.86,
  "evidence_refs": ["finding_domain_001", "graph_path_loan_score_001"],
  "uncertainty_reason": null,
  "source_type": "scanner-derived"
}
```

Required claim groups:

- `business_process`
- `ai_purpose`
- `ai_input_types`
- `ai_output_types`
- `downstream_action`
- `affected_subjects`
- `human_review`
- `automation_level`
- `potential_harm_categories`

Rules:

- Claim without `evidence_refs` cannot be used for legal rule matching.
- Manager declarations can supplement business context but must remain distinguishable from scanner-derived evidence.
- Reconciled claims must preserve both scanner-derived and manager-declared refs when applicable.

## Evidence Reference Rules

Mọi material claim trong `AIUsageFlow` phải có evidence refs.

Example:

```json
{
  "ai_purpose": "scoring",
  "evidence_refs": ["finding_ai_output_score_001", "finding_downstream_threshold_002"]
}
```

Rules:

- Không có evidence ref -> claim không được dùng cho Legal Rule Matching.
- Claim từ prompt phải có prompt hash/ref, không cần lưu full prompt.
- Claim từ source code phải có file path + symbol/function reference + finding id.
- Claim từ graph phải có graph path id.
- Claim từ WizardProfile phải đánh dấu là user-declared, không phải scanner-derived.
- Claim dùng cho conflict phải preserve both sides: WizardProfile claim and scanner-derived/usage-flow claim.

## Confidence and Uncertainty Rules

`AIUsageFlow.confidence` không phải legal confidence. Nó chỉ đo mức chắc chắn của usage-flow interpretation.

Confidence dựa trên:

- number of supporting findings;
- confidence of findings;
- clarity of data flow;
- clarity of downstream action;
- match between WizardProfile and repo evidence;
- availability of call graph / data flow graph.

Output:

```text
confidence = 0.0 to 1.0
```

Interpretation:

| Confidence | Meaning |
| ---: | --- |
| 0.80-1.00 | Strong evidence |
| 0.60-0.79 | Reasonable evidence |
| 0.40-0.59 | Weak/partial evidence |
| 0.00-0.39 | Unclear |

Critical fields:

- `business_process`;
- `ai_purpose`;
- `downstream_action`;
- `affected_subjects`;
- `human_review`;
- `data_types`.

Scanner coverage limitations such as `UNSUPPORTED_DYNAMIC_FLOW` and `SCAN_COVERAGE_LIMITATION` reduce confidence and must populate `uncertainty_reasons`.

Policy:

```text
If usage purpose is unclear, do not final classify.
If critical AIUsageFlow fields are unknown, block or request confirmation.
```

## Conflict Creation Rules

AI Usage Flow Analysis can create a conflict when repository evidence differs from WizardProfile.

| WizardProfile says | AIUsageFlow says | Result |
| --- | --- | --- |
| Internal assistant | Customer-facing chatbot | Conflict |
| Human review present | No review signal / auto decision | Conflict |
| No sensitive data | Medical/financial/biometric signal | Conflict |
| Content generation only | Scoring/ranking/approve-reject | Conflict |
| No AI decision support | AI output used in decision flow | Conflict |

Routing remains simple:

```text
Có mâu thuẫn -> pause workflow + create Manager conflict resolution task
Không có mâu thuẫn -> VerifiedProfile
```

Conflict ownership:

- Manager resolves all MVP conflicts, including technical source/path interpretation, business meaning, purpose, affected subject and cross-boundary usage-purpose conflict;
- Developer may provide optional delegated technical clarification post-MVP;
- Developer clarification is input only and does not finalize conflict.

## LLM Usage Policy

AI Usage Flow Analysis is rule-first.

| Task | LLM allowed? |
| --- | ---: |
| AST parsing | No |
| call graph extraction | No |
| data flow extraction | No |
| evidence schema validation | No |
| purpose explanation from sanitized metadata | Optional |
| ambiguous purpose summarization | Optional |
| legal conclusion | No |

Rules:

- Raw source code must not be sent to LLM.
- Full system prompt must not be sent to LLM by default.
- LLM may receive only sanitized evidence summaries.
- LLM output cannot create legal conclusion.
- LLM output must be schema-validated.
- LLM output must not override deterministic evidence.
- LLM output must cite or preserve evidence refs from the input.

## Privacy and Security Rules

- No raw source to LLM.
- No long-term raw source storage.
- No secret values in findings, prompts, audit or AIUsageFlow.
- Full prompt content is not stored by default; use hash/ref/category and redacted snippet only if policy allows.
- Object storage is not used for raw source or full prompts.
- Audit logs store node name, input refs, output hash, confidence, uncertainty reason and status, not raw source.
- Temporary scanner workspace cleanup remains mandatory.

## Examples

### Example 1 - Internal Summarization

Input evidence:

```text
provider=OpenAI
route=/internal/docs/summarize
output variable=summary
downstream_action=display_to_user
affected_subject=internal_staff
```

Expected `AIUsageFlow`:

```text
business_process=internal_productivity
ai_purpose=summarization
downstream_action=display_to_user
automation_level=assistive
potential_harm_categories=none_detected or privacy_risk if personal data appears
```

Expected rule behavior:

```text
Do not map to automated decision/high-impact solely because OpenAI exists.
```

### Example 2 - Loan Approval

Input evidence:

```text
service=CreditScoringService
output=risk_score
if risk_score > threshold -> reject_application()
input=income, credit_history
```

Expected `AIUsageFlow`:

```text
business_process=loan_approval
ai_purpose=scoring
downstream_action=approve_reject
affected_subjects=[customer]
ai_input_types=[financial_data, personal_data]
automation_level=fully_automated or semi_automated depending human review
potential_harm_categories=[financial_loss, denial_of_service]
```

### Example 3 - HR Screening

Input evidence:

```text
module=candidate_ranker
input=resume, candidate_profile
output=candidate_rank
downstream_action=rank
```

Expected `AIUsageFlow`:

```text
business_process=recruitment
ai_purpose=scoring or ranking
affected_subjects=[employee/candidate]
potential_harm_categories=[discrimination, employment_impact]
```

### Example 4 - Customer Chatbot

Input evidence:

```text
route=/support/chat
purpose=answer customer questions
downstream_action=display_to_user
no approve/reject/ranking path detected
```

Expected `AIUsageFlow`:

```text
business_process=customer_support
ai_purpose=chatbot
downstream_action=display_to_user
automation_level=assistive
```

Expected rule behavior:

```text
Do not classify as automated decision unless downstream action indicates decision/advice in protected/high-impact domain.
```

## Failure Modes

| Failure Mode | Detection | Required Behavior |
| --- | --- | --- |
| Provider-only inference | Legal mapping uses provider/framework only | Reject mapping; require AIUsageFlow fields |
| Missing evidence refs | Material claim has no evidence refs | Claim cannot be used for rule matching |
| Low confidence usage purpose | Confidence below threshold or critical fields unknown | Mark uncertain; create confirmation task or block/degrade |
| Conflicting WizardProfile | Wizard says internal, evidence says customer-facing/decisioning | Create conflict; keep classification locked |
| Prompt unavailable | Dynamic prompt reference without content | Use `DYNAMIC_SYSTEM_PROMPT_REFERENCE`, mark prompt purpose unclear |
| Human review overclaimed | Human review not backed by workflow evidence | Set `human_review=unclear` or `absent`; create conflict if Wizard claims present |
| Sensitive data missed | Data flow contains health/financial/biometric/employment data but not categorized | A2-b failure; update scanner taxonomy |
| LLM output unsupported | LLM suggests purpose without evidence refs | Reject or downgrade to uncertainty |

## Acceptance Criteria

- AIUsageFlow is generated after TechnicalProfile and before Reconciliation.
- Every material AIUsageFlow claim has evidence refs or explicit uncertainty.
- Provider/model/framework presence alone cannot produce legal-rule mapping.
- Internal summarization is not treated as automated decision without downstream decision evidence.
- Loan approval / credit scoring maps to decision-impact and financial-service rule family when evidence supports it.
- HR ranking maps to employment/high-impact/discrimination-risk rule family when evidence supports it.
- Customer chatbot without decision path does not map to automated decision rules by default.
- Critical unknown fields block/degrade classification or route to confirmation.
- No raw source/full prompt/secret is sent to LLM.
- Output is schema-validated and audited.

## Open Questions

| Question | Dependency |
| --- | --- |
| Final confidence threshold for blocking vs confirmation | A2-b validation |
| Exact enum list for business_process and ai_purpose | A1/A2-b validation |
| Whether redacted short snippets are allowed in findings | Security/privacy review |
| Final graph extraction capability in MVP scanner | Architecture review |
| Whether A2-b requires synthetic fixture repos or structured scanner-output fixtures first | Validation execution decision |
