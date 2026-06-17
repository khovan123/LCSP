# Phase 5.2F Implementation Specification Correction Report

## Scope

This correction responds to the engineering readiness review that found Phase 5.2D/5.2E still too abstract for practical build-from-zero implementation, especially for Scanner, Dependency Graph, AI Signal Detection, AIUsageFlow, GitHub App, RabbitMQ topology, Prisma schema, and runtime state machines.

No application code, test source, CI/CD, Docker, infrastructure, PRD, architecture, epic, story, backlog, or validation artifact was created.

## Previous Readiness Claim Correction

The previous claim that developers could implement without architectural clarification is narrowed.

Corrected interpretation:

```text
Developers understood WHAT to build from Phase 5.2D/5.2E.
Developers did not yet have enough exact HOW-to-build specifications for multiple core services.
This Phase 5.2F package adds the missing implementation-spec layer.
```

## Files Created Or Updated

| File | Purpose |
|---|---|
| [docs/implementation-specs/README.md](../implementation-specs/README.md) | Index and correction context. |
| [docs/implementation-specs/prisma/canonical-schema.prisma.md](../implementation-specs/prisma/canonical-schema.prisma.md) | Physical Prisma schema specification. |
| [docs/implementation-specs/contracts/scanner-contracts.ts.md](../implementation-specs/contracts/scanner-contracts.ts.md) | Scanner enums, facts, graph contracts, findings, report contracts. |
| [docs/implementation-specs/contracts/ai-usage-flow-contracts.ts.md](../implementation-specs/contracts/ai-usage-flow-contracts.ts.md) | AIUsageFlow claim, rule, confidence, eligibility contracts. |
| [docs/implementation-specs/contracts/rabbitmq-event-contracts.ts.md](../implementation-specs/contracts/rabbitmq-event-contracts.ts.md) | Message envelope and queue payload contracts. |
| [docs/implementation-specs/state-machines/assessment-state-machine.ts.md](../implementation-specs/state-machines/assessment-state-machine.ts.md) | Assessment state machine and transition guards. |
| [docs/implementation-specs/state-machines/scan-state-machine.ts.md](../implementation-specs/state-machines/scan-state-machine.ts.md) | Scan job state machine. |
| [docs/implementation-specs/service-construction/github-app-service-construction.md](../implementation-specs/service-construction/github-app-service-construction.md) | GitHub App implementation steps and classes. |
| [docs/implementation-specs/service-construction/rabbitmq-topology-construction.md](../implementation-specs/service-construction/rabbitmq-topology-construction.md) | RabbitMQ topology, retry, DLQ, outbox flow. |
| [docs/implementation-specs/service-construction/scanner-service-construction.md](../implementation-specs/service-construction/scanner-service-construction.md) | Scanner files/classes/methods/stage outputs. |
| [docs/implementation-specs/service-construction/dependency-graph-construction.md](../implementation-specs/service-construction/dependency-graph-construction.md) | Graph node/edge types, lifecycle, persistence. |
| [docs/implementation-specs/service-construction/ai-signal-detectors-construction.md](../implementation-specs/service-construction/ai-signal-detectors-construction.md) | Detector signatures, confidence formula, false positives. |
| [docs/implementation-specs/service-construction/ai-usage-flow-rule-engine-construction.md](../implementation-specs/service-construction/ai-usage-flow-rule-engine-construction.md) | 50-rule AIUsageFlow deterministic rule catalog. |
| [docs/implementation-specs/service-construction/build-from-zero-sequence.md](../implementation-specs/service-construction/build-from-zero-sequence.md) | npm/workspace/package/wave construction order. |

## Gap Closure Map

| User-Identified Gap | Corrective Document | Result |
|---|---|---|
| Scanner describes stages but not files/classes/interfaces | Scanner contracts and Scanner construction spec | Files, classes, methods, DTOs, stage output and emit timing defined. |
| Dependency Graph lacks implementable model | Dependency Graph construction spec | Node/edge enums, lifecycle, build order, stable keys, persistence defined. |
| AI Signal Detection is only a rule list | AI Signal Detector construction spec | Detector function signatures, input/output, false-positive guards, confidence formula defined. |
| AIUsageFlow lacks rule catalog | AIUsageFlow rule engine construction spec | AUF-001 through AUF-050 deterministic rules defined. |
| State Machine missing | Assessment and Scan state machine specs | Concrete states, actions, transitions, denied transitions, guard pseudocode defined. |
| Queue topology incomplete | RabbitMQ event contracts and topology construction spec | Full runtime chain exchange/queue/routing/retry/DLQ/payload defined. |
| GitHub App implementation incomplete | GitHub App service construction spec | App setup, permissions, JWT, token, repo listing, branch/commit snapshot defined. |
| Prisma schema logical, not physical | Canonical Prisma schema spec | Full Prisma model definitions documented. |
| Build-from-zero guidance insufficient | Build-from-zero sequence | Workspace, package installation plan, implementation waves and verification targets defined. |

## Remaining Engineering Gaps

| Gap | Severity | Impact | Recommendation |
|---|---|---|---|
| Exact dependency versions are still version-strategy based rather than pinned. | Medium | Reproducibility may vary between setup dates. | Pin versions when the first package lock is created during implementation. |
| Legal corpus source files and hashes are not included here. | Medium | Legal retrieval cannot be fully verified from specs alone. | Add corpus artifact register when legal source files are finalized. |
| Runtime scanner accuracy remains unvalidated. | Expected | A2-b2 is post-implementation. | Keep A2-b2 as empirical acceptance gate after prototype scanner exists. |
| UI component-level construction is less detailed than service construction. | Medium | Frontend dev may still need page/component mapping. | Add frontend construction spec if frontend is the next implementation target. |

## Explicit Non-Claims

- This package does not claim real validation completion.
- This package does not claim formal legal reliability validation.
- This package does not claim runtime scanner accuracy.
- This package does not claim A2-b2 completion.
- This package does not authorize production deployment or customer onboarding.
- This package does not create source code.

## Final Decision

```text
PREVIOUS_PHASE_5_2D_AND_5_2E_READINESS_CLAIMS_NARROWED
IMPLEMENTATION_SPECIFICATION_LAYER_CREATED
SCANNER_AIUSAGEFLOW_GITHUB_QUEUE_STATE_MACHINE_AND_PRISMA_GAPS_ADDRESSED
NO_APPLICATION_CODE_CREATED
```
