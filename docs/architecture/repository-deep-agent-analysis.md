# Repository Analysis with Managed Deep Agents

## Status

AUTHORITATIVE ACTIVE ARCHITECTURE

## Purpose

LCSP repository analysis no longer uses a language-specific static-scanner
pipeline. Each assessment runs in a durable Managed Deep Agents thread whose
sandbox contains the commit-pinned repository as the agent working database.

## Runtime model

1. NestJS creates and tracks the repository scan job and immutable snapshot.
2. The Managed Deep Agents thread hydrates that snapshot into
   /workspace/repository.
3. The repository-rooted Deep Agents backend exposes native filesystem, search,
   shell, planning, and subagent capabilities against that working tree.
4. The repository analyst is created with create_deep_agent and the managed
   repository backend.
5. Codebase Memory MCP 0.11.0 is available inside the managed sandbox as an
   optional structural index and relationship memory.
6. Direct repository source is authoritative. Graph-memory results accelerate
   discovery but never replace source verification.
7. The Deep Agent emits the compatibility evidence graph, source anchors,
   coverage state, unresolved frontiers, and AI-discovery gate.
8. Existing scan-job and TechnicalEvidenceReport APIs persist the result for
   downstream TechnicalProfile, investigation, reconciliation, and legal flows.

## Evidence and coverage rules

- Evidence citations use repository-relative paths and bounded line ranges.
- Customer source, secrets, credentials, and full prompts are never copied into
  audit/runtime metadata.
- AI_CONFIRMED requires an observed concrete AI/model invocation or outbound AI call.
- AI_ABSENT_CONFIRMED requires READY global and AI coverage plus broad
  inventory/search with no material unresolved generated, dynamic, configured,
  binary, or runtime frontier.
- Any material coverage gap keeps the result PARTIAL/UNKNOWN rather than
  manufacturing absence.
- Codebase Memory check_index_coverage is best-effort and is combined with
  direct source inspection for exhaustive or negative claims.

## Codebase Memory boundary

The managed sandbox setup pins codebase-memory-mcp 0.11.0 and exposes the
native binary as codebase-memory-graph. Its cache/database lives outside the
assessment repository so it cannot be recursively treated as customer source.
The Deep Agent may use index_repository, get_architecture, search_graph,
search_code, trace_path, query_graph, detect_changes, and check_index_coverage.

Codebase Memory is an index/memory aid, not an evidence authority.

## Compatibility terminology

The product still has a Repository Scan job and TechnicalEvidenceReport domain
contract. Those names describe the product workflow, not a static scanner
implementation. Program/evidence graph schemas may remain as downstream
compatibility contracts even though graph construction is now agent-derived.

## Retired architecture

The following are not active repository-analysis runtime dependencies:

- Semgrep scanner rules;
- Syft scanner inventory;
- Knip/Deptry scanner orchestration;
- Python AST/CST scanner stages;
- bounded ts-morph scanner bridge;
- tree-sitter scanner augmentation;
- language-specific scanner adapters;
- standalone scanner-worker graph assembly.

Historical documents describing that architecture are retained under
