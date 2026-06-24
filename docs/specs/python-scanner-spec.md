# Python Scanner Specification

## Status

AUTHORITATIVE — A-to-Z Runnable MVP (Phase 5.2J)

New document per SPRINT-CHANGE-PROPOSAL-5.2J (2026-06-23). Python is first-class in the MVP scanner per PROJECT_OWNER_LOCKED decision (ADR-023).

## Purpose

Defines Python-language scanner capability requirements for the A-to-Z runnable MVP. Phase 5.2L expands the scanner from Python/TS semantic analysis into a full toolchain including Syft, Knip, deptry, Semgrep custom rules, and tree-sitter/custom parser. This is a design/spec contract, not source code.

## Python Language Support Level

```text
PYTHON_SCANNER_SUPPORT_LEVEL: FULL_STATIC
```

Supersedes Phase 5.2I classification of `SYNTAX_ONLY` / `DEFERRED_FROM_CONTROLLED_MVP_PROTOTYPE`.

## Phase 5.2L Toolchain Boundary

Python Scanner Worker orchestrates:

- Syft for SBOM/dependency inventory;
- Knip for JavaScript/TypeScript dependency usage;
- deptry for Python dependency usage;
- Python `ast` + `libcst` for Python semantic analysis;
- bounded Node `ts-morph` CLI for TypeScript/JavaScript semantic analysis;
- tree-sitter/custom parser for structural augmentation;
- Semgrep custom rules for AI provider/framework/model invocation/prompt/data-flow/downstream decision/ranking/recommendation/human-review/risky-use signals.

All tools must have pinned versions, config/ruleset hashes, resource limits, redacted output, normalized structured contracts, and failure/coverage provenance. The failure severity table is `TECHNICAL_DECISION_REQUIRED`.

## Authoritative Principle

The Python scanner collects traceable technical evidence from Python repositories. It does not determine legal risk directly. Legal classification happens only after the full pipeline: TechnicalEvidenceReport → TechnicalProfile → AIUsageFlow → Reconciliation → VerifiedProfile → Legal Rule Matching → Risk Classification.

## Required Python Analyzer Capabilities

| Capability | Implementation Approach | Analysis Level |
|---|---|---|
| Imports and package usage | `ast` `import`/`from` extraction; pip/pyproject.toml manifest parsing | L0 |
| Module relationships | Cross-module call graph (bounded scope) | L2-L3 |
| Functions, classes, methods | `ast.FunctionDef`, `ast.ClassDef`, `ast.AsyncFunctionDef` | L1 |
| AI provider/model invocation | Pattern matching against provider API patterns | L1 |
| Input/output tracking | Argument binding and return-value flow | L1-L2 |
| Model-output-to-condition/action | Downstream branch/action after model call | L1-L2 |
| Human-review paths | Decorator/annotation/conditional pattern matching | L1-L2 |
| Cross-module flow (controlled) | Service → AI invocation → action chains | L2-L3 |
| Framework-level context | FastAPI, Django, Flask, Celery, asyncio worker patterns | L0-L1 |
| Evidence references | Metadata-only, no raw source persistence | All |
| Dynamic boundary handling | `UNSUPPORTED_DYNAMIC_FLOW`, `SCAN_COVERAGE_LIMITATION` | L4 |

## AI Library Detection Patterns

| Library / SDK | Detection Signals |
|---|---|
| `openai` | `openai.ChatCompletion`, `client.chat.completions.create`, `AsyncOpenAI`, `AzureOpenAI` |
| `anthropic` | `anthropic.Anthropic`, `client.messages.create`, `AsyncAnthropic` |
| `google-genai` / `google.generativeai` | `genai.GenerativeModel`, `model.generate_content` |
| `transformers` (HuggingFace) | `pipeline`, `AutoModelForSequenceClassification`, `Trainer`, `AutoModel.from_pretrained` |
| `langchain` | `LLMChain`, `ChatOpenAI`, `AgentExecutor`, LCEL `chain.invoke` |
| `llama_index` | `VectorStoreIndex`, `QueryEngine`, `LLMPredictor` |
| `torch` / `pytorch` | `torch.nn.Module`, `model.forward`, inference patterns |
| `tensorflow` / `keras` | `model.predict`, `model.fit` (inference detection only) |
| `sklearn` | `model.predict`, `Pipeline`, `model.transform` (inference detection only) |
| Local HTTP inference | `/predict`, `/infer`, `/generate`, `/classify`, `/score` route calls |

Presence without invocation evidence: `AI_PROVIDER_USAGE` or `AI_FRAMEWORK_USAGE`. Must not produce `AI_MODEL_INVOCATION` without call-site evidence.

## Analysis Levels (Python)

| Level | Python Scope |
|---|---|
| L0 | File inventory: imports, package manifests, framework detection, route/entry-point discovery |
| L1 | Single-function local flow: input → model call → output → condition/return/action |
| L2 | Same-module flow: follow function calls within same Python module |
| L3 | Controlled cross-module: service → AI invocation → repository/status action |
| L4 | Unsupported boundary: dynamic import, `importlib`, runtime DB config, queue break, generated code |

Start L2/L3 tracing only after an AI invocation candidate is detected. Emit `UNSUPPORTED_DYNAMIC_FLOW` at L4 boundaries.

## Unsupported / Dynamic Boundary Behavior

When any of the following is encountered, emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION`:

- `importlib.import_module(...)` or `__import__(...)`
- Runtime model loading from database or remote config
- Multiprocessing queue breaks without traceable handoff
- Dynamically constructed function/class names
- External proprietary AI service without detectable SDK
- Missing source coverage (binary, compiled, generated)

Then set relevant AIUsageFlow claim to `unknown` or `unclear`. Do not overclaim legal risk.

## Human Review Detection (Python)

Positive human-review evidence:

- `PENDING_REVIEW`, `MANAGER_REVIEW`, `HUMAN_APPROVAL`, `MANUAL_REVIEW` status strings
- `@requires_review`, `@needs_approval` decorators
- `assign_reviewer(...)`, `require_approval(...)`, `send_to_review(...)` call patterns
- State machine transitions to review state before final action

Rules:
- Generic `review()` function name alone is insufficient.
- Absence of review signal is not proof that human review is absent.
- Use `present`, `absent with bounded-path evidence`, or `unclear`.

## Evidence Reference Requirements

| Field | Requirement |
|---|---|
| `finding_id` | Stable within report |
| `finding_type` | Must use canonical finding type catalog |
| `source_type` | `SOURCE_CODE` for Python AST findings; `DEPENDENCY` for manifest findings |
| `file_path` | Module-relative path; no raw source body |
| `symbol_ref` | `ClassName.method_name` or `function_name` when available |
| `line_range` | Start/end line; no source code body |
| `evidence_hash` | SHA-256 of normalized metadata (not source text) |
| `confidence` | 0.0-1.0; use canonical confidence formula |

Forbidden in evidence refs:
- Raw Python source body
- Full AST body
- Secret values, tokens, or credentials
- Full prompt text

## Normalized Dependency Facts

The Python scanner platform must preserve package and dependency facts separately from AI usage claims:

- `PackageDependency`;
- `SBOMComponent`;
- `DependencyUsageFact`;
- dependency states: declared, discovered, used/reachable, unused, missing, transitive, uncertain.

Dependency/tool facts can support evidence and coverage analysis, but cannot independently prove active AI use, legal truth, classification truth, or automated decision-making.

## Confidence Rules (Python)

| Evidence | Confidence Guidance |
|---|---|
| Direct `openai.chat.completions.create(...)` call | 0.85-0.95 (AI_MODEL_INVOCATION) |
| AI output variable passed to `approve()` or `reject()` | 0.80-0.92 (AI_DECISION_FLOW_SIGNAL) |
| `PENDING_REVIEW` state before final action | 0.75-0.88 (HUMAN_REVIEW_SIGNAL) |
| `import openai` without call evidence | 0.30-0.45 (AI_PROVIDER_USAGE; cap at 0.59) |
| `from langchain import *` without usage | 0.30-0.45 (AI_FRAMEWORK_USAGE; cap at 0.59) |
| Dynamic model loading | 0.00-0.39 (UNSUPPORTED_DYNAMIC_FLOW) |

Provider/framework presence cap: `finding.confidence = min(calculated_confidence, 0.59)` if no linked invocation.

## Common Python AI/ML Patterns

### LangChain LCEL Pipeline
Detect: `prompt | llm` operator; `chain.invoke`; `LLMChain`; `AgentExecutor.run`.

### OpenAI Chat
Detect: `openai.OpenAI()`, `client.chat.completions.create`, `AsyncOpenAI`.

### HuggingFace Transformers
Detect: `pipeline(...)` from `transformers`; `AutoModel.from_pretrained`.

### FastAPI Route with AI
Detect: FastAPI route decorator + AI invocation in handler + output returned to user.

## Non-Claims

- The Python scanner does not determine legal risk.
- It does not claim complete whole-program understanding.
- Dynamic imports, runtime reflection, and external service calls at dynamic boundaries are `UNSUPPORTED_DYNAMIC_FLOW`.
- A2-b2 runtime scanner accuracy acceptance is required post-implementation.
- This spec does not authorize source execution.
