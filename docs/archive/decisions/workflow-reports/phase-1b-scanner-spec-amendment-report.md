# Phase 1B Scanner Spec Amendment Report

## Scope

Phase 1B.1 created the canonical static-analysis scanner specification and aligned related specs, QA and traceability documents.

Operating mode:

```text
CANONICAL_SCANNER_SPEC_ONLY
```

This phase did not run Phase 1B architecture alignment, Phase 2 documentation pack, code generation, backlog creation, story creation, sprint planning or test source creation.

## Files Created

- `docs/specs/static-analysis-scanner-contract.md`
- `docs/workflows/phase-1b-scanner-spec-amendment-report.md`

## Files Updated

- `docs/workflows/lcsp-conditional-implementation-documentation-branch.md`
- `docs/specs/implementation-contract.md`
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

## Canonical Scanner Decisions

| Concern | Decision |
|---|---|
| Scanner role | Collect traceable technical evidence only; no legal risk decision |
| Safety boundary | Static-analysis only; no source execution, install/build/test/Docker/CI/API probing |
| Generic parser | Tree-sitter |
| TypeScript/JavaScript semantic layer | Restricted Node.js analyzer using TypeScript Compiler API |
| Python semantic layer | Python built-in `ast` plus custom import/module resolver |
| Graph assembly | Python + NetworkX scan-local in-memory graph |
| Graph persistence | PostgreSQL normalized graph metadata + JSONB evidence payloads; no source bodies |
| Rulesets | Versioned YAML/JSON scanner rulesets |
| Workspace | Ephemeral isolated container or restricted temporary volume |
| LLM boundary | LLM Gateway only; sanitized metadata only |
| CodeQL | Future evaluation option only, not MVP runtime dependency |

## Scanner Pipeline

Canonical pipeline:

```text
Scan Job Initialization
-> Ephemeral Workspace Creation
-> Repository Snapshot and Commit Pinning
-> Repository Inventory
-> Dependency and Configuration Analysis
-> Source File Classification
-> Language-specific AST and Symbol Analysis
-> AI Invocation Detection
-> Input-to-AI Data Flow Analysis
-> AI Output and Downstream Action Analysis
-> Human Review and Automation Detection
-> Domain / Business Context Signal Fusion
-> Call Graph and Evidence Graph Assembly
-> TechnicalFinding Generation
-> TechnicalEvidenceReport Generation
-> Workspace Cleanup
-> Evidence Normalization and Quality Gates
-> TechnicalProfile
-> AI Usage Flow Analysis
```

## Language Support Boundaries

| Support Level | Languages | Boundary |
|---|---|---|
| First-class semantic analysis | TypeScript, JavaScript, Python | AST + imports + symbols + AI invocation + local/cross-module flow |
| Basic signal detection only | Java, Kotlin, Go, C#, Rust | Dependency/config/import detection; no complete semantic flow claim |
| Unsupported/binary/minified | All | Skip safely and emit coverage limitation finding |

## Graph and Data-flow Model

The scanner contract defines:

- controlled analysis levels L0-L4;
- graph node types such as `ROUTE`, `SERVICE`, `AI_MODEL_INVOCATION`, `AI_INPUT`, `AI_OUTPUT`, `DECISION_RULE`, `HUMAN_REVIEW_STEP`;
- graph edge types such as `CALLS`, `PASSES_TO`, `FLOWS_TO`, `CONTROLS`, `APPROVES`, `REJECTS`, `ESCALATES_TO_REVIEW`;
- required node/edge metadata: scan id, repository id, commit SHA, file path, symbol ref, line range, evidence hash, scanner/ruleset version and confidence.

NetworkX graph is scan-local and temporary. Persisted graph data is metadata/refs/hashes only.

## AIUsageFlow Evidence Model

AIUsageFlow now requires claim-level evidence:

```text
claim.value
claim.confidence
claim.evidence_refs[]
claim.uncertainty_reason
claim.source_type = scanner-derived | manager-declared | reconciled
```

A scanner-derived claim without evidence refs cannot be used for Legal Rule Matching.

## Unknown / Abstain Behavior

The scanner must emit `UNSUPPORTED_DYNAMIC_FLOW` or `SCAN_COVERAGE_LIMITATION` for dynamic imports, reflection, runtime DB prompts, remote configuration, external proprietary AI service, queue breaks, generated/minified code, missing coverage or unresolved output paths.

Related AIUsageFlow claims become `unknown` or `unclear` with uncertainty reasons. Final classification remains blocked or must route to traceable Manager clarification when the unclear claim is material.

## A2-b Fixture Coverage

Required fixture families were added to QA:

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

## A2-b Metrics

Required metrics:

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
|---|---|---|
| Exact scan sandbox technology | Ephemeral isolated container or restricted temporary volume | Implementation execution |
| TypeScript analyzer process packaging | Restricted Node.js analyzer process or isolated sidecar | Phase 1B architecture alignment / implementation docs |
| Graph metadata physical schema | Logical graph contract only | Implementation execution |
| A2-b acceptance thresholds | Metrics defined; thresholds require validation planning/results | Backlog unblock |
| CodeQL evaluation | Future evaluation option only | Future scope decision |

## Explicitly Blocked Activities

- Source code generation.
- Scanner implementation.
- Test source code creation.
- Database schema code generation.
- Backlog, epic, story, sprint or task creation.
- Phase 2 Technical Implementation Documentation Pack.
- Phase 1B.2 architecture alignment before Checkpoint A.
- Readiness status change.

## Decision

```text
PHASE_1B_SCANNER_SPEC_COMPLETED_WITH_DECISIONS_REQUIRED
```

The scanner specification amendment is complete at canonical spec level. The next required step is:

```text
bmad-checkpoint-preview
```

for Phase 1B Checkpoint A.

Readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
