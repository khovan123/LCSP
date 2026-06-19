# Phase 1B Scanner Architecture Alignment Report

## Scope

Phase 1B.2 aligned LCSP architecture documents with the canonical static-analysis scanner specification from `docs/specs/static-analysis-scanner-contract.md`.

Operating mode: architecture/design only.

This phase updated scanner subsystem architecture, language analyzer boundaries, graph persistence boundaries, Scanner-to-AIUsageFlow flow, diagrams, ADRs and traceability. It did not create code, test source, backlog, epics, stories, sprint artifacts, Dockerfiles, CI/CD YAML or Phase 2 implementation documentation pack files.

## Files Updated

- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/repository-and-module-layout.md`
- `docs/design/flowcharts.md`
- `docs/design/sequence-diagrams.md`
- `docs/design/traceability-matrix.md`

No additional `docs/implementation/*` file was created.

## Scanner Subsystem Architecture

The architecture now defines a static-analysis-only scanner subsystem inside the Python Worker:

```text
Python Scanner Worker
├── Repository Fetcher and Workspace Manager
├── Repository Inventory Analyzer
├── Manifest and Config Analyzer
├── Tree-sitter Generic Parser
├── TypeScript Semantic Analyzer Sidecar
├── Python Semantic Analyzer
├── AI Invocation Detector
├── Input Flow Analyzer
├── Output and Decision Flow Analyzer
├── Human Review Detector
├── Domain Context Fusion Engine
├── In-memory Evidence Graph Builder
├── TechnicalFinding Generator
├── Redaction Controller
└── Workspace Cleanup Controller
```

The scanner produces TechnicalFindings and `TechnicalEvidenceReport`. It does not determine legal risk directly.

## Technology Boundaries

| Concern | Architecture Decision |
| --- | --- |
| Generic parser | Tree-sitter for generic parsing and fallback structure |
| TS/JS semantic analysis | Isolated Node.js analyzer/sidecar using TypeScript Compiler API |
| Python semantic analysis | Python `ast` with custom import/module resolver |
| Graph assembly | NetworkX in-memory and scan-local only |
| Graph persistence | PostgreSQL persists normalized nodes, edges, evidence refs, hashes and paths only |
| Detection rules | Versioned YAML/JSON scanner rulesets |
| LLM | Only through LLM Gateway; scanner itself does not call LLM |
| CodeQL | Future evaluation option only, not an MVP runtime dependency |

## Static Analysis and Workspace Safety Model

Allowed:

- Read repository files.
- Shallow clone selected repository at pinned commit SHA.
- Parse source/config/manifest/schema files.
- Build AST, call graph, data-flow graph and evidence graph.
- Persist findings, hashes, metadata, graph paths and coverage limits.

Forbidden:

- Execute customer code.
- Run package installs, build commands, test commands, Docker commands, shell scripts, CI workflows or repository scripts.
- Probe customer API endpoints.
- Persist raw source, full AST bodies, full prompts or secrets.
- Send raw source, full prompts or secrets to LLM Gateway or LLM provider.

Raw source exists only inside the temporary scanner workspace and must be cleaned after scan success/failure handling.

## L0-L4 Data-Flow Depth Model

| Level | Scope | Architecture Behavior |
| --- | --- | --- |
| L0 | Repository inventory | Languages, manifests, config, routes and schemas |
| L1 | Single-function local flow | Input -> model -> output -> local branch/return/update |
| L2 | Same-module flow | Follow nearby service/function calls |
| L3 | Controlled cross-module flow | Route/controller -> service -> AI invocation -> action |
| L4 | Dynamic or unsupported boundary | Emit uncertainty and do not infer unsupported flow |

Rules confirmed:

- L2/L3 tracing starts only after AI invocation candidate detection.
- MVP does not perform unrestricted whole-repository global data-flow analysis.
- Dynamic/unsupported boundaries emit `SCAN_COVERAGE_LIMITATION` or `UNSUPPORTED_DYNAMIC_FLOW`.

## Evidence Graph and Persistence Model

Evidence graph node and edge vocabularies from `static-analysis-scanner-contract.md` are now reflected in architecture.

Persisted records must carry:

- `scan_id`
- `repository_id`
- `commit_sha`
- `file_path`
- `symbol_ref`
- `line_range` when available
- `evidence_hash`
- `scanner_version`
- `ruleset_version`
- `confidence`

NetworkX graph state is temporary and scan-local. PostgreSQL stores normalized graph nodes, edges, evidence refs, hashes, paths and structured finding metadata only. Raw source text and complete AST bodies are not persisted.

## Scanner-to-AIUsageFlow Flow

Architecture and design diagrams now show:

```text
Manager requests Repository Scan
-> API creates RepositoryScanJob
-> Queue delivers job to Python Worker
-> Worker creates isolated temporary workspace
-> shallow clone pinned commit
-> inventory/manifest/config analysis
-> Tree-sitter + TS sidecar + Python analyzer
-> AI invocation/input/output/decision/human-review/domain detectors
-> NetworkX evidence graph
-> TechnicalFinding records
-> TechnicalEvidenceReport
-> redaction and metadata persistence
-> workspace cleanup
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
```

The required downstream pipeline remains:

```text
TechnicalEvidenceReport
-> Schema Gate
-> Quality Gate
-> TechnicalProfile
-> AI Usage Flow Analysis
-> Reconciliation
-> VerifiedProfile
-> Legal Rule Matching / RAG
-> Risk Classification
```

AIUsageFlow claims require `value`, `confidence`, `evidence_refs[]`, `source_type` and `uncertainty_reason` when applicable. Claims without evidence refs cannot be used for legal rule matching.

## Privacy and LLM Boundary

The architecture now explicitly states:

- Scanner does not call LLM.
- AIUsageFlow may use LLM only through LLM Gateway.
- LLM Gateway may receive sanitized metadata only: route category, service/module label, data category labels, output type labels, downstream action labels, human-review state, confidence and evidence reference IDs.
- Raw source code, full prompts, secrets and raw AST bodies must not enter LLM Gateway, LLM provider, ordinary audit records or long-term PostgreSQL persistence.

## ADRs Added or Updated

Added:

- ADR-019 - Static Analysis Scanner with Language-Specific Semantic Analyzers
- ADR-020 - Claim-Level Evidence References for AIUsageFlow
- ADR-021 - Controlled Multi-Level Data-Flow Analysis Instead of Whole-Repository Global Analysis

Updated references:

- `docs/architecture/architecture.md` ADR trace table
- `docs/architecture/multi-agent-system-architecture.md` integration ADR mapping

## Open Decisions

| Decision | Status | Required Before |
| --- | --- | --- |
| Exact scanner sandbox technology | Decision required | Implementation execution |
| TypeScript analyzer process vs sidecar packaging | Decision required | Implementation execution |
| Graph metadata physical schema | Decision required | Implementation execution |
| A2-b acceptance thresholds | Decision required | Implementation backlog unblock |
| CodeQL evaluation | Future scope decision | Future scanner evaluation |

None of these decisions blocks Phase 1B.2 completion. They must be resolved before implementation or validation gates as indicated.

## Quality Check Results

| Check | Result |
| --- | --- |
| Scanner subsystem added to architecture | PASS |
| Static-analysis-only boundary documented | PASS |
| Tree-sitter / TS Compiler API / Python ast boundaries documented | PASS |
| CodeQL kept future-only | PASS |
| L0-L4 controlled data-flow model documented | PASS |
| Evidence graph persistence excludes raw source/full AST bodies | PASS |
| Scanner-to-AIUsageFlow sequence added | PASS |
| AIUsageFlow claim-level evidence boundary preserved | PASS |
| Raw source/full prompts/secrets excluded from LLM and ordinary audit/persistence | PASS |
| No extra `docs/implementation/*` file created | PASS |
| No code/backlog/story/sprint/task created | PASS |
| Readiness status unchanged | PASS |

## Explicitly Blocked Activities

This phase did not and does not permit:

- Source code generation.
- Test source generation.
- Implementation backlog creation.
- Epic, story, sprint or task creation.
- Phase 2 Technical Implementation Documentation Pack.
- Dockerfile or CI/CD YAML creation.
- Development execution.
- Readiness status change.

## Decision

PHASE_1B_SCANNER_ARCHITECTURE_COMPLETED_WITH_DECISIONS_REQUIRED

Readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```
