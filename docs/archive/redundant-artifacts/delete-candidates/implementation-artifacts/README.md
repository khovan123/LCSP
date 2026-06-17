# Controlled MVP Prototype Implementation Story Artifacts

## Purpose

This package contains implementation-story documents for the controlled MVP prototype backlog. It is intended for external team review and later per-story implementation planning.

## Authorization Boundary

The package is authorized by:

```text
CONTROLLED_MVP_PROTOTYPE_BACKLOG_PLANNED
STORY_IMPLEMENTATION_PLANNING_ALLOWED
```

This package does not authorize parallel implementation of all stories. Each story still requires per-story implementation selection/authorization.

## Current Story State Model

Allowed story document states:

- `IMPLEMENTATION_AUTHORIZED`: only `STORY-01-01`, because Phase 5.2 already authorized the selected story.
- `DOCUMENTED`: story artifact exists, but implementation is not authorized.
- `BLOCKED_BY_DEPENDENCY`: story artifact exists and predecessor implementation is required first.
- `DEFERRED_OUT_OF_PROTOTYPE_SCOPE`: reserved for canonical story artifacts if a story is later explicitly deferred; no non-canonical stories are created here.

No story is marked implemented.

## Package Contents

- `STORY-*.md`: one implementation-story artifact per canonical story.
- `story-index.md`: story inventory and status table.
- `dependency-and-implementation-order.md`: critical path, parallel groups and implementation waves.

## Mandatory Prototype Constraints

- Manager can complete MVP workflow without Developer participation.
- Developer cannot block Manager-only MVP transitions.
- Repository Scan is the active MVP technical-evidence path.
- Classification cannot occur before VerifiedProfile.
- Unresolved conflict blocks classification.
- Scanner evidence is immutable; Manager resolutions are separate and auditable.
- No raw source code is sent directly to an LLM.
- Secret values do not enter logs, audit records, prompts or evidence outputs.
- Legal conclusions require citation traceability.
- Provider/model/framework detection alone does not prove legal risk.
- A2-b1 does not prove runtime scanner accuracy.
- A2-b2 remains post-implementation empirical acceptance work.

## Explicit Non-Claims

This package does not claim validation completion, formal legal reliability, compliance certification, production release readiness, runtime scanner accuracy or A2-b2 completion.

