# LCSP Documentation Archive Manifest

## Purpose

Track documents proposed for archive before any file is moved. This prevents accidental loss of decisions, requirements, contracts, or implementation details.

## Status Values

```text
PROPOSED
MERGE_REQUIRED
MERGED_TO_CANONICAL
READY_TO_ARCHIVE
ARCHIVED
DO_NOT_ARCHIVE
```

## Proposed Archive Map

| Original Path / Pattern | Proposed Archive Area | Status | Canonical Replacement | Reason |
|---|---|---|---|---|
| `docs/workflows/phase-1b-*` | `docs/archive/workflows/phase-1b/` | MERGE_REQUIRED | `docs/specs/scanner-spec.md`, `docs/architecture/architecture.md` | Scanner process reports duplicate final architecture/spec decisions. |
| `docs/build-specs/*` | `docs/archive/build-specs/` | MERGE_REQUIRED | `docs/implementation/`, `docs/developer-execution-blueprints/` | Build specs overlap with implementation and execution blueprints. |
| `docs/implementation-playbooks/*` | `docs/archive/implementation-playbooks/` | MERGE_REQUIRED | `docs/implementation/` | Playbooks duplicate implementation pack. |
| `docs/engineering-manuals/*` | `docs/archive/engineering-manuals/` | MERGE_REQUIRED | `docs/implementation/`, `docs/specs/` | Construction manuals duplicate build specs and implementation docs. |
| `docs/implementation-artifacts/STORY-*` | `docs/archive/implementation-artifacts/` | MERGE_REQUIRED | Current implementation tracker / issue system when used | Story artifacts are planning records, not durable knowledge. |
| `docs/developer-blueprints/stories/*` | `docs/archive/developer-blueprints/stories/` | MERGE_REQUIRED | `docs/developer-execution-blueprints/` | Story blueprints duplicate execution blueprints. |
| `docs/planning/*` | `docs/archive/planning/` | MERGE_REQUIRED | `docs/product/`, active implementation tracker | Planning artifacts are not canonical product/system knowledge. |
| `docs/brainstorming/*` | `docs/archive/brainstorming/` | MERGE_REQUIRED | `docs/product/prd.md`, domain specs | Discovery artifacts should not remain active after decisions freeze. |

## Do Not Archive Without Review

| Path | Reason |
|---|---|
| `docs/product/prd.md` | Product source. |
| `docs/architecture/architecture.md` | System source. |
| `docs/architecture/multi-agent-system-architecture.md` | Agent architecture source. |
| `docs/architecture/architecture-decision-records.md` | ADR source. |
| `docs/specs/implementation-contract.md` | Current cross-domain contract until merged into domain specs. |
| `docs/implementation-readiness.md` | Readiness/status source. |
| `docs/developer-execution-blueprints/*` | Active HOW IT RUNS layer. |
| `docs/implementation/*` | Active BUILD layer. |
