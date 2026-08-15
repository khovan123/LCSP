# LCSP-230 — Canonical Agentic Tool Runtime Architecture

Status: implementation in `refactor/LCSP-230-agentic-tools-architecture`.

## Invariant

Every canonical LCSP tool name MUST have one real public execution function with the exact same snake_case name.

Examples:

- `run_syft_inventory` → `run_syft_inventory(...)` → `SyftTool.run(...)`
- `search_evidence` → `search_evidence(...)` → `SearchEvidenceQuery` → `SearchEvidenceHandler.execute(...)`
- `submit_classification_for_independent_review` → `submit_classification_for_independent_review(...)` → `SubmitClassificationReviewCommand`
- `request_targeted_reanalysis` → `request_targeted_reanalysis(...)` → `PythonWorkerRuntimeClient.requestTargetedReanalysis(...)`

Internal domain classes and methods may keep their existing names. They MUST be reached through the canonical same-name execution boundary.

## Central runtime binding

The Python orchestration runtime keeps one discoverable index in:

`lcsp-python-workers/src/lcsp_workers/agentic_evidence/dispatcher.py`

Each `ToolBinding` declares:

- `tool_name`
- `runtime_target`
- exact-name `entrypoint`
- `downstream_target`

`ALL_TOOL_BINDINGS` currently covers 55 canonical tools and fails fast on duplicate names.

Runtime targets are explicit:

- `PYTHON_LOCAL`
- `NEST_CQRS`
- `NEST_COMMAND`
- `PYTHON_WORKER_BRIDGE`
- `PROTECTED_API`

## Runtime ownership

### AO-1 scanner

Canonical functions live in:

`lcsp-python-workers/src/lcsp_workers/agentic_evidence/scanner_tool_entrypoints.py`

`ScanConsumer` dispatches through `ScannerToolDispatcher` instead of knowing individual implementations such as `SyftTool.run` or `SemgrepTool.run` directly.

### Nest read/query tools

Canonical functions and the single query switch live in:

`apps/api/src/modules/evidence/presentation/http/agentic-tool-query-dispatcher.ts`

Every query case delegates to the same-name function before creating the CQRS query.

### Protected Nest mutation tools

Canonical functions and the protected command switch live in:

`apps/api/src/modules/evidence/presentation/http/agentic-tool-command-dispatcher.ts`

Before `CommandBus.execute`, the internal dispatcher re-evaluates PBAC using the current membership and policy. Policy ID/version used by review commands come from the trusted PBAC lookup, not the worker payload.

### Python worker bridge tools

Canonical functions live in:

`apps/api/src/modules/evidence/presentation/http/agentic-tool-worker-bridge-dispatcher.ts`

This currently owns:

- `request_targeted_reanalysis`
- `resume_waiting_runs`

### AO-6 legal corpus tools

Canonical functions live in:

`lcsp-python-workers/src/lcsp_workers/agentic_evidence/legal_tool_entrypoints.py`

Protected activation remains behind `WorkerApiClient.activate_validated_corpus_version`.

## Debugging

From `lcsp-python-workers`:

```bash
python scripts/list_agentic_tool_bindings.py
```

Inspect one tool:

```bash
python scripts/list_agentic_tool_bindings.py --tool run_syft_inventory
```

Machine-readable output:

```bash
python scripts/list_agentic_tool_bindings.py --json
```

Expected trace for a developer is now:

```text
canonical tool name
  -> central ToolBinding
  -> exact same-name function
  -> runtime target
  -> CQRS / Python implementation / worker bridge / protected API
```

A developer should not need to infer implementation ownership from a workflow consumer or search for unrelated generic method names such as `run()` or `execute()` first.
