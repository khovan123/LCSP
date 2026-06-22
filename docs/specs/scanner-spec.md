# Scanner Spec

## Status

AUTHORITATIVE

## Purpose

Single source of truth for Repository Scan and static-analysis scanner domain behavior. Scanner implementation guidance lives in `docs/implementation/scanner-implementation.md`; runtime flow lives in `docs/developer-execution-blueprints/scanner-data-journey.md`.

This document is the canonical scanner specification for LCSP. It defines how the MVP repository scanner collects traceable technical evidence for AI Usage Flow Analysis without executing customer code, creating legal conclusions, storing raw source long-term, or sending raw source/full prompts/secrets to LLM.

This is a design/spec contract. It is not source code, backlog, story, sprint plan, database schema code or test source code.

## Authoritative Scanner Principle

The scanner does not determine legal risk directly.

The scanner collects traceable technical evidence showing:

- where AI is invoked;
- what data enters the AI invocation;
- what output AI produces;
- where that output flows;
- whether it affects ranking, recommendation, approval, rejection, notification or user-facing output;
- whether a human-review step is evidenced;
- which business/domain signals are present.

Legal classification happens only after:

```text
TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

Provider/model/framework detection alone must never create a risk level or high-risk classification.

## Static-analysis-only Safety Boundary

MVP scanner is static-analysis only.

Allowed:

- Read repository files.
- Parse source code.
- Parse dependency manifests.
- Parse configuration templates.
- Parse database schemas/migrations.
- Build AST, call graph, data-flow graph and evidence graph.
- Read OpenAPI/README only as low-confidence contextual signals.

Forbidden:

- Execute customer source code.
- Run `npm install`, `pnpm install`, `pip install`, Maven, Gradle, Docker Compose, test commands or build commands.
- Run repository scripts.
- Execute Dockerfiles, shell scripts or CI workflows.
- Probe customer API endpoints.
- Persist raw source code long-term.
- Send raw source code, full prompts or secrets to LLM.

## MVP Technology Decisions

Controlled MVP prototype scanner runtime is TypeScript-first.

| Concern | Canonical Controlled MVP Technology | Role |
| --- | --- | --- |
| Scan worker runtime | Node.js / TypeScript worker in npm workspaces | Consumes scan commands and controls scanner lifecycle |
| Generic syntax parsing | Tree-sitter | Syntax parsing and structural extraction without executing source |
| TypeScript / JavaScript semantic analysis | `ts-morph` over TypeScript compiler services | Project loading, import resolution, symbol resolution and type hints; raw TypeScript Compiler API direct implementation is not used except behind `ts-morph` |
| Python coverage | Tree-sitter Python grammar, syntax-only | Parse/import/call hints only in controlled TypeScript-first prototype |
| Graph assembly | `graphology` in-memory graph | Scan-local dependency/evidence graph |
| Graph persistence | PostgreSQL metadata tables | Persist normalized metadata, refs, hashes and paths only |
| Detection rules | Versioned JSON/YAML rulesets | Provider/framework/API invocation, decision patterns, review patterns and domain/data signals |
| Secret redaction | Deterministic redaction before persistence | Remove credentials, tokens, keys and confidential values |
| Scanner workspace | Ephemeral restricted temporary workspace | Read source only during scan; cleanup after scan |
| LLM usage | LLM Gateway only, sanitized metadata only | Raw source, full prompts, secrets and full AST bodies never enter LLM |

Not active in the controlled MVP scanner implementation: Python worker runtime, NetworkX, unrestricted raw TypeScript Compiler API usage, source execution, dependency install, build, test, Docker or CI execution. CodeQL is not an MVP runtime dependency.

## Language Support Policy

| Support Level | Languages | Required Behavior |
| --- | --- | --- |
| First-class semantic analysis | TypeScript, JavaScript | AST + imports + symbols + AI invocation + local/cross-module flow |
| Syntax-only coverage | Python | Tree-sitter imports, function definitions, class definitions and simple calls only |
| Basic signal detection only | Java, Kotlin, Go, C#, Rust | Dependency/config/import detection, no claim of complete semantic flow |
| Unsupported / binary / minified | All | Skip safely and emit coverage limitation finding |

The scanner must not claim complete code understanding for any language.

## Required Scanner Pipeline

1. Scan Job Initialization
2. Ephemeral Workspace Creation
3. Repository Snapshot and Commit Pinning
4. Repository Inventory
5. Dependency and Configuration Analysis
6. Source File Classification
7. Language-specific AST and Symbol Analysis
8. AI Invocation Detection
9. Input-to-AI Data Flow Analysis
10. AI Output and Downstream Action Analysis
11. Human Review and Automation Detection
12. Domain / Business Context Signal Fusion
13. Call Graph and Evidence Graph Assembly
14. TechnicalFinding Generation
15. TechnicalEvidenceReport Generation
16. Evidence Normalization and Quality Gates
17. Workspace Cleanup Verification
18. Scan Completion Event Emission

Scanner pipeline boundary:

- Scanner owns `SourceFile`, scanner facts, `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding`, and `TechnicalEvidenceReport`.
- Scanner does not build `TechnicalProfile`.
- Scanner does not build `AIUsageFlow`.
- Scanner writes `event.scan.completed.v1` only after the report passes gates and workspace cleanup is verified.
- Cleanup failure must mark the scan failed with `SCANNER_WORKSPACE_CLEANUP_FAILED`, write a security-sensitive audit event, and block downstream processing.

## Controlled Analysis Levels

| Level | Scope | Purpose |
| --- | --- | --- |
| L0 | Repository inventory | Identify languages, frameworks, manifests, configs, routes, schemas |
| L1 | Single-function local flow | Detect input -> model call -> output -> condition/return/update in one function |
| L2 | Same-module flow | Follow nearby function calls within service/module |
| L3 | Controlled cross-module flow | Controller/route -> service -> AI invocation -> repository/status action |
| L4 | Unsupported/uncertain boundary | Dynamic import, reflection, runtime DB config, external service, queue break, generated/minified code |

Rules:

- Do not attempt unrestricted whole-repository global data-flow analysis in MVP.
- Only start L2/L3 tracing after an AI invocation candidate is detected.
- When a flow crosses unsupported/dynamic boundaries, emit uncertainty instead of guessing.

## Logical Graph Contract

Graph assembly is scan-local. The controlled MVP prototype uses `graphology` as an in-memory graph. PostgreSQL persistence stores only normalized graph nodes, graph edges, evidence paths, references, hashes and structured findings.

### Node Types

`ROUTE`, `CONTROLLER`, `FUNCTION`, `METHOD`, `SERVICE`, `DTO`, `ENTITY`, `DATABASE_FIELD`, `CONFIG_REFERENCE`, `PROMPT_REFERENCE`, `AI_PROVIDER`, `AI_MODEL_INVOCATION`, `AI_INPUT`, `AI_OUTPUT`, `DECISION_RULE`, `STATUS_UPDATE`, `RANKING_ACTION`, `NOTIFICATION_ACTION`, `HUMAN_REVIEW_STEP`, `QUEUE_ACTION`, `USER_RESPONSE`, `DOMAIN_SIGNAL`, `DATA_CATEGORY_SIGNAL`.

### Edge Types

`CALLS`, `IMPORTS`, `READS`, `WRITES`, `PASSES_TO`, `RETURNS`, `FLOWS_TO`, `CONTROLS`, `PERSISTS`, `RANKS`, `APPROVES`, `REJECTS`, `ESCALATES_TO_REVIEW`, `RESPONDS_TO_USER`.

### Required Graph Node/Edge Metadata

| Metadata | Required | Notes |
| --- | ---: | --- |
| `scan_id` | Yes | Trace to scan job |
| `repository_id` | Yes | Connected repository |
| `commit_sha` | Yes | Pinned source snapshot |
| `file_path` | Yes when file-backed | Path only, no source body |
| `symbol_ref` | Yes when available | Function/class/method/route reference |
| `line_range` | When available | Location metadata, not code body |
| `evidence_hash` | Yes | Integrity/reference |
| `scanner_version` | Yes | Reproducibility |
| `ruleset_version` | Yes | Rule trace |
| `confidence` | Yes | 0.0-1.0 |

Raw source body and complete AST bodies must not be persisted.

## Required Scanner Finding Types

Scanner findings must standardize at least:

- `AI_PROVIDER_USAGE`
- `AI_FRAMEWORK_USAGE`
- `AI_MODEL_INVOCATION`
- `AI_INPUT_SIGNAL`
- `AI_OUTPUT_SIGNAL`
- `AI_DECISION_FLOW_SIGNAL`
- `AUTOMATED_DECISION_SIGNAL`
- `HUMAN_REVIEW_SIGNAL`
- `RANKING_SIGNAL`
- `RECOMMENDATION_SIGNAL`
- `STATUS_UPDATE_SIGNAL`
- `USER_IMPACT_SIGNAL`
- `SENSITIVE_DATA_SIGNAL`
- `DOMAIN_CONTEXT_SIGNAL`
- `SYSTEM_PROMPT_DETECTED`
- `DYNAMIC_SYSTEM_PROMPT_REFERENCE`
- `RAG_USAGE_SIGNAL`
- `MODEL_OUTPUT_PARSER_SIGNAL`
- `SCAN_COVERAGE_LIMITATION`
- `UNSUPPORTED_DYNAMIC_FLOW`

Findings generate evidence, not legal conclusions.

## AI Invocation Rule Groups

MVP scanner rulesets must include rule groups for:

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

Rulesets must be versioned YAML/JSON and each finding must record the ruleset version.

## Input Classification Approach

AI input category claims must be based on evidence fusion from:

- Request DTO / API schema;
- function parameters;
- prompt variables;
- database entity fields;
- database column names;
- upstream service methods;
- data-flow paths;
- domain module names.

Supported initial categories:

- `personal_data`
- `financial_data`
- `employment_data`
- `health_data`
- `biometric_data`
- `education_data`
- `location_data`
- `user_input`
- `public_data`
- `unknown`

A variable/field name alone is weak evidence. Confidence increases only when multiple signals agree.

## Output and Downstream Action Detection

Scanner must detect whether AI output is:

- `summary`
- `generated_text`
- `score`
- `classification_label`
- `ranking`
- `recommendation`
- `decision_label`
- `vision_result`
- `unknown`

Scanner must trace whether the output is used to:

- `display_to_user`
- `store_for_later`
- `recommend`
- `rank`
- `notify`
- `escalate_for_review`
- `approve_reject`
- `change_status`
- `unknown`

Automated decision condition:

```text
AI output
+ decision rule / threshold / branch
+ state-changing action or approve/reject action
+ no evidenced human-review step between them
```

Do not infer fully automated decision when downstream action cannot be traced.

## Human Review Detection

Positive human-review evidence examples:

- `PENDING_REVIEW`
- `MANAGER_REVIEW`
- `HUMAN_APPROVAL`
- `MANUAL_REVIEW`
- `reviewQueue`
- `assignReviewer`
- `requiresApproval`
- `awaitApproval`

Rules:

- Presence of a generic function named `review()` is insufficient by itself.
- Absence of review signal is not proof that human review is absent.
- Use `present`, `absent with bounded-path evidence`, or `unclear`.

## Domain Context Fusion

Business purpose must be inferred from combined signals:

- API routes;
- controller/service/class names;
- folder/module names;
- DTO/schema names;
- database entities;
- prompt metadata;
- AI input category;
- AI output type;
- downstream action.

Examples:

| Signals | Inference |
| --- | --- |
| `/loans/apply` + `CreditScoringService` + income/credit history + `riskScore` + `APPROVED`/`REJECTED` | `loan_approval` + `scoring` + `approve_reject` |
| `/candidates/rank` + `CandidateRankingService` + resume/profile + candidate score + sorting | `recruitment` + `ranking` |
| `/support/chat` + user message + generated response + response to user | `customer_support` + `chatbot` |

## AIUsageFlow Claim-level Evidence Model

AIUsageFlow must not use only one global evidence list. Each material claim must contain:

```json
{
  "value": "string | array",
  "confidence": 0.0,
  "evidence_refs": ["finding_id", "graph_path_id"],
  "uncertainty_reason": "string when applicable",
  "source_type": "scanner-derived | manager-declared | reconciled"
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

- A claim without `evidence_refs` cannot be used for legal rule matching.
- Manager declarations can supplement business context but must remain distinguishable from scanner-derived evidence.
- Unclear or unknown critical claims block final classification or require traceable Manager clarification.

## Confidence Model

Do not use simplistic confidence such as `provider detected = high confidence`.

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

Confidence bands:

| Confidence | Meaning |
| ---: | --- |
| 0.80-1.00 | strong evidence |
| 0.60-0.79 | reasonable evidence |
| 0.40-0.59 | partial / weak evidence |
| 0.00-0.39 | unclear |

## Unknown / Abstain Behavior

When any of the following exists, scanner must emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION`:

- dynamic import;
- reflection;
- runtime prompt from database;
- remote configuration;
- external proprietary AI service;
- message queue boundary without trace;
- minified/generated code;
- missing source coverage;
- unresolved output path.

Then set relevant AIUsageFlow claim to `unknown` or `unclear` and populate uncertainty reason. Do not overclaim legal risk.

## LLM Boundary

LLM may receive only structured sanitized metadata, such as:

- route category;
- service name;
- data category labels;
- output type labels;
- downstream action labels;
- human-review state;
- confidence;
- evidence reference IDs.

LLM may:

- summarize evidence for Manager;
- explain uncertainty;
- suggest a non-binding business-purpose label.

LLM may not:

- receive raw repository source;
- receive full system prompts;
- receive secrets;
- override deterministic evidence;
- create unsupported AIUsageFlow claims;
- make legal classification decisions.

## Security Implementation Details

- Shallow clone pinned to selected commit.
- No git history cloning unless explicitly required later.
- Non-root scanner execution.
- Restricted filesystem write access.
- Restricted outbound network after repository retrieval.
- File size, file count, depth and time limits.
- Skip binaries, generated assets and minified bundles by policy.
- Secret redaction before findings persist.
- Temporary workspace deletion after scan.
- Persist only metadata, hashes, graph paths, structured findings and coverage limits.
- Idempotency key based on repository + commit SHA + scanner version + ruleset version.

## Fixtures and A2-b Metrics

Required fixture families:

- Internal summarization / internal assistant.
- Loan approval / credit scoring.
- HR screening / recruitment ranking.
- Customer-facing chatbot without decision.
- Human-reviewed loan decision.
- Auto-approve or auto-reject decision.
- Dynamic runtime prompt reference.
- Provider/model detected but no business impact.
- AI invocation with unresolved downstream path.
- Wizard says no automated decision but source shows approve/reject.

A2-b metrics must include:

- AI invocation detection precision.
- Business purpose mapping precision.
- Input category detection accuracy.
- Output type detection accuracy.
- Downstream-action detection accuracy.
- Human-review detection accuracy.
- Automated-decision false-positive rate.
- Unknown/abstain correctness.
- AIUsageFlow claim evidence completeness.
- Legal-rule mapping eligibility completeness.

## Locked Controlled MVP Scanner Decisions

| Decision | Final Controlled MVP Value |
| --- | --- |
| Scanner sandbox | Restricted temporary local filesystem workspace at `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}`. |
| Sandbox cleanup | Delete workspace immediately after scan completion or terminal scan failure; cleanup failure emits security-sensitive audit and blocks downstream. |
| Analyzer process packaging | TypeScript-first Node.js worker in npm workspaces. |
| Parser stack | Tree-sitter parser adapters with ts-morph for TS/JS semantic analysis. |
| Graph runtime | graphology in memory during scan. |
| Graph persistence | Metadata-only PostgreSQL persistence using `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding`, and `TechnicalEvidenceReport`. |
| Evidence path persistence | No separate `ScannerEvidencePath` table in the controlled MVP. Evidence paths are stored as structured JSON in `TechnicalFinding.metadata.evidencePath`. |
| Python scanner behavior | Tree-sitter Python syntax-only coverage; no Python worker and no Python semantic analysis. |
| Unsupported/generated/minified/oversized files | Emit issue and coverage limitation; do not persist raw body or full AST. |
| Source execution | Prohibited. Scanner must not run npm install/build/test, Docker, CI, package scripts, API probing, or customer code. |
| CodeQL evaluation | Not part of controlled MVP scanner execution. |

## Traceability

| Concern | Related Document |
| --- | --- |
| Scanner implementation | `docs/implementation/scanner-implementation.md` |
| Persistence | `docs/implementation/persistence-implementation.md` |
| Queue and scan events | `docs/implementation/queue-implementation.md`, `docs/specs/event-catalog.md` |
| AIUsageFlow handoff | `docs/specs/assessment-lifecycle-spec.md`, `docs/specs/ai-usage-flow-domain-spec.md` |
| Reconciliation | `docs/specs/assessment-lifecycle-spec.md`, `docs/specs/domain-state-machines.md` |
| Requirements traceability | `docs/specs/requirements-traceability-matrix.md` |

## Readiness

Current implementation readiness:

```text
READY_FOR_CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_NOT_PRODUCTION
```


---

# Scanner Signal Taxonomy

# Scanner Signal Taxonomy

## Purpose

Tài liệu này chuẩn hóa các signal scanner cần tạo để AI Usage Flow Analysis hoạt động. Scanner chỉ tạo technical evidence và normalized findings; scanner không kết luận pháp lý và không tự tạo risk level.

Taxonomy này phục vụ:

- `TechnicalEvidenceReport.findings`;
- `TechnicalProfile`;
- `AIUsageFlow`;
- Reconciliation;
- A2-b validation: scanner + AIUsageFlow mapping accuracy.

This document is the authoritative scanner design. Scanner findings are produced by static analysis only and do not represent legal conclusions.

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
| `AI_PROVIDER_USAGE` | Provider SDK, endpoint, dependency or config is present; possible AI capability only. |
| `AI_FRAMEWORK_USAGE` | AI/ML framework is present, such as LangChain, TensorFlow or PyTorch; possible AI capability only. |
| `AI_MODEL_INVOCATION` | Evidence-backed model/API/local inference invocation. |
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

Canonical semantic boundaries:

- `AI_PROVIDER_USAGE` means provider/package/config presence. It never proves active model use.
- `AI_FRAMEWORK_USAGE` means an AI/ML framework is present. It never proves active model use.
- `AI_MODEL_INVOCATION` means static analysis found an evidence-backed model/API/local inference call.
- `AI_MODEL_USAGE` is not an active controlled-MVP finding type. Use `AI_PROVIDER_USAGE`, `AI_FRAMEWORK_USAGE`, or `AI_MODEL_INVOCATION` according to the evidence.
- `HARM_POTENTIAL_SIGNAL` is scanner-owned only as a technical/domain signal. AIUsageFlow owns the material harm-category claim after combining technical evidence, WizardProfile context and confidence rules.

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

Controlled MVP deterministic scanner confidence formula:

```text
rawConfidence =
  baseByFindingType
  + directEvidenceBonus
  + corroborationBonus
  - coveragePenalty
  - ambiguityPenalty

finding.confidence = roundToTwoDecimals(clamp(rawConfidence, 0.00, 1.00))
```

Base values by canonical `FindingType`:

| FindingType | Base |
|---|---:|
| `AI_PROVIDER_USAGE` | 0.35 |
| `AI_FRAMEWORK_USAGE` | 0.35 |
| `AI_MODEL_INVOCATION` | 0.70 |
| `AI_INPUT_SIGNAL` | 0.55 |
| `AI_OUTPUT_SIGNAL` | 0.55 |
| `AI_DECISION_FLOW_SIGNAL` | 0.65 |
| `AUTOMATED_DECISION_SIGNAL` | 0.75 |
| `HUMAN_REVIEW_SIGNAL` | 0.70 |
| `RANKING_SIGNAL` | 0.60 |
| `RECOMMENDATION_SIGNAL` | 0.60 |
| `STATUS_UPDATE_SIGNAL` | 0.65 |
| `USER_IMPACT_SIGNAL` | 0.60 |
| `SENSITIVE_DATA_SIGNAL` | 0.60 |
| `DOMAIN_CONTEXT_SIGNAL` | 0.50 |
| `SYSTEM_PROMPT_DETECTED` | 0.55 |
| `DYNAMIC_SYSTEM_PROMPT_REFERENCE` | 0.45 |
| `RAG_USAGE_SIGNAL` | 0.60 |
| `MODEL_OUTPUT_PARSER_SIGNAL` | 0.60 |
| `SCAN_COVERAGE_LIMITATION` | 1.00 |
| `UNSUPPORTED_DYNAMIC_FLOW` | 1.00 |

Adjustments:

- `directEvidenceBonus = +0.15` when a Tree-sitter or ts-morph fact directly identifies the symbol/call/path.
- `corroborationBonus = +0.05` per independent supporting source, capped at `+0.15`.
- `coveragePenalty = -0.15` per material limitation affecting the finding, capped at `-0.30`.
- `ambiguityPenalty = -0.20` when callee, output path or human-review path is unresolved.
- Duplicate facts with the same `evidenceRef` and same `FindingType` do not add corroboration.
- Round half-up to two decimals after all caps and penalties.

Provider/framework presence findings must remain below `0.60` unless an evidence-backed invocation is also present as a separate `AI_MODEL_INVOCATION` finding. If no linked invocation exists for the same source file/symbol path, cap the calculated value with `finding.confidence = min(calculatedConfidence, 0.59)` after rounding/clamping.

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
- ts-morph provides TS/JS semantic analysis through the controlled TypeScript-first Node.js scanner worker.
- Python uses Tree-sitter syntax-only extraction and emits `PYTHON_SEMANTIC_ANALYSIS_DEFERRED`; Python semantic analysis is not active MVP behavior.
- Java, Kotlin, Go, C# and Rust get basic signal detection only.
- `BASIC_SIGNAL_ONLY` languages do not use a language-specific AST adapter in the controlled MVP. Basic signals come from `ManifestConfigSignalExtractor`, which runs before parser adapter selection and reads repository manifests, dependency/config files, file paths and optional import-like metadata discovered by repository inventory. `UnsupportedParserAdapter` emits only the file-level coverage limitation; it does not create basic signal findings by itself.
- `ManifestConfigSignalExtractor` owns BASIC_SIGNAL_ONLY findings for `.java`, `.kt`, `.go`, `.cs` and `.rs` files. It may create `AI_PROVIDER_USAGE`, `AI_FRAMEWORK_USAGE`, `DOMAIN_CONTEXT_SIGNAL` and `SCAN_COVERAGE_LIMITATION` findings from metadata only. It must not create `AI_MODEL_INVOCATION`, `AI_DECISION_FLOW_SIGNAL` or `AUTOMATED_DECISION_SIGNAL` without AST/semantic evidence.

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
AI_MODEL_INVOCATION: OpenAI chat completion in CreditScoringService
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
AI_MODEL_INVOCATION: model call present
AI_INPUT_SIGNAL: application data
AI_OUTPUT_SIGNAL: decision_label
```

Expected behavior:

```text
prompt purpose may be unclear unless prompt metadata is available.
AIUsageFlow must use uncertainty_reasons.
```

<!-- PHASE-5-5-SCANNER-CONTRACTS:START -->

## Phase 5.5A Canonical Parser, Language and AST Contracts

These contracts are authoritative for implementing `ParserRegistry`, `LanguageMapper`, `UnsupportedParserAdapter`, and `TreeSitterAstExtractor`.

### TypeScript Interfaces

```ts
export type SupportedLanguage =
  | 'TYPESCRIPT'
  | 'JAVASCRIPT'
  | 'PYTHON'
  | 'JAVA'
  | 'KOTLIN'
  | 'GO'
  | 'CSHARP'
  | 'RUST'
  | 'UNKNOWN'

export type AnalysisSupportLevel =
  | 'FULL_STATIC'
  | 'SYNTAX_ONLY'
  | 'BASIC_SIGNAL_ONLY'
  | 'UNSUPPORTED'

export type ParserAdapterKey =
  | 'typescript'
  | 'javascript'
  | 'python'
  | 'unsupported'

export type ScannerFactKind =
  | 'IMPORT'
  | 'EXPORT'
  | 'CALL'
  | 'FUNCTION'
  | 'CLASS'
  | 'DECISION_POINT'
  | 'PROMPT'
  | 'DATA_FIELD'
  | 'FILE_LIMITATION'

export type ArgumentKind =
  | 'STRING_LITERAL'
  | 'NUMBER_LITERAL'
  | 'BOOLEAN_LITERAL'
  | 'OBJECT_LITERAL'
  | 'ARRAY_LITERAL'
  | 'IDENTIFIER'
  | 'TEMPLATE_LITERAL'
  | 'CALL_EXPRESSION'
  | 'AWAIT_EXPRESSION'
  | 'FUNCTION_CALLBACK'
  | 'UNKNOWN'

export type ParseIssueSeverity = 'INFO' | 'WARN' | 'ERROR'

export interface SourceFileRef {
  sourceFileId: string
  repositorySnapshotId: string
  relativePath: string
  extension: string
  sizeBytes: number
  contentHash: string
  generatedHint?: boolean
  minifiedHint?: boolean
}

export interface SourceContentSample {
  firstBytesUtf8?: string
  firstLines?: string[]
  totalBytes: number
  lineCount?: number
  maxLineLength?: number
  averageLineLength?: number
}

export interface SourceLocation {
  filePath: string
  startLine?: number
  startColumn?: number
  endLine?: number
  endColumn?: number
  symbolRef?: string
}

export interface ParseIssue {
  code:
    | 'UNSUPPORTED_LANGUAGE'
    | 'SCANNER_PARSER_INIT_FAILED'
    | 'SCANNER_PARSE_FAILED'
    | 'SCANNER_FILE_TOO_LARGE'
    | 'SCANNER_MINIFIED_FILE_SKIPPED'
    | 'SCANNER_GENERATED_FILE_SKIPPED'
    | 'SCANNER_DYNAMIC_IMPORT_LIMITATION'
    | 'SCANNER_UNRESOLVED_CALLEE'
    | 'PYTHON_SEMANTIC_ANALYSIS_DEFERRED'
  message: string
  severity: ParseIssueSeverity
  location?: SourceLocation
}

export interface CoverageLimitation {
  limitationType:
    | 'UNSUPPORTED_LANGUAGE'
    | 'SYNTAX_ONLY'
    | 'BASIC_SIGNAL_ONLY'
    | 'DYNAMIC_FLOW'
    | 'GENERATED_SOURCE'
    | 'MINIFIED_SOURCE'
    | 'OVERSIZED_SOURCE'
    | 'PARSE_FAILURE'
    | 'PYTHON_SEMANTIC_ANALYSIS_DEFERRED'
  reason: string
  evidenceRef: string
  sourceFileId?: string
}

export interface EvidenceRef {
  evidenceRefId: string
  evidenceRef: string
  sourceType: 'STATIC_SCAN'
  sourceFileId: string
  relativePath: string
  location?: SourceLocation
  evidenceHash: string
  redactionStatus: 'NO_SOURCE_STORED' | 'REDACTED_METADATA_ONLY'
}

export interface EvidenceRefFactory {
  createLocationRef(input: {
    sourceFile: SourceFileRef
    location?: SourceLocation
    factKind: ScannerFactKind
    stableText?: string
  }): EvidenceRef

  createFileRef(input: {
    sourceFile: SourceFileRef
    factKind: ScannerFactKind
  }): EvidenceRef
}

export interface ImportFact {
  factId: string
  sourceFileId: string
  importedModule: string
  importedNames: string[]
  defaultImport?: string
  namespaceImport?: string
  importKind: 'ES_IMPORT' | 'COMMONJS_REQUIRE' | 'DYNAMIC_IMPORT' | 'PYTHON_IMPORT' | 'PYTHON_FROM_IMPORT'
  location: SourceLocation
  evidenceRef: string
}

export interface ExportFact {
  factId: string
  sourceFileId: string
  exportedName: string
  exportKind: 'FUNCTION' | 'CLASS' | 'CONST' | 'TYPE' | 'DEFAULT' | 'UNKNOWN'
  location: SourceLocation
  evidenceRef: string
}

export interface CallFact {
  factId: string
  sourceFileId: string
  calleeText: string
  receiverText?: string
  callKind: 'CALL_EXPRESSION' | 'METHOD_CALL' | 'CONSTRUCTOR_CALL' | 'DYNAMIC_CALL' | 'UNKNOWN'
  argumentKinds: ArgumentKind[]
  awaited: boolean
  enclosingSymbolRef?: string
  location: SourceLocation
  evidenceRef: string
}

export interface FunctionFact {
  factId: string
  sourceFileId: string
  name: string
  symbolRef: string
  functionKind: 'FUNCTION_DECLARATION' | 'ARROW_FUNCTION' | 'CLASS_METHOD' | 'EXPORTED_FUNCTION'
  async: boolean
  parameters: string[]
  location: SourceLocation
  evidenceRef: string
}

export interface ClassFact {
  factId: string
  sourceFileId: string
  name: string
  symbolRef: string
  exported: boolean
  decorators: string[]
  methods: string[]
  location: SourceLocation
  evidenceRef: string
}

export interface DecisionPointFact {
  factId: string
  sourceFileId: string
  decisionKind: 'IF' | 'SWITCH' | 'TERNARY' | 'THRESHOLD_BRANCH' | 'STATUS_UPDATE' | 'APPROVE_REJECT_ACTION'
  conditionSummary: string
  relatedCallEvidenceRefs: string[]
  location: SourceLocation
  evidenceRef: string
}

export interface PromptFact {
  factId: string
  sourceFileId: string
  promptKind: 'SYSTEM_PROMPT' | 'USER_PROMPT' | 'TEMPLATE_PROMPT' | 'DYNAMIC_PROMPT_REFERENCE'
  storageKind: 'INLINE_REDACTED' | 'VARIABLE_REFERENCE' | 'REMOTE_REFERENCE' | 'UNKNOWN'
  variableNames: string[]
  templateName?: string
  redactedSnippet?: string
  snippetHash?: string
  category?: string
  location: SourceLocation
  evidenceRef: string
}

export interface DataFieldFact {
  factId: string
  sourceFileId: string
  fieldName: string
  categoryHint: 'FINANCIAL' | 'EMPLOYMENT' | 'HEALTH' | 'EDUCATION' | 'PERSONAL_DATA' | 'UNKNOWN'
  location: SourceLocation
  evidenceRef: string
}

export interface ParsedFile {
  sourceFile: SourceFileRef
  language: SupportedLanguage
  supportLevel: AnalysisSupportLevel
  imports: ImportFact[]
  exports: ExportFact[]
  calls: CallFact[]
  functions: FunctionFact[]
  classes: ClassFact[]
  decisionPoints: DecisionPointFact[]
  promptFacts: PromptFact[]
  dataFieldFacts: DataFieldFact[]
  parseIssues: ParseIssue[]
  coverageLimitations: CoverageLimitation[]
}

export interface LanguageMappingResult {
  sourceFile: SourceFileRef
  language: SupportedLanguage
  supportLevel: AnalysisSupportLevel
  adapterKey: ParserAdapterKey
  isIgnored: boolean
  isGenerated: boolean
  isMinified: boolean
  isOversized: boolean
  issues: ParseIssue[]
  coverageLimitations: CoverageLimitation[]
}

export interface ParserAdapter {
  adapterKey: ParserAdapterKey
  language: SupportedLanguage
  initialize?(): Promise<void>
  parse(input: {
    sourceFile: SourceFileRef
    content: string
  }): ParserAdapterParseResult
}

export interface UnsupportedParserAdapter extends ParserAdapter {
  adapterKey: 'unsupported'
}

export interface ParserAdapterParseResult {
  sourceFile: SourceFileRef
  adapterKey: ParserAdapterKey
  language: SupportedLanguage
  treeAvailable: boolean
  treeRef?: unknown
  parseIssues: ParseIssue[]
  coverageLimitations: CoverageLimitation[]
  syntaxTreeHash?: string
  parserVersion?: string
}

export interface ParserRegistry {
  register(adapter: ParserAdapter): void
  getAdapter(adapterKey: ParserAdapterKey): ParserAdapter | undefined
  getOrUnsupported(adapterKey: ParserAdapterKey): ParserAdapter
  initializeAll(): Promise<void>
}

export interface LanguageMapper {
  map(input: {
    sourceFile: SourceFileRef
    contentSample?: SourceContentSample
  }): LanguageMappingResult
}

export interface AstExtractor {
  extract(parseResult: ParserAdapterParseResult): ParsedFile
}
```

### Responsibility Split

`ParserAdapter` owns the Tree-sitter parser instance, parses source content, and returns a parse tree wrapper plus parse issues. It does not extract imports, calls, prompts, data fields, or business facts.

`TreeSitterAstExtractor` traverses the parse tree, creates evidence refs, emits coverage limitations, and returns `ParsedFile`.

### ParserRegistry Behavior

- One singleton registry is created per worker process.
- Registry keys are adapter keys, not file extensions.
- Active adapter keys are `typescript`, `javascript`, `python`, and `unsupported`.
- `.ts` and `.tsx` use adapter key `typescript`.
- `.js`, `.jsx`, `.mjs`, and `.cjs` use adapter key `javascript`.
- `.py` uses adapter key `python`.
- Unsupported, generated, minified, oversized, binary, or unknown files use adapter key `unsupported`.
- `getAdapter` returns a registered adapter by `ParserAdapterKey`.
- `getOrUnsupported` returns the requested adapter when registered, otherwise returns the `UnsupportedParserAdapter`.
- Parser initialization failure is `SCANNER_PARSER_INIT_FAILED` with severity `ERROR`.

### UnsupportedParserAdapter Behavior

- Never throws for unsupported language.
- `parse(...)` returns `treeAvailable: false`.
- Adds `ParseIssue` code `UNSUPPORTED_LANGUAGE` with severity `INFO`.
- Adds `CoverageLimitation` reason `UNSUPPORTED_LANGUAGE`.
- Evidence refs for unsupported files use `EvidenceRefFactory.createFileRef(...)`; no line location is required.
- `TreeSitterAstExtractor.extract(...)` returns empty fact arrays with the same issues and limitations.

### LanguageMapper Rules

`LanguageMapper` does not read files. The file enumerator supplies `SourceContentSample`.

| Condition | Language | Support Level | Adapter Key |
| --- | --- | --- | --- |
| `.ts` | `TYPESCRIPT` | `FULL_STATIC` | `typescript` |
| `.tsx` | `TYPESCRIPT` | `FULL_STATIC` | `typescript` |
| `.js` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.jsx` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.mjs` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.cjs` | `JAVASCRIPT` | `FULL_STATIC` | `javascript` |
| `.py` | `PYTHON` | `SYNTAX_ONLY` | `python` |
| `.java`, `.kt`, `.go`, `.cs`, `.rs` | matching language | `BASIC_SIGNAL_ONLY` | `unsupported` |
| binary, minified, generated, oversized, unknown | `UNKNOWN` | `UNSUPPORTED` | `unsupported` |

Ignored directories: `node_modules`, `dist`, `build`, `coverage`, `.git`, `.next`, `out`, `vendor`, `generated`.

Thresholds:

- Max source file size: 1 MB per source file.
- Minified threshold: average line length greater than 500 or single-line file greater than 50 KB.
- Generated detection: path contains `generated`, `auto-generated`, `.gen.`, or first lines contain a generated-code marker.
- Oversized detection uses `SourceContentSample.totalBytes` or `SourceFileRef.sizeBytes`.

### Parse Issue Severity Mapping

| Issue | Severity |
| --- | --- |
| Unsupported language | `INFO` |
| Generated skipped | `WARN` |
| Minified skipped | `WARN` |
| Oversized skipped | `WARN` |
| Parse failure | `ERROR` |
| Dynamic import | `WARN` |
| Unresolved callee | `WARN` |
| Parser initialization failure | `ERROR` |

### EvidenceRefFactory Rules

- `stableText` may be a symbol name, module specifier, callee chain, normalized condition summary, or redacted metadata.
- Never pass raw full source body.
- Never store raw prompt or secret.
- Hash input must be normalized metadata, not full source.
- Evidence refs are created during extraction, not later.

### Minimal Foundation Extraction Rules

Import facts:

- TypeScript/JavaScript: ES import declaration, CommonJS `require(...)`, dynamic import call as coverage limitation.
- Python: `import` statement and `from ... import ...` statement.

Call facts:

- Extract call expression callee chain, method call chain, constructor call, awaited call marker.
- Dynamic call emits `SCANNER_UNRESOLVED_CALLEE` when callee cannot be resolved.

Function facts:

- Extract function declaration, arrow function assigned to identifier, class method, and exported function.

Class facts:

- Extract class declaration and exported class.

Decision point facts:

- Extract if statement, conditional expression, switch case, and comparison expression involving known AI output variable when available.
- `conditionSummary` is redacted and capped at 120 characters.

Prompt facts:

- Extract string/template literal passed to known AI invocation argument and template path/config prompt reference.
- Store hash/category only; no raw prompt body.

Data field facts:

- Extract variable, parameter, and property names only.
- Never store field values.

Coverage limitations:

- Dynamic import.
- Unresolved callee.
- Unsupported language.
- Parse failure.
- Generated/minified skipped.
- Oversized skipped.

### Condition Summary and Prompt Redaction

Condition summary rules:

- Do not store raw condition text.
- Replace known identifiers with `AI_OUTPUT`, `USER_INPUT`, `DOMAIN_FIELD`, or `UNKNOWN_IDENTIFIER`.
- Replace string literals with `STRING_LITERAL`.
- Replace numbers with `NUMERIC_LITERAL`.
- Keep operators: `>`, `<`, `>=`, `<=`, `===`, `!==`, `&&`, `||`.
- Max length: 120 characters.

Prompt fact rules:

- Store `promptKind`, location, `variableNames`, `templateName`, and `evidenceRef`.
- Store `redactedSnippet` only when length is 120 characters or less and no secret/PII pattern is present.
- Otherwise store `snippetHash` and category only.

### Data Category Keyword Map

| Category | Keywords |
| --- | --- |
| `FINANCIAL` | `income`, `loan`, `credit`, `debt`, `salary`, `payment`, `transaction` |
| `EMPLOYMENT` | `resume`, `candidate`, `job`, `employment`, `interview`, `recruiter` |
| `HEALTH` | `diagnosis`, `symptom`, `medical`, `patient`, `treatment` |
| `EDUCATION` | `student`, `grade`, `course`, `school`, `learning` |
| `PERSONAL_DATA` | `email`, `phone`, `address`, `nationalId`, `ssn`, `fullName` |

### syntaxTreeHash Rule

`syntaxTreeHash` is optional. If produced, hash normalized structural node kinds and line ranges only. Do not hash raw source text. Do not persist full AST bodies. For the controlled MVP parser foundation, `syntaxTreeHash` may be omitted.

### Python Syntax-Only Behavior

Python uses Tree-sitter Python grammar only in the controlled MVP scanner foundation. It extracts imports, function definitions, class definitions, and simple call facts. It does not perform Python semantic import resolution. It emits coverage limitation `PYTHON_SEMANTIC_ANALYSIS_DEFERRED`; `supportLevel = 'SYNTAX_ONLY'`.

### TreeSitterAstExtractor Output Rules

The extractor returns `ParsedFile` with imports, exports, calls, functions, classes, decision points, prompt facts, data field facts, parse issues and coverage limitations. It must not persist raw source bodies or full AST bodies. Evidence references store file path, line range, symbol refs and hashes only.
<!-- PHASE-5-5-SCANNER-CONTRACTS:END -->
