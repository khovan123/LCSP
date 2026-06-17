# Phase 1B Scanner Specification Checkpoint Report

## Review Scope

Checkpoint review for `LCSP — Conditional Implementation Documentation Branch`, Phase 1B Checkpoint A.

Reviewed files:

- `docs/workflows/lcsp-conditional-implementation-documentation-branch.md`
- `docs/workflows/phase-1b-scanner-spec-amendment-report.md`
- `docs/specs/implementation-contract.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/evidence-report-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/data-model-draft.md`
- `docs/specs/domain-model.md`
- `docs/specs/scoring-model.md`
- `docs/specs/reconciliation-policy.md`
- `docs/qa/test-strategy.md`
- `docs/qa/acceptance-criteria.md`
- `docs/design/traceability-matrix.md`
- `docs/security/source-code-privacy-policy.md`
- `docs/security/threat-model.md`
- `docs/implementation-readiness.md`

Source-of-truth priority used:

1. `docs/specs/implementation-contract.md`
2. `docs/specs/static-analysis-scanner-contract.md`
3. `docs/workflows/phase-1b-scanner-spec-amendment-report.md`
4. Existing architecture/spec/design/QA documents

## Criteria Results

| ID | Result | Evidence | Required Fix |
|---|---|---|---|
| SCA-01 | PASS | `static-analysis-scanner-contract.md` defines a static-analysis-only safety boundary and forbids executing customer code, install/build/test commands, Docker Compose, CI workflows and API probes. `evidence-report-contract.md` repeats the same static-analysis-only scanner boundary. | None |
| SCA-02 | PASS | Scanner workspace is defined as an ephemeral isolated container or restricted temporary volume, with repository snapshot and commit pinning, shallow clone, non-root execution, restricted filesystem/outbound access and temporary workspace deletion. | None |
| SCA-03 | PASS | Language support policy makes TypeScript, JavaScript and Python first-class semantic analysis targets; Java, Kotlin, Go, C#, Rust are basic-signal only; unsupported/binary/minified files are skipped with coverage limitation. | None |
| SCA-04 | PASS | MVP technology decisions assign Tree-sitter to generic parsing/fallback, TypeScript Compiler API to TS/JS semantic analysis and Python built-in `ast` plus import resolver to Python semantic analysis. | None |
| SCA-05 | PASS | `static-analysis-scanner-contract.md` states CodeQL is not an MVP runtime dependency and is future evaluation only; the Phase 1B amendment report repeats the same decision. | None |
| SCA-06 | PASS | L0-L4 controlled analysis levels are defined, and unrestricted whole-repository global data-flow analysis is explicitly out of MVP scope. | None |
| SCA-07 | PASS | The scanner principle says the scanner collects technical evidence and does not determine legal risk directly; invocation/provider/framework signals are distinct finding types. | None |
| SCA-08 | PASS | Input classification requires evidence fusion from DTO/schema, parameters, prompt variables, database fields, upstream methods, data-flow paths and domain names; variable or field name alone is weak evidence. | None |
| SCA-09 | PASS | Output detection distinguishes AI output types from downstream actions; scanner taxonomy separates `AI_OUTPUT_SIGNAL`, `AI_DECISION_FLOW_SIGNAL`, `RANKING_SIGNAL`, `RECOMMENDATION_SIGNAL` and `STATUS_UPDATE_SIGNAL`. | None |
| SCA-10 | PASS | Automated decision requires AI output, decision rule/threshold/branch, state-changing or approve/reject action, and no evidenced human-review step. | None |
| SCA-11 | PASS | Human review policy distinguishes `present`, `absent with bounded-path evidence` and `unclear`; generic `review()` is insufficient and absence of a review signal is not proof by itself. | None |
| SCA-12 | PASS | Graph contract defines node/edge types and requires `scan_id`, `repository_id`, `commit_sha`, `file_path`, `symbol_ref`, `evidence_hash`, `scanner_version`, `ruleset_version` and `confidence`; graph persistence excludes raw source and complete AST bodies. | None |
| SCA-13 | PASS | AIUsageFlow claim-level model requires `field`, `value`, `confidence`, `evidence_refs`, `source_type` and `uncertainty_reason`; AI usage spec and rule mapping spec require the same claim-level evidence. | None |
| SCA-14 | PASS | Dynamic imports, reflection, runtime prompts, queue boundaries, generated/minified code, missing coverage and unresolved output paths emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION`, set claims to `unknown`/`unclear` and prohibit overclaiming legal risk. | None |
| SCA-15 | PASS | LLM may receive only sanitized structured metadata; raw source, full prompts and secrets are excluded; LLM may summarize/explain but may not override deterministic evidence or make legal classification decisions. | None |
| SCA-16 | PASS | Reconciliation policy distinguishes `scanner-derived`, `manager-declared` and `reconciled` claims; Manager may resolve with traceable confirmation/update but must not arbitrarily override scanner evidence. | None |
| SCA-17 | PASS | Static scanner, AI usage, reconciliation and legal mapping specs all state claims without evidence refs cannot be used for legal rule matching or final classification. | None |
| SCA-18 | PASS | Required fixtures cover internal summarization, loan approval, HR ranking, chatbot, human-reviewed decision, auto approve/reject, dynamic prompts, provider-only detection, unresolved downstream path and Wizard/source mismatch; metrics cover invocation, purpose, input, output, downstream action, human review, false positives, abstention, claim evidence and rule-mapping eligibility. | None |
| SCA-19 | PASS | Phase 1B.1 report states no Phase 1B architecture alignment, Phase 2 pack, code, backlog, story, sprint or test source was created; `docs/implementation/` still contains only the three Phase 1 architecture documents. | None |
| SCA-20 | PASS | Readiness remains `PRODUCT_READY_FOR_VALIDATION`, `READY_FOR_ARCHITECTURE_REVIEW`, `VALIDATION_READY`, `IMPLEMENTATION_BACKLOG_BLOCKED`, `IMPLEMENTATION_NOT_READY`; no reviewed document unlocks implementation backlog. | None |

## Contract Consistency Review

The canonical scanner specification is consistent with the implementation contract:

- Required pipeline remains `TechnicalEvidenceReport -> Schema Gate -> Quality Gate -> TechnicalProfile -> AI Usage Flow Analysis -> Reconciliation -> VerifiedProfile -> Legal Rule Matching / RAG -> Risk Classification`.
- Provider/model/framework detection alone is explicitly insufficient for legal risk classification.
- Unknown usage purpose blocks final classification or requires traceable Manager clarification.
- Legal rule matching requires evidence-backed `AIUsageFlow` claims and legal citation traceability.
- Scanner evidence is technical evidence only; legal classification remains downstream of VerifiedProfile and legal rule matching.

No contradiction was found that would block Phase 1B.2 architecture alignment.

## Scanner Safety Boundary Review

Scanner safety boundary passes checkpoint:

- Static-analysis only.
- No customer source execution.
- No install/build/test/container/CI execution.
- No API probing.
- Commit-pinned repository snapshot.
- Ephemeral isolated workspace.
- Non-root and restricted execution controls documented.
- Raw source, full prompt content and secrets excluded from LLM input, ordinary evidence records and audit logs.
- Persisted outputs are metadata, hashes, graph paths, structured findings and coverage limitations.

The exact sandbox technology remains open, but the required behavior is already specified tightly enough for architecture alignment.

## AIUsageFlow Evidence Model Review

AIUsageFlow evidence model passes checkpoint:

- Each material claim has `value`, `confidence`, `evidence_refs`, `source_type` and uncertainty handling.
- Scanner-derived, Manager-declared and reconciled claims remain distinguishable.
- Claims without evidence refs are ineligible for legal rule matching or final classification.
- Unknown/unclear critical claims trigger clarification, conflict or final-classification block.
- LLM may help summarize sanitized metadata but cannot create unsupported claims, override deterministic evidence or make legal conclusions.

## A2-b Fixture and Metric Coverage Review

A2-b coverage is sufficient for this specification checkpoint:

- Fixtures cover internal low-impact summarization, loan approval/credit scoring, HR ranking, chatbot, human-reviewed decision, automated approve/reject, dynamic runtime prompt, provider-only detection, unresolved downstream path and Wizard/source mismatch.
- Metrics cover AI invocation detection precision, business purpose mapping precision, input category accuracy, output type accuracy, downstream-action accuracy, human-review accuracy, automated-decision false-positive rate, unknown/abstain correctness, claim evidence completeness and legal-rule mapping eligibility completeness.
- Acceptance thresholds remain a validation/readiness decision, not a Phase 1B.2 architecture blocker.

## Open Decisions Classification

| Decision | Classification | Recommended Default | Owner | Required Before |
|---|---|---|---|---|
| Exact scan sandbox technology | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Ephemeral isolated container or restricted temporary volume with non-root execution, restricted filesystem access, restricted outbound network after repository retrieval and cleanup verification | Architecture / Security | Implementation execution |
| TypeScript analyzer process packaging | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Restricted Node.js analyzer process or isolated sidecar invoked by Python Worker; architecture must preserve no code execution, no dependency install and no project script execution | Architecture | Implementation execution |
| Graph metadata physical schema | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Keep the logical graph contract now; choose normalized PostgreSQL tables plus JSONB payloads during implementation design | Architecture / Backend | Implementation execution |
| A2-b acceptance thresholds | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Define thresholds after validation fixtures produce real results; keep A2-b as backlog-unblock evidence | PM / QA / Architecture | Implementation backlog unblock |
| CodeQL evaluation | FUTURE_SCOPE_DECISION | Record CodeQL only as a future evaluation option, not an MVP runtime dependency | Architecture | Future scanner evaluation |

No open decision is classified as `DECISION_REQUIRED_BEFORE_PHASE_1B_2`.

## Explicitly Blocked Activities

This checkpoint does not permit:

- Phase 1B.2 execution inside this checkpoint run.
- Phase 2 Technical Implementation Documentation Pack.
- Source code generation.
- Test source generation.
- Database schema code.
- API implementation.
- Backlog, epic, story, sprint or task creation.
- Implementation execution.
- Readiness status changes.
- Implementation backlog opening.

## Decision

PHASE_1B_SCANNER_SPEC_CHECKPOINT_PASS_WITH_DECISIONS_REQUIRED

PHASE_1B_2_ARCHITECTURE_ALIGNMENT_ALLOWED

This permission is limited to `bmad-create-architecture` for Phase 1B.2 scanner architecture alignment. It does not permit implementation backlog creation, epic/story creation, sprint planning, code generation or development execution.

Readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
