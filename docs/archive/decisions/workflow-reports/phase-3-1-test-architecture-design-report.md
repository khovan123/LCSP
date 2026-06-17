# Phase 3.1 Test Architecture and Risk-Based Test Design Report

## Scope

Phase 3.1 created the LCSP test architecture and risk-based test design documentation pack. The work is documentation-only and does not create test source, automation framework setup, CI workflow, Dockerfile, source code, implementation backlog, epic, story, sprint or task.

## Source Documents Used

- `docs/workflows/phase-1-final-architecture-review-report.md`
- `docs/workflows/phase-2-technical-implementation-documentation-report.md`
- `docs/workflows/phase-2-technical-documentation-checkpoint-report.md`
- `docs/specs/implementation-contract.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/evidence-report-contract.md`
- `docs/specs/scanner-signal-taxonomy.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/reconciliation-policy.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/specs/state-machine.md`
- `docs/implementation/testing-implementation.md`
- `docs/implementation/github-app-repository-scan-implementation.md`
- `docs/implementation/python-worker-orchestrator-implementation.md`
- `docs/implementation/ai-usage-flow-implementation.md`
- `docs/implementation/evidence-gates-reconciliation-implementation.md`
- `docs/implementation/legal-rag-rule-matching-implementation.md`
- `docs/implementation/llm-gateway-implementation.md`
- `docs/implementation/document-generation-implementation.md`
- `docs/implementation/api-and-async-event-contracts.md`
- `docs/implementation/queue-jobs-retry-idempotency.md`
- `docs/implementation/security-privacy-implementation.md`
- `docs/implementation/operational-failure-recovery-runbook.md`
- `docs/design/traceability-matrix.md`
- `docs/qa/test-strategy.md`
- `docs/qa/acceptance-criteria.md`

## Files Created

- `docs/qa/test-architecture.md`
- `docs/qa/risk-based-test-design.md`
- `docs/qa/test-scenario-catalog.md`
- `docs/qa/test-fixture-and-test-data-design.md`
- `docs/qa/contract-and-integration-test-design.md`
- `docs/qa/failure-mode-and-recovery-test-design.md`
- `docs/qa/manual-validation-protocols.md`
- `docs/workflows/phase-3-1-test-architecture-design-report.md`

## Files Updated

- `docs/qa/test-strategy.md`
- `docs/qa/acceptance-criteria.md`
- `docs/design/traceability-matrix.md`

## Test Architecture Coverage

| Area | Coverage |
| --- | --- |
| Test layers | Unit, module/service integration, API contract, async event/queue, workflow/orchestrator, scanner fixture, RAG/citation, E2E, security/privacy, reliability/recovery and manual validation |
| Test pyramid | LCSP-adapted emphasis on deterministic rules, contracts, scanner fixtures and selective E2E |
| Environment topology | Local, integration, staging and manual validation environments |
| External dependency handling | OAuth/OIDC, GitHub App, queue, LLM Gateway/provider, vector store and object storage |
| Fixture governance | Versioning, checksum, expected-output policy and redaction |
| Quality gates | Critical risks, contract mismatch, citation missing, privacy invariant failure and validation blockers |

## Critical Risk Coverage

Critical risk coverage includes Manager authority, OAuth/OIDC callback safety, GitHub App boundary, static scanner safety, no customer-code execution, workspace cleanup, secret redaction, raw-source exclusion from LLM/audit, Schema Gate, Quality Gate, AIUsageFlow claim evidence, unknown-flow abstention, Manager-only conflict resolution, VerifiedProfile gate, citation guardrail, final document gate, queue idempotency and audit integrity.

## Scenario and Fixture Coverage

- Scenario catalogue defines `TSC-001..TSC-035`.
- Fixture design defines `F-SCAN-01..F-SCAN-12`, `F-RAG-01..F-RAG-03`, `F-CONFLICT-01..F-CONFLICT-02`, `F-AUTH-01..F-AUTH-02` and `F-OPS-01..F-OPS-02`.
- Scenarios and fixtures cover internal summarization, chatbot, loan approval, HR ranking, human review, auto-reject, dynamic prompt, provider-only detection, unresolved downstream path, conflicts, missing citation, idempotency and failure recovery.

## Validation Protocol Coverage

Manual validation protocols are defined for:

- A1 Wizard simplicity/completeness.
- A2 Legal corpus and rule reliability.
- A2-b Scanner and AIUsageFlow mapping accuracy.
- A3 Human attestation abuse/governance.

A2-b explicitly requires that provider/model/framework presence alone must not classify a system as high risk, decision-impact fixtures must map to legal-rule family or remain blocked/unclear, every material claim used in rule matching must have evidence refs, unclear critical usage must not lead to final classification and automated/high-impact false positives must be measured.

## Open Decisions / Contradictions

| Item | Classification | Recommended Default | Owner | Required Before |
|---|---|---|---|---|
| A2-b acceptance thresholds | DECISION_REQUIRED_BEFORE_PHASE_3_2 | Define numerical thresholds for invocation precision, purpose mapping, input/output/action accuracy, human-review accuracy, false-positive rate, abstention correctness and evidence completeness | PM + QA + Architecture | Phase 3.2 NFR quality audit |
| Legal corpus reviewer set for A2 | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Assign legal/compliance reviewers and approved corpus fixture set | Product + Legal | Implementation/backlog unblock |
| Exact test automation framework | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Keep framework-neutral design until implementation; API/service tests remain first-class | QA + Engineering | Test implementation |
| OAuth/GitHub provider test environment | CONFIGURATION_DECISION | Use fake providers for design/contract tests and at least one configured provider before release | Security + DevOps | Implementation configuration |
| CodeQL scanner evaluation | FUTURE_SCOPE_DECISION | Future evaluation option only; not MVP runtime dependency | Architecture | Future scanner evaluation |

No contradiction requiring architecture amendment was found.

## Explicitly Blocked Activities

- Test source creation.
- Playwright/Cypress/Jest/Pytest project creation.
- CI/CD YAML creation.
- Dockerfile creation.
- Source code creation.
- Implementation backlog creation.
- Epic, story, sprint or task creation.
- Development execution.
- Readiness status change.

## Decision

PHASE_3_1_TEST_ARCHITECTURE_COMPLETED_WITH_DECISIONS_REQUIRED

PHASE_3_2_NFR_QUALITY_AUDIT_ALLOWED

This permits only:

```text
bmad-tea
bmad-testarch-nfr
```

It does not permit test source, automation framework initialization, CI scaffolding, code, backlog, stories, sprint planning or development execution.

Readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

