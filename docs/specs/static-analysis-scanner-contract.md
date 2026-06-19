# Static Analysis Scanner Contract

## Purpose

This document is the canonical Phase 1B scanner specification for LCSP. It defines how the MVP repository scanner collects traceable technical evidence for AI Usage Flow Analysis without executing customer code, creating legal conclusions, storing raw source long-term, or sending raw source/full prompts/secrets to LLM.

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

| Concern | MVP Technology | Role |
| --- | --- | --- |
| Scan orchestration | Python Worker | Receives queue job and controls scan lifecycle |
| Generic multi-language parse | Tree-sitter | File inventory, syntax parse and fallback structural analysis |
| TypeScript / JavaScript semantic analysis | Node.js TypeScript Analyzer using TypeScript Compiler API | Import resolution, symbol resolution, controller/service/function call analysis |
| Python semantic analysis | Python built-in `ast` + custom import/module resolver | Import, function call, variable flow and model invocation analysis |
| Graph assembly | Python + NetworkX in-memory graph | Build call/data/control/evidence graph during a scan |
| Graph persistence | PostgreSQL normalized graph metadata + JSONB evidence payloads | Persist nodes, edges, paths and references, not source bodies |
| Detection rules | Versioned YAML/JSON scanner rulesets | Provider/framework/API invocation, decision patterns, review patterns, domain/data signals |
| Secret redaction | Deterministic redaction rules before persistence | Remove credentials, tokens, keys, raw confidential values |
| Scanner workspace | Ephemeral isolated container or restricted temporary volume | Clone/read source only, delete after scan |
| LLM usage | LLM Gateway only | Optional explanation/summarization from sanitized metadata, never raw source |

CodeQL is not an MVP runtime dependency. It may be recorded only as a future evaluation option.

## Language Support Policy

| Support Level | Languages | Required Behavior |
| --- | --- | --- |
| First-class semantic analysis | TypeScript, JavaScript, Python | AST + imports + symbols + AI invocation + local/cross-module flow |
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
16. Workspace Cleanup
17. Evidence Normalization and Quality Gates
18. TechnicalProfile
19. AI Usage Flow Analysis

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

Graph assembly is scan-local. NetworkX graph is temporary and in-memory. PostgreSQL persistence stores only normalized graph nodes, graph edges, evidence paths, references, hashes and structured findings.

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

## Open Decisions

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Exact scan sandbox technology | Ephemeral isolated container or restricted temporary volume | Implementation execution |
| TypeScript analyzer process packaging | Restricted Node.js analyzer process or isolated sidecar | Architecture alignment / implementation docs |
| Graph metadata physical schema | Logical graph contract only | Implementation execution |
| A2-b acceptance thresholds | Metrics defined; thresholds require validation planning/results | Backlog unblock |
| CodeQL evaluation | Future evaluation option only | Future scope decision |

## Traceability

| Concern | Related Document |
| --- | --- |
| Canonical implementation contract | `docs/specs/implementation-contract.md` |
| Evidence report output | `docs/specs/evidence-report-contract.md` |
| Scanner finding taxonomy | `docs/specs/scanner-signal-taxonomy.md` |
| AIUsageFlow object and node | `docs/specs/ai-usage-flow-analysis-spec.md` |
| Rule matching | `docs/specs/ai-usage-rule-mapping-spec.md` |
| Reconciliation | `docs/specs/reconciliation-policy.md` |
| Source privacy | `docs/security/source-code-privacy-policy.md` |
| Threat model | `docs/security/threat-model.md` |
| A2-b validation | `docs/qa/test-strategy.md`, `docs/qa/acceptance-criteria.md` |

## Readiness

This scanner contract does not change readiness:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
