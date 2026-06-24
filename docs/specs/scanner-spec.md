# Scanner Specification

## Status

AUTHORITATIVE — A-TO-Z RUNNABLE MVP

## Purpose

This is the sole canonical domain specification for Repository Scan and static-analysis evidence behavior. Python Scanner Worker owns the scan lifecycle. Implementation guidance lives in `docs/implementation/scanner-implementation.md` and `docs/implementation/scanner-worker-implementation.md`; runtime object flow lives in `docs/developer-execution-blueprints/scanner-data-journey.md`.

This document is a design contract, not source code, backlog, story, sprint plan, or test implementation.

## Scanner Principle

The scanner collects traceable technical evidence. It does not determine legal risk.

```text
TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> Legal Matching
-> Risk Classification
```

Provider/model/framework presence alone never creates a risk level or proves active model invocation.

## Static-Analysis-Only Boundary

Allowed:

- read files from the selected commit-pinned snapshot;
- parse source, manifests, configuration templates, schemas, migrations, and low-confidence documentation hints;
- build bounded AST/CST, call, data-flow, and evidence graphs;
- produce redacted metadata, hashes, evidence refs, findings, reports, and coverage limitations.

Forbidden:

- execute customer source code;
- install dependencies;
- run package scripts, builds, tests, Docker, CI, shell scripts, or repository workflows;
- probe customer endpoints;
- persist raw source or full AST bodies long term;
- send raw source, secrets, full prompts, or full AST bodies to an LLM.

## MVP Technology Decisions

| Concern | Canonical MVP Decision |
|---|---|
| Scan lifecycle runtime | Python Scanner Worker within Python Worker Platform, Python 3.11+ |
| Queue ownership | Python Worker is sole consumer of `command.scan.requested.v1` |
| SBOM/dependency inventory | Syft |
| JS/TS dependency usage | Knip |
| Python dependency usage | deptry |
| Python parsing | stdlib `ast` + `libcst` |
| Python analysis | first-class bounded semantic static analysis |
| TS/JS analysis | Node.js `ts-morph` subprocess invoked by Python Worker |
| AI/custom pattern rules | Semgrep custom rules |
| Other/cross-language structure | tree-sitter/custom parser augmentation |
| Other languages | basic manifest/import/config/structural signals with explicit coverage limits |
| Graph assembly | scan-local normalized graph in Python Worker |
| Persistence | PostgreSQL metadata only |
| Workspace | restricted ephemeral directory with verified cleanup |
| LLM boundary | LLM Gateway only, sanitized metadata only |

Superseded active behavior:

- TypeScript-first scanner lifecycle ownership;
- Python syntax-only support;
- Node scanner worker consuming the scan command.
- Scanner pipeline limited to `ast`, `libcst`, and `ts-morph`.

Historical Phase 5.2I evidence remains in git history and archived decision records.

## Language Support

| Level | Languages | Required Behavior |
|---|---|---|
| First-class bounded semantic analysis | Python | imports, packages, modules, functions, classes, AI invocation, inputs/outputs, bounded L2-L3 cross-module flow, decision and human-review paths |
| First-class bounded semantic analysis | TypeScript, JavaScript | AST/import/symbol/call analysis and bounded flow through `ts-morph` subprocess |
| Basic signal detection | Java, Kotlin, Go, C#, Rust | dependencies, imports, config, endpoint hints; no complete semantic-flow claim |
| Unsupported | binary, minified, generated, oversized, unknown | skip safely and emit coverage limitation |

The scanner must never claim complete understanding of arbitrary dynamic code.

## Required Pipeline

1. Validate and lock ScanJob.
2. Create restricted workspace.
3. Materialize selected repository snapshot.
4. Inventory files and enforce bounds.
5. Parse manifests and configuration.
6. Run Syft SBOM/dependency inventory.
7. Run Knip and deptry dependency usage analysis.
8. Classify language/support level.
9. Analyze Python via AST/CST.
10. Analyze TS/JS via subprocess when present.
11. Run tree-sitter/custom parser structural augmentation.
12. Run Semgrep custom AI rules.
13. Detect AI invocation and provider/framework signals.
14. Trace bounded model input/output and downstream actions.
15. Detect human-review and automation evidence.
16. Fuse import/call/data-flow/dependency/domain signals.
17. Build normalized graph metadata.
18. Generate TechnicalFinding records.
19. Build TechnicalEvidenceReport.
20. Run schema/privacy/quality gates.
21. Delete and verify workspace cleanup.
22. Transactionally mark terminal state and stage completed/failed event.

`event.scan.completed.v1` is allowed only when the report is `QUALITY_VALID`, the ScanJob is `COMPLETED`, and cleanup verification exists.

## Controlled Analysis Levels

| Level | Scope | Behavior |
|---|---|---|
| L0 | repository inventory | languages, manifests, frameworks, routes, schemas, configs |
| L1 | single function/method | model input -> invocation -> output -> local branch/action |
| L2 | same module/package | bounded nearby call tracing |
| L3 | controlled cross-module | route/controller -> service -> invocation -> repository/status/review action |
| L4 | unsupported/dynamic boundary | emit uncertainty/coverage limitation; do not guess |

Only start L2/L3 tracing after an AI invocation candidate is found. Dynamic imports, reflection, remote/runtime configuration, queue breaks, generated code, or unresolved external services terminate the bounded path with explicit uncertainty.

## Toolchain Contracts

All scanner tools must have pinned versions, configuration hashes, ruleset versions, bounded CPU/memory/time/file/output limits, validated and redacted stdout/stderr, normalized structured output, and tool/version/config provenance in the TechnicalEvidenceReport.

Tools must run inside the restricted scanner workspace. They must not install repository dependencies, run customer application code, run package scripts, run tests, run Docker/CI workflows, or probe customer endpoints.

Tool failure becomes either an explicit `CoverageLimitation` or terminal scan failure according to a severity table. The severity table for Syft, Knip, deptry, Semgrep, tree-sitter/custom parser, `ast/libcst`, and `ts-morph` is `TECHNICAL_DECISION_REQUIRED`.

## Dependency and SBOM Contracts

Normalize dependency output into:

- `PackageDependency`;
- `SBOMComponent`;
- `DependencyUsageFact`.

Dependency states must distinguish:

- declared;
- discovered;
- used or reachable;
- unused;
- missing;
- transitive;
- uncertain.

No tool result may independently become legal truth, classification truth, proof of active AI use, or proof of automated decision-making.

## Canonical Finding Types

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
- `HARM_POTENTIAL_SIGNAL`
- `SYSTEM_PROMPT_DETECTED`
- `DYNAMIC_SYSTEM_PROMPT_REFERENCE`
- `RAG_USAGE_SIGNAL`
- `MODEL_OUTPUT_PARSER_SIGNAL`
- `SCAN_COVERAGE_LIMITATION`
- `UNSUPPORTED_DYNAMIC_FLOW`

`AI_MODEL_USAGE` is not a canonical finding type. Use provider/framework presence or model invocation according to evidence strength.

## Finding Contract

```json
{
  "findingId": "uuidv7",
  "findingType": "AI_MODEL_INVOCATION",
  "sourceType": "SOURCE_CODE",
  "filePath": "app/service.py",
  "symbolRef": "LoanService.evaluate",
  "lineRange": {"startLine": 10, "endLine": 14},
  "graphPathId": "optional",
  "evidenceRefs": ["ev:..."],
  "evidenceHash": "sha256:...",
  "confidence": 0.9,
  "metadata": {}
}
```

Rules:

- IDs, types, source class, evidence hash, confidence, and metadata are required.
- File/symbol/line refs are stored when available.
- Material graph-derived claims include graph path/evidence refs.
- Metadata contains no raw source, secrets, full prompt, tokens, or full AST.

## Signal Semantics

### Provider and Framework

`AI_PROVIDER_USAGE` or `AI_FRAMEWORK_USAGE` indicates possible capability only. Without a linked invocation on the same evidence path, confidence is capped below `0.60` and downstream usage claims abstain.

### Model Invocation

`AI_MODEL_INVOCATION` requires static evidence of an API/local inference call, not just package presence or configuration.

### Input and Output

Input categories may use route/DTO/schema/field/prompt-variable/data-flow evidence. Output types may include summary, generated text, score, ranking, recommendation, classification label, decision label, or unknown.

Variable names alone are weak evidence. Confidence rises only when independent signals agree.

### Decision Flow

Automated-decision evidence requires:

```text
AI output
+ bounded branch/threshold/rule
+ state-changing approve/reject/rank/status action
+ no evidenced human-review step on the bounded path
```

Do not infer full automation when the downstream path is incomplete.

### Human Review

Positive evidence includes explicit review states, queues, reviewer assignment, approval routes, or Manager/human approval before final action. Absence of a generic review-named function is not enough. Use `present`, `absent_with_bounded_path`, or `unclear`.

### Domain and Harm Signals

Domain/harm findings are technical/context signals only. AIUsageFlow owns material business/harm claims after combining scanner evidence, WizardProfile, confidence, and uncertainty rules.

## AI Library and Invocation Rule Groups

Initial rulesets include:

- OpenAI;
- Gemini;
- Anthropic;
- Hugging Face;
- LangChain;
- LlamaIndex;
- scikit-learn;
- TensorFlow/Keras;
- PyTorch;
- local HTTP inference endpoints;
- generic predict/infer/generate/classify/score calls.

Rulesets are versioned YAML/JSON. Every finding records ruleset version.

## Graph Contract

Scan-local graph node examples:

`ROUTE`, `CONTROLLER`, `FUNCTION`, `METHOD`, `SERVICE`, `DTO`, `ENTITY`, `DATABASE_FIELD`, `CONFIG_REFERENCE`, `PROMPT_REFERENCE`, `AI_PROVIDER`, `AI_MODEL_INVOCATION`, `AI_INPUT`, `AI_OUTPUT`, `DECISION_RULE`, `STATUS_UPDATE`, `RANKING_ACTION`, `NOTIFICATION_ACTION`, `HUMAN_REVIEW_STEP`, `QUEUE_ACTION`, `USER_RESPONSE`, `DOMAIN_SIGNAL`, `DATA_CATEGORY_SIGNAL`.

Edge examples:

`CALLS`, `IMPORTS`, `READS`, `WRITES`, `PASSES_TO`, `RETURNS`, `FLOWS_TO`, `CONTROLS`, `PERSISTS`, `RANKS`, `APPROVES`, `REJECTS`, `ESCALATES_TO_REVIEW`, `RESPONDS_TO_USER`.

Persist node/edge identity, type, scan/repository/commit refs, path/symbol/line refs, evidence hash, scanner/ruleset version, and confidence only.

## Confidence Model

```text
rawConfidence =
  baseByFindingType
  + directEvidenceBonus
  + corroborationBonus
  - coveragePenalty
  - ambiguityPenalty

confidence = roundHalfUp(clamp(rawConfidence, 0.00, 1.00), 2)
```

Representative bases:

| Finding | Base |
|---|---:|
| Provider/framework presence | 0.35 |
| Model invocation | 0.70 |
| Input/output signal | 0.55 |
| Decision-flow signal | 0.65 |
| Automated decision | 0.75 |
| Human review | 0.70 |
| Ranking/recommendation | 0.60 |
| Status update | 0.65 |
| User impact/sensitive data | 0.60 |
| Domain context | 0.50 |
| Harm potential | 0.55 |
| Coverage limitation / unsupported flow | 1.00 as certainty of limitation, not business claim |

Adjustments:

- direct AST/CST/symbol/path evidence: `+0.15`;
- independent corroboration: `+0.05` each, capped `+0.15`;
- material coverage limitation: `-0.15` each, capped `-0.30`;
- unresolved callee/output/review path: `-0.20`;
- duplicate evidence refs do not add corroboration.

LLM interpretation is support only and never overrides deterministic evidence.

## Unknown and Abstain Behavior

Emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION` for:

- dynamic import/reflection;
- runtime prompt/config from DB or remote source;
- proprietary/external service boundary;
- queue/event break without trace;
- generated/minified/oversized files;
- missing source coverage;
- unresolved output/action path.

Relevant claims remain unknown/unclear with an uncertainty reason.

## Python-Specific Requirements

Python first-class bounded analysis includes:

- package/module/import resolution within the snapshot;
- functions, classes, methods, decorators, async calls, aliases and route handlers;
- FastAPI/Flask/Django/Celery/Pydantic patterns where covered by rules;
- OpenAI/Gemini/Anthropic/Hugging Face/LangChain/LlamaIndex and common ML invocation patterns;
- bounded function/module/cross-module flow;
- model input/output, branch/action, and human-review paths;
- explicit dynamic-flow limitations.

Python support is not complete whole-program static analysis. It is bounded L0-L3 analysis with L4 dynamic/unsupported boundaries.

Python detection examples include:

- `openai.OpenAI()`, `client.chat.completions.create`, `AsyncOpenAI`;
- `anthropic.Anthropic`, `client.messages.create`, `AsyncAnthropic`;
- `genai.GenerativeModel`, `model.generate_content`;
- Hugging Face `pipeline(...)`, `AutoModel.from_pretrained`, sequence-classification models;
- LangChain `LLMChain`, `ChatOpenAI`, `AgentExecutor`, LCEL `prompt | llm`, `chain.invoke`;
- LlamaIndex `VectorStoreIndex`, `QueryEngine`, `LLMPredictor`;
- PyTorch/TensorFlow/Keras/sklearn inference patterns such as `model.forward`, `model.predict`, `Pipeline.predict`;
- local HTTP inference endpoints such as `/predict`, `/infer`, `/generate`, `/classify`, `/score`.

Python human-review evidence examples include:

- `PENDING_REVIEW`, `MANAGER_REVIEW`, `HUMAN_APPROVAL`, `MANUAL_REVIEW` states;
- `@requires_review`, `@needs_approval` decorators;
- `assign_reviewer(...)`, `require_approval(...)`, `send_to_review(...)` calls;
- state-machine transitions to review state before final action.

Generic function names such as `review()` are insufficient without surrounding path evidence.

## TS/JS Subprocess Requirements

- Python Worker invokes a fixed Node executable without shell interpolation.
- Analyzer uses `ts-morph` over compiler services.
- Input/output protocol is versioned JSON.
- stdout is schema-validated and stderr is redacted/bounded.
- Analyzer does not write scanner DB rows or publish queue events.
- Failure yields `TS_JS_ANALYZER_FAILED` plus affected-file coverage limitations.

## Security and Workspace

- workspace root: `${LCSP_SCANNER_WORKSPACE_ROOT:-.lcsp/tmp/scanner-workspaces}`;
- non-root/restricted process;
- selected commit only;
- file count, size, depth, and timeout limits;
- restricted outbound access after snapshot retrieval;
- secret redaction before persistence;
- mandatory deletion after success or terminal failure;
- cleanup failure emits `SCANNER_WORKSPACE_CLEANUP_FAILED`, security audit, and blocks downstream;
- idempotency key includes repository, commit, scanner version, and ruleset version.

## LLM Boundary

Allowed LLM input: sanitized route/service/data/output/action/review/confidence/evidence-reference metadata.

Forbidden LLM input: raw source, full system prompts, secrets, provider tokens, credentials, full AST bodies, arbitrary logs.

LLM may summarize evidence or explain uncertainty. It may not invent unsupported claims, override evidence, or make uncited legal conclusions.

## Fixtures and Metrics

Required fixture families:

- internal summarization/assistant;
- loan approval/credit scoring;
- recruitment ranking;
- customer chatbot without decision;
- human-reviewed decision;
- auto-approve/reject path;
- dynamic runtime prompt/import;
- provider present without invocation;
- unresolved downstream path;
- Wizard conflict with source evidence.

Metrics include invocation precision, business-purpose mapping, input/output detection, downstream-action detection, human-review detection, automated-decision false-positive rate, abstention correctness, claim evidence completeness, and legal-matching eligibility completeness.

## Failure Codes

| Condition | Canonical Result |
|---|---|
| Repository access failure | `REPOSITORY_ACCESS_FAILED` |
| File parser failure | `SCANNER_PARSE_FAILED` coverage limitation unless fatal privacy/schema issue |
| TS/JS analyzer failure | `TS_JS_ANALYZER_FAILED` coverage limitation |
| Unsupported dynamic path | `UNSUPPORTED_DYNAMIC_FLOW` |
| Privacy/redaction failure | fail closed before accepted report |
| Cleanup failure | `SCANNER_WORKSPACE_CLEANUP_FAILED`; terminal failure |

## Traceability

| Concern | Document |
|---|---|
| Scanner behavior, taxonomy and Python/TS/JS analysis profiles | `docs/specs/scanner-spec.md` |
| Runtime object lifecycle | `docs/developer-execution-blueprints/scanner-data-journey.md` |
| Build/package structure | `docs/implementation/scanner-implementation.md` |
| Scanner worker process | `docs/implementation/scanner-worker-implementation.md` |
| Python Worker Platform | `docs/implementation/python-worker-platform-implementation.md` |
| Persistence | `docs/implementation/persistence-implementation.md` |
| Queue | `docs/implementation/queue-implementation.md`, `docs/specs/event-catalog.md` |
| AIUsageFlow | `docs/specs/ai-usage-flow-domain-spec.md` |
| Requirements | `docs/specs/requirements-traceability-matrix.md` |

## Current Planning Status

```text
CONSOLIDATION_PASS_APPLIED
SCANNER_BEHAVIOR_AUTHORITY_CONSOLIDATED
UX_DRAFT_CREATED
UX_DRAFT_REBASE_PENDING
STORY_TRACEABILITY_PENDING
IMPLEMENTATION_NOT_AUTHORIZED
```

This status freezes the UX draft for rebase after document consolidation. It does not certify implementation readiness or authorize story execution.
