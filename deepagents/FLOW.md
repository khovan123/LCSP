# LCSP Deep-Agent Orchestration

This document defines the LCSP native Deep Agents / LangGraph runtime (Repository
Analyst runtime, 2026-09-30).

Principle: **Deep Agents is the agent runtime; LCSP keeps deterministic governance.**
LCSP does not decide how an agent searches, reads or traces the repository. It owns
authority, tenant scope, assessment/repository/rule identity, evidence provenance,
legal applicability, customer-answer authority, persistence and the completion gate.

## Architecture

```text
Scan job (worker)
  hydrate pinned repository once  -> /workspace/repository
  Codebase Memory index once      -> optional agent tool, never evidence
  technical coverage
  ONE bounded AI-discovery Deep Agent task
      (independent prerequisite; failure => AI gate UNKNOWN + limitation
       => aiDetected-gated rules UPSTREAM_FACT_PENDING; never all-or-nothing)
                    │  accepted technical evidence event
                    ▼
Engineering assessment (deterministic Python per-rule loop = the single orchestrator)
  resolve pinned READY EngineeringRules
     └ not READY -> ENGINEERING_RULE_NOT_READY -> LEGAL_MAINTENANCE / triage handoff
  deterministic applicability (RuleApplicabilityEvaluator)
     MATCHED | NOT_GATED           -> eligible
     NOT_APPLICABLE                -> stop, no analysis
     BLOCKED_UNKNOWN_FACT          -> owner route, no analysis
     UPSTREAM_FACT_PENDING         -> owner route, no analysis  (missing is never NOT_GATED)
  for each eligible rule:
     ONE repository-analyst Deep Agent task, dispatched directly
     (no root-model turn per rule)
        native filesystem/shell + codebase-memory tools
        cite_repository_source / get_code_snippet  -> runtime-minted evidence refs
        submit_rule_assessment (governed)          -> validate -> persist
     per-rule ledger EngineeringRuleAssessment (RuleEvidenceIndex = accepted-evidence ledger)
     BUSINESS_CONTEXT_REQUIRED -> BusinessContextNeed registered
        -> Interview (customer-owned context only, never source)
        -> governed answer resumes the SAME rule only
  finalize_rule_results
     claims from accepted criteria -> EngineeringRuleEvaluator
     -> rule-completion gate -> classification callback -> gap -> report
```

The important boundaries:

- **EngineeringRules are prepared/pinned inputs.** Legal corpus -> LegalRule ->
  EngineeringRule compilation is LEGAL_MAINTENANCE (Workflow A, `triage`) and is separate
  from per-assessment reasoning. There is no Legal Agent in the assessment runtime.
- **One orchestrator.** The Python loop is the only assessment orchestrator. The root
  model does not sequence assessment work and `instructions.md` describes no alternative
  flow. There is no Planner, no Scanner rule pass, no Investigator, no RuleDiscoveryTask
  engine, no DORMANT condition index and no graph pre-execution providers.
- **Applicability is deterministic** and separate from repository evidence.
- **A rule concludes only when every criterion is ready** (completion gate).
- **FINAL_ABSENCE remains disabled.**

## Root supervisor concerns

The root is now the LEGAL_MAINTENANCE supervisor. It delegates to `triage` with the
built-in `task` tool and mirrors that work with `write_todos`
(`TodoListMiddleware`). It has no assessment role.

- **Runtime context.** `orchestration.context.LCSPRunContext` (frozen, set by the
  dispatcher, never by a model): assessment/organization/user/workflow/checkpoint ids,
  pinned artifact versions, `engineering_rule_ids` (exactly one for an analyst task),
  `engineering_rule_version` (contract content hash), `criterion_ids`, `context_revision`,
  `prior_evidence_refs` (accepted refs on resume) and `rule_execution_id` (fresh per
  attempt). Propagated by `context_schema` so governed tools read trusted values.
- **Memory.** LangGraph checkpointing is execution memory for the run and resume point
  only. Authoritative data stays in the API/database: confirmed Interview context,
  assessment state, per-rule results, approved legal corpus and EngineeringRules,
  evaluation outcomes and report/audit artifacts.

## Subagents

`subagents/__init__.FLOW_SUBAGENTS = [triage, interview, repository-analyst]`. Each has
its own `definition.py` (name, model, prompt, minimal tools, middleware).

### Repository Analyst

One task = one EngineeringRule. Input: rule concept/legal intent/goals, required-evidence
criteria, authored `unresolvedConditions` as hints only, relevant confirmed Customer
context, pinned repository identity, and prior accepted evidence on resume. The prompt is
compact (rule, governed context, tools, constraints, output); it prescribes no navigation
sequence. Tools: native filesystem/shell, `CODEBASE_MEMORY_GRAPH_TOOLS`,
`cite_repository_source`, `submit_rule_assessment`, `retrieve_verified_episodes`
(examples only). No `response_format`; a per-task model-call budget
(`AgentRunBudgetMiddleware`, submit-preserving finalize) bounds the run.

### Interview

Customer-owned business context only; never reads source. One distinction at a time,
customer-safe neutral text, no rule ids or citations. The governed answer carries
server-owned identity (`sourceNeedId` = needId, `engineeringRuleId`, `resolvedCriterionIds`),
advances `contextRevision`, and resumes only the rule that owns the need.

### Triage (LEGAL_MAINTENANCE)

Unchanged and separate; see `instructions.md` Workflow A.

## Rule assessment contract

Criterion statuses (`RULE_CRITERION_STATUSES`, contracts + Python mirror):

| Status | Meaning |
| --- | --- |
| `EVIDENCE_FOUND` | positive evidence exists; `evidenceKind` required: `SUPPORTS_REQUIREMENT` or `DEMONSTRATES_VIOLATION` |
| `BUSINESS_CONTEXT_REQUIRED` | only the Customer can supply the fact; carries a `businessContextNeed` |
| `TECHNICAL_UNRESOLVED` | technical gap; needs a limitation code |
| `NOT_OBSERVED` | epistemic: "not established by this investigation". Never means absence; needs a limitation |

Rule status: any BUSINESS_CONTEXT_REQUIRED -> `NEEDS_CONTEXT`; else any
TECHNICAL_UNRESOLVED/NOT_OBSERVED -> `UNRESOLVED`; else `COMPLETED`. `FAILED` is written
only by the runtime loop on provider/runtime failure, for that rule only. An omitted
criterion becomes TECHNICAL_UNRESOLVED + `AGENT_DID_NOT_SUBMIT_CRITERION`.

**Evidence refs are runtime-minted.** `cite_repository_source(path, startLine, endLine)` and
`get_code_snippet` live-verify a range in the pinned repository and mint
`source:{commitSha}:{path}#L{a}-L{b}~{mac}`, an HMAC bound to assessment, rule and execution
(per-process key). `submit_rule_assessment` accepts only such refs, or canonical refs
authorized in `prior_evidence_refs` on resume. The model never writes a ref. On success LCSP
stamps provenance `{assessmentId, repositoryVersion, engineeringRuleId, criterionId,
validator}` on each evidence entry; persisted refs are canonical (mac stripped). These tools
only validate and mint; they never search or choose files.

**Validation** (`validate_rule_assessment`): rule id/version and repository commit match the
trusted context; criterion ids in the rule, no duplicates; EVIDENCE_FOUND needs verified
evidence and a kind; BUSINESS_CONTEXT_REQUIRED needs a neutral, customer-safe need
(one shared validator `rule_assessment/neutral_text.py`); limitations from the shared
vocabulary. Errors return to the agent for correction and resubmit.

**Finalize** (`finalize_rule_results`): SUPPORTS_REQUIREMENT -> `RULE_REQUIREMENT_MET`
(source_verified); DEMONSTRATES_VIOLATION -> `RULE_REQUIREMENT_NOT_MET` on verified positive
evidence (`EvidenceClaimValidator.validate_governed` checks the provenance binding and still
rejects every absence claim); all other statuses -> `UNRESOLVED_ENGINEERING_FACT` with
limitations. `ruleConclusionReady` = every criterion `EVIDENCE_FOUND`.

**Rule-completion gate.** Item `{ruleId, ruleConclusionReady, unresolvedCriterionIds,
activeNeedIds, applicability, contextRevision}`. Runs after the evaluator: when
`ruleConclusionReady` is false, `COMPLIANT`/`NON_COMPLIANT` become `UNKNOWN` with typed
limitations and provenance. Stale rule version or commit is deferred. `NOT_APPLICABLE` is a
legal-scope outcome and is not withheld. FINAL_ABSENCE is disabled
(`absence_may_finalize` is always False, `rule_assessment/absence_policy.py`).

**Applicability.** `RuleApplicabilityEvaluator` over authored `requiredFacts`/`blockingFacts`:
`MATCHED`, `NOT_APPLICABLE`, `BLOCKED_UNKNOWN_FACT`, `UPSTREAM_FACT_PENDING` (a fact an
upstream authority settles, such as `aiDetected`, is not established: not analyzed, not
excluded) and `NOT_GATED` (no authored facts; a missing evaluation is never NOT_GATED).
It runs before analysis and again at finalize.

## Business context and resume

`BUSINESS_CONTEXT_REQUIRED` registers a `BusinessContextNeed` through the single targeted-need
API route: `{needId, engineeringRuleId, criterionId, authoredConditionIndex?, question,
observation, resolutionCriterionIds, evidenceRefs, contextRevision}`, state `ACTIVE` /
`RESOLVED` / `CANCELLED`. The Interview asks the Customer; the governed answer is bound
strictly to the need (unknown criterion or foreign need/rule identity is rejected; resolution
requires every resolution criterion). The answer resumes the SAME rule via `analyze_rule` with
its prior result and raised `contextRevision`. If any eligible rule still waits for context,
no classification callback is posted; it posts when none wait.

## Persistence and retry

- **Ledger.** `EngineeringRuleAssessment`: one flat row per assessment + rule (upsert
  `@@unique([assessmentId, engineeringRuleId])`), fields include status, criteria, limitations,
  `contextRevision`, attempt, execution metadata. A stale write (`contextRevision` lower than
  stored) is rejected. No workflow/lifecycle columns. Worker routes:
  `PUT /internal/assessments/:id/rule-assessments/:ruleId` and
  `GET /internal/assessments/:id/rule-assessments` (envelope `{ok,data}` / problem).
- **AI discovery** persists as its own prerequisite result in the technical-evidence payload
  and is independent of ledger rows; a failure never destroys accepted rule evidence.
- **Failure isolation.** `analyze_rule` retries a provider/malformed-tool failure once; an
  exhausted rule writes `FAILED` for that rule only, and the loop continues.
- **Retry = targeted reanalysis.** Scope is exactly
  `{ ruleScope: { engineeringRuleId, criterionIds, contextRevision, priorResultId? } }`; the
  worker reruns that rule only and carries every other rule's ledger row forward.
- Evidence display and interview snippets resolve canonical `source:` refs from ledger rows
  (path and lines), not from any Scanner graph.

## Observability

Rule-level runtime activities (`RULE_ANALYSIS_ACTIVITIES`): `RULE_ANALYSIS_STARTED`,
`RULE_ANALYSIS_COMPLETED`, `RULE_ANALYSIS_NEEDS_CONTEXT`, `RULE_ANALYSIS_UNRESOLVED`,
`RULE_ANALYSIS_FAILED`, `BUSINESS_CONTEXT_REQUESTED`, `BUSINESS_CONTEXT_RESOLVED`,
`RULE_ANALYSIS_RESUMED`, `RULE_APPLICABILITY_EVALUATED`, `RULE_COMPLETION_GATED`. They are
published as scan runtime events (semantic kind `RULE_ANALYSIS`, field `activity`) and
appear in the workspace Chat rule groups. The live agent stream (below) covers agent/model
lifecycle; it is presentation only.

## Agent-facing tools and harness boundary

```text
tools/
├── common/         # graph tools, submit_rule_assessment, cite_repository_source, ...
├── legal/  triage/ # LEGAL_MAINTENANCE
└── orchestration/
```

Physical tool ownership is separate from subagent exposure: each subagent definition owns
its exact `tools` list. The repository analyst gets the native Deep Agents filesystem and
shell rooted at the assessment repository (`/` = repo root, CWD = repo root) plus the tools
above. LCSP keeps `task` and root `write_todos`, and the default general-purpose subagent is
governed. `.git/` and `.lcsp/` are never customer evidence.

## Deterministic authority

```text
repository-analyst submit -> validated, provenance-stamped criteria
                          -> EvidenceClaim (MET / NOT_MET on positive evidence / UNRESOLVED)
                          -> EngineeringRuleEvaluator -> rule-completion gate
                          -> COMPLIANT | NON_COMPLIANT | UNKNOWN
```

Agents gather and report positive evidence and customer-owned needs. They never decide
applicability, risk tier, or compliance. Deterministic LCSP code owns applicability, evidence
validation, claim evaluation, the completion gate and the authority trail.

## Model policy

Defaults live in `model_policy.py` and can be overridden by deployment env vars.

| Role                | Default model         | Workload                                                       |
| ------------------- | --------------------- | -------------------------------------------------------------- |
| Root orchestrator   | `openai:gpt-5-nano`   | coordination, delegation, todo/state management                |
| Legal triage        | `openai:gpt-5-nano`   | legal work-item triage                                         |
| Interview           | `openai:gpt-5-nano`   | Customer business-context reasoning and clarification          |
| Repository Analyst  | `openai:gpt-5-nano`   | one EngineeringRule per task, tool-heavy repository analysis (`LCSP_REPOSITORY_ANALYST_MODEL`) |
| Narrators/proposers | `openai:gpt-4.1-nano` | bounded narration and proposal fields without reasoning kwargs |

OpenAI `provider:model` specs are constructed through an LCSP provider profile
that explicitly sets the Responses API client contract:
`use_responses_api=True` and `output_version="responses/v1"`. Reasoning is not
enabled merely because the provider is OpenAI. LCSP attaches
`reasoning={"effort": ...}` only when both conditions are true:

1. the agent role is a reasoning owner (`root`, `triage`, `interview`, `repository-analyst`,
   `lcsp-legal-chunk-triage`, `lcsp-engineering-rule-compiler`, or the AI-discovery task);
2. the model is an OpenAI reasoning-capable model such as `gpt-5-mini`,
   `gpt-5.1`, `gpt-5.6-*`, or an o-series reasoning model.

Non-reasoning narrators/proposers omit reasoning even when their model is OpenAI:
`lcsp-final-report-narrator`, `lcsp-classification-rationale-narrator`,
`lcsp-classification-proposer`, and `lcsp-ai-usage-flow-proposer`. Overrides to
non-reasoning models such as `openai:gpt-4.1-nano` also omit reasoning regardless
of whether the Responses API or Chat Completions path is used. Reasoning effort
defaults to `low` and can be overridden with `LCSP_REASONING_EFFORT` (with
legacy aliases retained for deployment compatibility). LCSP does not request
reasoning summaries and does not expose hidden chain-of-thought.

Select all role models together with a code-owned preset:

```env
LCSP_MODEL_PROVIDER=openai
# Or: LCSP_MODEL_PROVIDER=google_genai
# Or: LCSP_MODEL_PROVIDER=llm7
# Or: LCSP_MODEL_PROVIDER=inception
```

OpenAI uses GPT-5 nano with low reasoning for reasoning roles and GPT-4.1 nano
for narrators/proposers. Google uses Gemini 3.5 Flash-Lite for every role:
reasoning roles receive `thinking_level="low"`; narrators/proposers receive `"minimal"`.
Minimal reduces thinking but does not guarantee zero thinking tokens.
The exact Google harness profile supports the reasoning root and subagents;
narrators/proposers use the agent-scoped constructor with minimal thinking. LLM7 uses
`minimax-m2.7` for every role through its OpenAI-compatible endpoint. The
transport remains LangChain OpenAI, but LCSP forces `use_responses_api=False`, routes
credentials only from `LLM7_API_KEY`, and defaults to `https://api.llm7.io/v1`
(`LLM7_BASE_URL` may override the endpoint). Inception uses `mercury-2.5` for
every role through its OpenAI-compatible endpoint with `temperature=0.75`,
`use_responses_api=False`, credentials only from `INCEPTION_API_KEY`, and default
base URL `https://api.inceptionlabs.ai/v1` (`INCEPTION_BASE_URL` may override the
endpoint).

An explicit provider preset takes precedence over legacy per-role model and
reasoning environment variables. Unset `LCSP_MODEL_PROVIDER` to retain legacy
per-role overrides. Unknown preset names fail at startup. Restart the worker after switching.
The preset selects the primary provider. Automatic cross-provider failover occurs only
when one or more `LLM_FALLBACK_PROVIDER_<number>` entries are configured; otherwise
provider exhaustion remains terminal. Configure credentials independently for every
provider in the chain.

All role models receive the same LCSP harness profile.

## Terminal schema failures

Schema/type validation failures stop the affected task immediately. Shared model
governance rejects structured-output repair messages and tool-argument validation
messages before another model call. Native provider validation errors, Pydantic
validation errors, TypeError, and HTTP 400/404/422 request rejection are non-retryable,
including when wrapped by another exception. Transient model retries remain bounded
at two retries. RabbitMQ rejects terminal deliveries with requeue disabled (dead
lettering follows the queue's configured policy), and waiting-assessment reconciliation
does not register terminal failures for automatic resume. Correct the schema/config
before explicitly submitting a new task. Existing running workers need a restart.

## Same-provider token fallback

The selected provider can use an ordered comma-separated API key list:

```env
LCSP_MODEL_PROVIDER=openai
OPENAI_API_KEY=token1,token2,token3,
# For Google instead:
# LCSP_MODEL_PROVIDER=google_genai
# GOOGLE_API_KEY=token1,token2,token3,
# For LLM7 instead:
# LCSP_MODEL_PROVIDER=llm7
# LLM7_API_KEY=token1,token2,token3,
# For Inception instead:
# LCSP_MODEL_PROVIDER=inception
# INCEPTION_API_KEY=token1,token2,token3,
```

Google also accepts `GEMINI_API_KEY` when `GOOGLE_API_KEY` is unset. OpenAI,
Google/Gemini, LLM7, Inception, and Anthropic (reachable through an explicit
`anthropic:` per-agent model override such as `LCSP_INTERVIEW_MODEL`, with keys in
`ANTHROPIC_API_KEY=token1,token2`) use the same credential health/rotation state machine.
The Docker worker started by `scripts/run.mjs` forwards every provider key list, base
URL and the shared `LLM_PROVIDER_TIMEOUT_SECONDS` override (one request timeout for
every provider, default 300s); a test keeps that list in sync with
`provider_credentials.PROVIDER_KEY_ENV`.
LLM7 never falls back to `OPENAI_API_KEY`; its compatible ChatOpenAI client keeps the LLM7
base URL and Chat Completions mode while rotating only `LLM7_API_KEY` slots. Inception
likewise never falls back to `OPENAI_API_KEY`; its compatible ChatOpenAI client keeps
the Inception base URL, temperature, and Chat Completions mode while rotating only
`INCEPTION_API_KEY` slots. Whitespace, empty entries and duplicate keys are removed;
a non-empty list containing only commas/whitespace is invalid. A single key retains
normal SDK behavior.

For multiple keys, each model call tries keys in order on HTTP 401/403/429
(including wrapped provider errors). SDK retries are disabled for these lists.
The model, provider, reasoning/thinking settings, tools, and input stay the same.
Schema/type errors and HTTP 400/404/422 stop immediately without trying another key.
If no cross-provider fallback is configured, exhausting the list stops the task
without model retry, queue requeue, or automatic waiting-assessment resume.
Completed tool operations are not replayed by token fallback. Token values are never included in fallback diagnostics. Restart workers
after changing the environment. This is credential fallback, not data rollback.

### Cross-provider fallback

Provider failover is configured independently from same-provider key rotation:

```env
LCSP_MODEL_PROVIDER=openai
OPENAI_API_KEY=openai1,openai2

LLM_FALLBACK_PROVIDER_1=google_genai
GOOGLE_API_KEY=google1,google2

LLM_FALLBACK_PROVIDER_2=llm7
LLM7_API_KEY=llm7a,llm7b

LLM_FALLBACK_PROVIDER_3=inception
INCEPTION_API_KEY=inception1,inception2
```

`LLM_FALLBACK_PROVIDER_<number>` entries are sorted numerically and accept the
same provider aliases as `LCSP_MODEL_PROVIDER` (`gemini` resolves to
`google_genai`). Each route uses its code-owned provider preset. The current
provider is skipped if it also appears in the fallback list, and duplicate
fallback providers are de-duplicated by first occurrence.

Fallback happens only after the current provider's key pool is exhausted by
credential, quota, transient HTTP, timeout, or connection failures. The next
provider then performs its own full key rotation before the chain advances
again. Schema/request failures and HTTP 400/404/422 never cross providers. A
configured fallback provider must have its own credential environment variable;
LLM7 always uses `LLM7_API_KEY` and Inception always uses `INCEPTION_API_KEY`; neither
borrows `OPENAI_API_KEY`.

## Live Deep Agents stream to workspace Chat

Managed assessment boundaries open one `AgentStreamSession` when their trusted event
contains an assessment identifier. Agent/model execution then uses the LangGraph v2
stream instead of a separate `.invoke()` call, while preserving the previous return
contract by returning the final root `values` projection. Agent streams subscribe to
`messages`, `updates`, `custom`, and `values` with `subgraphs=True`; deterministic
LangGraph workflows use `updates`, `custom`, and `values`. When no live session is
active, the wrappers retain the existing `.invoke()` behavior.

The live bridge emits ordered, bounded events for boundary/agent/subagent lifecycle,
provider-exposed model content and reasoning summaries, tool-call deltas and tool
results, graph updates/state shape, runtime progress, provider fallback, credential
rotation, and structured logs. It never synthesizes or publishes hidden
chain-of-thought, system prompts, private interview context, scratchpads, or raw
message state. Tool arguments and structured payloads are credential-redacted before
they leave the worker. Provider fallback and key rotation keep their existing retry
semantics; streaming only reports those transitions.

```text
Agent Runtime / LangGraph
        │ ordered buffered events
        ▼
WorkerApiClient
        │ POST /internal/scan-jobs/agent-stream-events
        ▼
Nest runtime event service
        │ workspace.agent-stream
        ▼
Workspace SSE → runtime provider → assessment Chat transcript
```

The worker queues event delivery off the model execution thread and attempts to
flush the ordered queue when the managed boundary closes. Live telemetry is
best-effort: queue insertion never blocks model/tool execution, and shutdown uses a
bounded wait so an unavailable/slow API cannot stall the governed assessment workflow.
Excess live events may be dropped under sustained backpressure; durable runtime and
checkpoint state remain authoritative.

The Nest endpoint validates event type/identity, resolves the assessment owner on the
server, applies a second sanitizer before publication, and only exposes replay/live
events to the authenticated owner. Workspace runtime snapshots use the same owner
scope. Browser grouping by `assessmentId` is presentation only and is never treated as
an authorization boundary. The workspace client de-duplicates events by `eventId`,
keeps a bounded recent stream per assessment, and renders deltas in server sequence
order. The live stream is an observability/UI projection and does not replace durable
workflow state.

### Deep Agents test environment isolation

The unit-test harness treats the repository `.env` as external developer state. At
collection startup it discovers the keys declared by that `.env` without importing
their values into tests, removes those keys from the pytest process, and clears them
again before and after each test. Tests that need provider/model credentials or other
runtime configuration must set them explicitly through `monkeypatch` or a fixture.
This prevents a local `LCSP_MODEL_PROVIDER`, `LLM7_API_KEY`, `INCEPTION_API_KEY`, or
similar setting from changing later model-policy tests or causing accidental
real-provider access.
