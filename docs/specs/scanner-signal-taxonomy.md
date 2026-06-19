# Scanner Signal Taxonomy

## Purpose

Tài liệu này chuẩn hóa các signal scanner cần tạo để AI Usage Flow Analysis hoạt động. Scanner chỉ tạo technical evidence và normalized findings; scanner không kết luận pháp lý và không tự tạo risk level.

Taxonomy này phục vụ:

- `TechnicalEvidenceReport.findings`;
- `TechnicalProfile`;
- `AIUsageFlow`;
- Reconciliation;
- A2-b validation: scanner + AIUsageFlow mapping accuracy.

The authoritative scanner design is `docs/specs/static-analysis-scanner-contract.md`. Scanner findings are produced by static analysis only and do not represent legal conclusions.

## Signal Categories

| Category | Purpose | Example |
| --- | --- | --- |
| AI model/provider/framework | Detect AI integration | OpenAI SDK, Gemini API, TensorFlow |
| Prompt | Detect prompt/source/purpose signal | system prompt template, dynamic prompt ref |
| Input data | Detect what enters model | resume, income, medical_record |
| Output data | Detect what model returns | score, rank, summary |
| Decision flow | Detect downstream usage | approve/reject, rank, notify |
| Human review | Detect oversight | pending_review, manager_approval |
| User impact | Detect affected subject | customer, candidate, patient |
| Sensitive data | Detect personal/sensitive fields | financial, health, biometric |
| Domain context | Detect business domain | loan, HR, healthcare |
| Harm potential | Detect potential harm category | financial_loss, discrimination |
| RAG/retrieval | Detect retrieval-augmented AI path | vector DB, retriever chain |
| Output parser | Detect structured model output | JSON parser, schema parser |

## Finding Type Catalog

| Finding Type | Meaning |
| --- | --- |
| `AI_MODEL_USAGE` | Có gọi model/API/framework |
| `AI_PROVIDER_USAGE` | Provider/model service được dùng |
| `AI_FRAMEWORK_USAGE` | LangChain, TensorFlow, PyTorch, etc. |
| `AI_MODEL_INVOCATION` | Cụ thể model/API/local inference invocation |
| `SYSTEM_PROMPT_DETECTED` | Có system prompt literal hoặc template |
| `DYNAMIC_SYSTEM_PROMPT_REFERENCE` | Prompt lấy runtime từ DB/config/remote |
| `AI_INPUT_SIGNAL` | Dữ liệu đưa vào model |
| `AI_OUTPUT_SIGNAL` | Output model |
| `AI_DECISION_FLOW_SIGNAL` | Output AI tham gia decision flow |
| `AUTOMATED_DECISION_SIGNAL` | Output AI dẫn đến quyết định tự động |
| `HUMAN_REVIEW_SIGNAL` | Có bước human review |
| `RANKING_SIGNAL` | AI output tham gia ranking/sorting |
| `RECOMMENDATION_SIGNAL` | AI output tạo recommendation |
| `STATUS_UPDATE_SIGNAL` | AI output dẫn tới status update |
| `USER_IMPACT_SIGNAL` | Output ảnh hưởng user/customer/employee/student |
| `SENSITIVE_DATA_SIGNAL` | Dữ liệu cá nhân/nhạy cảm |
| `DOMAIN_CONTEXT_SIGNAL` | Lĩnh vực business |
| `HARM_POTENTIAL_SIGNAL` | Tín hiệu nguy hại tiềm năng |
| `RAG_USAGE_SIGNAL` | Có vector DB / retrieval chain |
| `MODEL_OUTPUT_PARSER_SIGNAL` | Có parser/schema xử lý output model |
| `SCAN_COVERAGE_LIMITATION` | Scanner không bao phủ được file/language/flow |
| `UNSUPPORTED_DYNAMIC_FLOW` | Dynamic/unsupported boundary làm flow không trace được |

## Required Fields per Finding

Conceptual finding object:

```json
{
  "finding_id": "string",
  "finding_type": "string",
  "source_type": "SOURCE_CODE | CONFIG | DEPENDENCY | INFRA | PROMPT | GRAPH",
  "file_path": "string",
  "symbol_ref": "string",
  "line_range": "optional",
  "graph_path_id": "optional",
  "evidence_hash": "string",
  "confidence": 0.0,
  "metadata": {}
}
```

Required field rules:

| Field | Required | Notes |
| --- | ---: | --- |
| `finding_id` | Yes | Stable within report |
| `finding_type` | Yes | Must use catalog value |
| `source_type` | Yes | Source class of evidence |
| `file_path` | Required for source/config/prompt findings | May be omitted for graph-only aggregate finding |
| `symbol_ref` | Required when available | Function/class/route/service symbol |
| `line_range` | Optional | Do not expose long code snippets |
| `graph_path_id` | Optional | Required for graph-derived path claims |
| `evidence_hash` | Yes | Integrity without raw source |
| `confidence` | Yes | 0.0-1.0 |
| `metadata` | Yes | Structured metadata, no secrets |

Security:

- Không lưu secret.
- Không lưu full prompt mặc định.
- Không gửi raw source sang LLM.
- Prompt literal chỉ lưu hash/category/snippet-redacted nếu policy cho phép.
- Finding must be auditable through report hash and scanner version.

## Confidence Rules

| Confidence | Meaning | Example |
| ---: | --- | --- |
| 0.90-1.00 | Direct deterministic evidence | explicit function call `approve(ai_score)` |
| 0.75-0.89 | Strong structural evidence | output parser field `risk_score` used in threshold branch |
| 0.60-0.74 | Reasonable inferred evidence | service name + DTO fields + output name align |
| 0.40-0.59 | Weak/partial evidence | only naming convention without call/data flow |
| 0.00-0.39 | Unclear | dynamic runtime path unavailable |

Confidence must not be inflated by provider/model presence alone. A provider finding can support AI usage existence, but not business purpose or downstream action.

Relative evidence strength:

| Evidence | Relative Strength |
| --- | --- |
| Direct AI invocation AST node | Very strong |
| Traced model-output-to-approval/reject path | Very strong |
| Direct human-review queue path | Very strong |
| Route/service/entity agreement | Strong |
| Input/output parser or schema | Medium to strong |
| Prompt metadata | Medium |
| README/comment | Weak |
| LLM interpretation | Support only |

## Evidence Ref Format

Evidence refs should be stable enough for audit and reproducibility:

```text
finding_id
report_hash
scanner_version
ruleset_version
source_type
file_path
symbol_ref
graph_path_id
evidence_hash
```

Example:

```text
finding_ai_decision_flow_002
report_hash=sha256:...
file_path=src/loan/CreditScoringService.ts
symbol_ref=CreditScoringService.evaluateApplication
graph_path_id=graph_path_loan_score_to_reject_001
```

## Prompt Signal Rules

Prompt findings may identify purpose, role and output expectations, but must preserve privacy:

| Case | Finding Type | Storage rule |
| --- | --- | --- |
| Literal system prompt | `SYSTEM_PROMPT_DETECTED` | Store hash, category, redacted short snippet only if allowed |
| Template prompt | `SYSTEM_PROMPT_DETECTED` | Store template id/path/hash and variable names |
| Prompt from DB/config/remote | `DYNAMIC_SYSTEM_PROMPT_REFERENCE` | Store source ref and mark content unavailable unless safely captured |
| Prompt includes secrets/PII | `SYSTEM_PROMPT_DETECTED` + redaction metadata | Do not store sensitive value |

Prompt signal cannot create legal conclusion. It can support `ai_purpose` when combined with input/output/downstream findings.

## Data Flow Signal Rules

Data flow signals connect source data to model input.

Required metadata:

- source variable/field;
- input category;
- model call or prompt variable;
- graph path id when available;
- confidence;
- evidence refs.

Examples:

| Signal | Finding |
| --- | --- |
| `customer_income` passed into prompt | `AI_INPUT_SIGNAL`, `SENSITIVE_DATA_SIGNAL` |
| `resume` passed to model | `AI_INPUT_SIGNAL`, `DOMAIN_CONTEXT_SIGNAL` |
| `medical_record` summarized | `AI_INPUT_SIGNAL`, `SENSITIVE_DATA_SIGNAL`, `DOMAIN_CONTEXT_SIGNAL` |

## Decision Flow Signal Rules

Decision flow signals connect AI output to business action.

Strong signals:

- AI score used in threshold branch;
- AI label passed to approve/reject/update status;
- model ranking used in sorting candidates;
- model recommendation used to notify, route, deny, approve or escalate.

Required findings:

- `AI_OUTPUT_SIGNAL`;
- `AI_DECISION_FLOW_SIGNAL`;
- `AUTOMATED_DECISION_SIGNAL` if no review gate exists;
- evidence refs for path from output to action.

Automated decision signal requires:

```text
AI output
+ decision rule / threshold / branch
+ state-changing action or approve/reject action
+ no evidenced human-review step between them
```

Do not infer fully automated decision when downstream action cannot be traced.

## Human Review Signal Rules

Human review signal is only `present` when there is concrete workflow evidence.

Signals for present:

- `manager_review`;
- `human_approval`;
- `manual_review`;
- `send_to_reviewer`;
- `requiresApproval`;
- state `PENDING_REVIEW`;
- role-bound approval route before final action.

Signals for absent:

- direct status update after AI output;
- direct approve/reject call after AI output;
- no review state on output path.

If both exist or path is incomplete:

```text
human_review = unclear
```

Absence of review signal is not proof that human review is absent. `absent` requires bounded-path evidence from AI output to downstream action without a review step.

## AI Invocation Rule Groups

MVP scanner rulesets must cover:

- OpenAI;
- Gemini;
- Anthropic;
- Hugging Face;
- LangChain;
- LlamaIndex;
- scikit-learn;
- TensorFlow / Keras;
- PyTorch;
- local HTTP inference endpoints;
- generic `/predict`, `/infer`, `/generate`, `/classify`, `/score` routes.

Rulesets generate findings and evidence refs, not legal conclusions.

## Static Analysis and Coverage Limitation Rules

MVP scanner is static-analysis only:

- Tree-sitter provides generic parse/fallback structure.
- TypeScript Compiler API provides TS/JS semantic analysis through a restricted Node.js analyzer.
- Python `ast` plus custom import/module resolver provides Python semantic analysis.
- Java, Kotlin, Go, C# and Rust get basic signal detection only.

When dynamic import, reflection, runtime prompts, remote config, external proprietary AI service, queue breaks, generated/minified code, missing coverage or unresolved output paths are encountered, emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION` and set related AIUsageFlow claim to `unknown`/`unclear`.

## Sensitive Data Signal Rules

Sensitive data detection should be conservative but evidence-based.

| Signal | Data Type |
| --- | --- |
| `income`, `credit_history`, `debt`, `loan_amount` | `financial_data` |
| `resume`, `candidate_profile`, `employment_history` | `employment_data` |
| `medical_record`, `diagnosis`, `symptom`, `triage` | `health_data` |
| `biometric`, `face_embedding`, `fingerprint` | `biometric_data` |
| `student_grade`, `learning_profile` | `education_data` |
| `ssn`, `national_id`, `email`, `phone`, `address` | `personal_data` |

Sensitive data signal must not include actual values.

## Examples

### Example 1 - Loan Scoring

Findings:

```text
AI_MODEL_USAGE: OpenAI chat completion in CreditScoringService
AI_INPUT_SIGNAL: customer_income, credit_history
AI_OUTPUT_SIGNAL: risk_score
AI_DECISION_FLOW_SIGNAL: risk_score threshold controls approve/reject
AUTOMATED_DECISION_SIGNAL: direct status update without review
SENSITIVE_DATA_SIGNAL: financial_data, personal_data
DOMAIN_CONTEXT_SIGNAL: loan_approval
USER_IMPACT_SIGNAL: customer
```

### Example 2 - Internal Summarization

Findings:

```text
AI_PROVIDER_USAGE: Gemini API
SYSTEM_PROMPT_DETECTED: summarize internal document
AI_OUTPUT_SIGNAL: summary
AI_DECISION_FLOW_SIGNAL: none detected
DOMAIN_CONTEXT_SIGNAL: internal_productivity
USER_IMPACT_SIGNAL: internal_staff
```

### Example 3 - HR Ranking

Findings:

```text
AI_INPUT_SIGNAL: resume, candidate_profile
AI_OUTPUT_SIGNAL: candidate_rank
AI_DECISION_FLOW_SIGNAL: rank candidates for recruiter
HUMAN_REVIEW_SIGNAL: recruiter_review if explicit route exists, else unclear
DOMAIN_CONTEXT_SIGNAL: recruitment
HARM_POTENTIAL_SIGNAL: discrimination, employment_impact
```

### Example 4 - Dynamic Prompt

Findings:

```text
DYNAMIC_SYSTEM_PROMPT_REFERENCE: prompt loaded from DB key=loan_scoring_prompt
AI_MODEL_USAGE: model call present
AI_INPUT_SIGNAL: application data
AI_OUTPUT_SIGNAL: decision_label
```

Expected behavior:

```text
prompt purpose may be unclear unless prompt metadata is available.
AIUsageFlow must use uncertainty_reasons.
```
