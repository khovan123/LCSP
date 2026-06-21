# Documentation Reduction Report

## Scope

Performed physical cleanup and active-document reduction after initial consolidation.

## What Changed

- Slimmed `architecture/` to architecture-only concerns.
- Moved ADRs into `architecture/adr/`.
- Merged lifecycle specs into `assessment-lifecycle-spec.md`.
- Merged legal matching and risk classification into `legal-classification-spec.md`.
- Reduced execution blueprints to one blueprint per retained domain.
- Reduced implementation docs to five active build docs.
- Split archive into `decisions/` and `redundant-artifacts/delete-candidates/`.
- Added 30-day retention rule for redundant artifacts.

## Active Target Docs

```text
docs/product/
docs/specs/scanner-spec.md
docs/specs/assessment-lifecycle-spec.md
docs/specs/legal-classification-spec.md
docs/specs/document-generation-spec.md
docs/architecture/architecture.md
docs/architecture/multi-agent-system-architecture.md
docs/architecture/adr/
docs/developer-execution-blueprints/end-to-end-execution.md
docs/developer-execution-blueprints/scanner-data-journey.md
docs/developer-execution-blueprints/ai-usage-flow-blueprint.md
docs/developer-execution-blueprints/reconciliation-blueprint.md
docs/developer-execution-blueprints/classification-blueprint.md
docs/implementation/scanner-implementation.md
docs/implementation/backend-implementation.md
docs/implementation/persistence-implementation.md
docs/implementation/queue-implementation.md
docs/implementation/llm-gateway-implementation.md
```

## Move Log

| From | To | Reason |
|---|---|---|
| `docs/architecture/architecture-decision-records.md` | `docs/architecture/adr/architecture-decision-records.md` | ADR moved into architecture/adr |
| `docs/architecture/adr-022-typescript-first-npm-only-controlled-prototype.md` | `docs/architecture/adr/adr-022-typescript-first-npm-only-controlled-prototype.md` | ADR moved into architecture/adr |
| `docs/architecture/architecture-exploration.md` | `docs/archive/decisions/architecture-process/architecture-exploration.md` | Architecture process artifact |
| `docs/architecture/architecture-review-checklist.md` | `docs/archive/decisions/architecture-process/architecture-review-checklist.md` | Architecture process artifact |
| `docs/specs/domain-model.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/domain-model.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/evidence-report-contract.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/evidence-report-contract.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/human-attestation-policy.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/human-attestation-policy.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/api-contract-draft.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/api-contract-draft.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/data-model-draft.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/data-model-draft.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/implementation-contract.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/implementation-contract.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/ai-usage-flow-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/ai-usage-flow-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/reconciliation-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/reconciliation-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/verified-profile-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/verified-profile-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/legal-matching-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/legal-matching-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/risk-classification-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/risk-classification-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/specs/state-machine-spec.md` | `docs/archive/redundant-artifacts/delete-candidates/specs/state-machine-spec.md` | Merged or superseded by reduced canonical specs |
| `docs/developer-execution-blueprints/01-end-to-end-system-execution.md` | `docs/developer-execution-blueprints/end-to-end-execution.md` | Renamed active execution blueprint |
| `docs/developer-execution-blueprints/02-scanner-data-journey.md` | `docs/developer-execution-blueprints/scanner-data-journey.md` | Renamed active execution blueprint |
| `docs/developer-execution-blueprints/04-ai-usage-flow-blueprint.md` | `docs/developer-execution-blueprints/ai-usage-flow-blueprint.md` | Renamed active execution blueprint |
| `docs/developer-execution-blueprints/05-reconciliation-blueprint.md` | `docs/developer-execution-blueprints/reconciliation-blueprint.md` | Renamed active execution blueprint |
| `docs/developer-execution-blueprints/08-risk-classification-blueprint.md` | `docs/developer-execution-blueprints/classification-blueprint.md` | Renamed active execution blueprint |
| `docs/developer-execution-blueprints/00-developer-execution-blueprint-template.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/00-developer-execution-blueprint-template.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/01-manager-scan-to-document-execution-trace.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/01-manager-scan-to-document-execution-trace.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/03-aiusageflow-loan-approval-domain-walkthrough.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/03-aiusageflow-loan-approval-domain-walkthrough.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/04-runtime-object-handoff-map.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/04-runtime-object-handoff-map.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/02-repository-scan-blueprint.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/02-repository-scan-blueprint.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/03-technical-profile-blueprint.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/03-technical-profile-blueprint.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/06-verified-profile-blueprint.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/06-verified-profile-blueprint.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/07-legal-matching-blueprint.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/07-legal-matching-blueprint.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/developer-execution-blueprints/09-document-generation-blueprint.md` | `docs/archive/redundant-artifacts/delete-candidates/developer-execution-blueprints/09-document-generation-blueprint.md` | Duplicate/example walkthrough outside one-domain-one-blueprint target |
| `docs/implementation/implementation-scope-and-invariants.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/implementation-scope-and-invariants.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/repository-and-module-layout.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/repository-and-module-layout.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/system-runtime-and-component-contracts.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/system-runtime-and-component-contracts.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/web-frontend-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/web-frontend-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/nestjs-api-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/nestjs-api-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/auth-oauth-mfa-rbac-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/github-app-repository-scan-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/github-app-repository-scan-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/python-worker-orchestrator-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/python-worker-orchestrator-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/ai-usage-flow-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/ai-usage-flow-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/evidence-gates-reconciliation-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/evidence-gates-reconciliation-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/legal-rag-rule-matching-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/legal-rag-rule-matching-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/document-generation-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/document-generation-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/data-persistence-and-migration-plan.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/data-persistence-and-migration-plan.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/api-and-async-event-contracts.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/api-and-async-event-contracts.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/queue-jobs-retry-idempotency.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/queue-jobs-retry-idempotency.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/audit-observability-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/audit-observability-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/security-privacy-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/security-privacy-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/configuration-secrets-environments.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/configuration-secrets-environments.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/infrastructure-deployment-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/infrastructure-deployment-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/ci-cd-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/ci-cd-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/testing-implementation.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/testing-implementation.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/local-development-runbook.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/local-development-runbook.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/operational-failure-recovery-runbook.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/operational-failure-recovery-runbook.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/implementation-sequencing-and-dependencies.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/implementation-sequencing-and-dependencies.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/implementation/readiness-gates-and-handoff.md` | `docs/archive/redundant-artifacts/delete-candidates/implementation/readiness-gates-and-handoff.md` | Merged into reduced implementation target docs or outside final build-doc target |
| `docs/archive/workflows/lcsp-conditional-implementation-documentation-branch.md` | `docs/archive/decisions/workflow-reports/lcsp-conditional-implementation-documentation-branch.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1-architecture-summary.md` | `docs/archive/decisions/workflow-reports/phase-1-architecture-summary.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1-checkpoint-review.md` | `docs/archive/decisions/workflow-reports/phase-1-checkpoint-review.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-0-checkpoint-review.md` | `docs/archive/decisions/workflow-reports/phase-0-checkpoint-review.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1a-source-alignment-report.md` | `docs/archive/decisions/workflow-reports/phase-1a-source-alignment-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-0-checkpoint-rerun-report.md` | `docs/archive/decisions/workflow-reports/phase-0-checkpoint-rerun-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1-full-architecture-report.md` | `docs/archive/decisions/workflow-reports/phase-1-full-architecture-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1-architecture-checkpoint-report.md` | `docs/archive/decisions/workflow-reports/phase-1-architecture-checkpoint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1b-scanner-spec-amendment-report.md` | `docs/archive/decisions/workflow-reports/phase-1b-scanner-spec-amendment-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1b-scanner-spec-checkpoint-report.md` | `docs/archive/decisions/workflow-reports/phase-1b-scanner-spec-checkpoint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1b-scanner-architecture-alignment-report.md` | `docs/archive/decisions/workflow-reports/phase-1b-scanner-architecture-alignment-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1b-scanner-architecture-checkpoint-report.md` | `docs/archive/decisions/workflow-reports/phase-1b-scanner-architecture-checkpoint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-1-final-architecture-review-report.md` | `docs/archive/decisions/workflow-reports/phase-1-final-architecture-review-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-2-technical-implementation-documentation-report.md` | `docs/archive/decisions/workflow-reports/phase-2-technical-implementation-documentation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-2-technical-documentation-checkpoint-report.md` | `docs/archive/decisions/workflow-reports/phase-2-technical-documentation-checkpoint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-3-1-test-architecture-design-report.md` | `docs/archive/decisions/workflow-reports/phase-3-1-test-architecture-design-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-3-2-nfr-quality-audit-report.md` | `docs/archive/decisions/workflow-reports/phase-3-2-nfr-quality-audit-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-3-3-traceability-quality-gate-review-report.md` | `docs/archive/decisions/workflow-reports/phase-3-3-traceability-quality-gate-review-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-3-final-quality-documentation-checkpoint-report.md` | `docs/archive/decisions/workflow-reports/phase-3-final-quality-documentation-checkpoint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-1-validation-execution-preparation-report.md` | `docs/archive/decisions/workflow-reports/phase-4-1-validation-execution-preparation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-2-validation-execution-readiness-check-report.md` | `docs/archive/decisions/workflow-reports/phase-4-2-validation-execution-readiness-check-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-1-1-validation-decision-resolution-report.md` | `docs/archive/decisions/workflow-reports/phase-4-1-1-validation-decision-resolution-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-1-2-validation-approval-normalization-report.md` | `docs/archive/decisions/workflow-reports/phase-4-1-2-validation-approval-normalization-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-2-validation-execution-readiness-recheck-report.md` | `docs/archive/decisions/workflow-reports/phase-4-2-validation-execution-readiness-recheck-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-3-controlled-validation-evidence-collection-report.md` | `docs/archive/decisions/workflow-reports/phase-4-3-controlled-validation-evidence-collection-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-3-validation-dry-run-report.md` | `docs/archive/decisions/workflow-reports/phase-4-3-validation-dry-run-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-3-1-d07-fixture-release-completion-report.md` | `docs/archive/decisions/workflow-reports/phase-4-3-1-d07-fixture-release-completion-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-3-2-a2b1-readiness-recheck-report.md` | `docs/archive/decisions/workflow-reports/phase-4-3-2-a2b1-readiness-recheck-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-4-3-3-a2b1-controlled-mapping-design-evidence-collection-report.md` | `docs/archive/decisions/workflow-reports/phase-4-3-3-a2b1-controlled-mapping-design-evidence-collection-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/controlled-mvp-prototype-implementation-activation-report.md` | `docs/archive/decisions/workflow-reports/controlled-mvp-prototype-implementation-activation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-1-controlled-mvp-prototype-backlog-planning-report.md` | `docs/archive/decisions/workflow-reports/phase-5-1-controlled-mvp-prototype-backlog-planning-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2-first-story-preparation-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2-first-story-preparation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2a-full-story-artifact-generation-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2a-full-story-artifact-generation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2b-developer-execution-blueprint-generation-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2b-developer-execution-blueprint-generation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2c-execution-blueprint-remediation-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2c-execution-blueprint-remediation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2d-implementation-readiness-gap-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2d-implementation-readiness-gap-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2d-build-specification-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2d-build-specification-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2e-engineering-construction-manuals-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2e-engineering-construction-manuals-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2f-implementation-spec-correction-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2f-implementation-spec-correction-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-2g-developer-execution-blueprints-report.md` | `docs/archive/decisions/workflow-reports/phase-5-2g-developer-execution-blueprints-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-3-developer-execution-blueprint-report.md` | `docs/archive/decisions/workflow-reports/phase-5-3-developer-execution-blueprint-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/workflows/phase-5-4-documentation-consolidation-report.md` | `docs/archive/decisions/workflow-reports/phase-5-4-documentation-consolidation-report.md` | Historical workflow/checkpoint decision record |
| `docs/archive/reports/documentation-consolidation-final-report.md` | `docs/archive/decisions/consolidation-reports/documentation-consolidation-final-report.md` | Historical consolidation decision record |
| `docs/archive/build-specs` | `docs/archive/redundant-artifacts/delete-candidates/build-specs` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/implementation-playbooks` | `docs/archive/redundant-artifacts/delete-candidates/implementation-playbooks` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/engineering-manuals` | `docs/archive/redundant-artifacts/delete-candidates/engineering-manuals` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/implementation-artifacts` | `docs/archive/redundant-artifacts/delete-candidates/implementation-artifacts` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/developer-blueprints` | `docs/archive/redundant-artifacts/delete-candidates/developer-blueprints` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/planning` | `docs/archive/redundant-artifacts/delete-candidates/planning` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/planning-artifacts` | `docs/archive/redundant-artifacts/delete-candidates/planning-artifacts` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/brainstorming` | `docs/archive/redundant-artifacts/delete-candidates/brainstorming` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/qa` | `docs/archive/redundant-artifacts/delete-candidates/qa` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/validation` | `docs/archive/redundant-artifacts/delete-candidates/validation` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/design` | `docs/archive/redundant-artifacts/delete-candidates/design` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/security` | `docs/archive/redundant-artifacts/delete-candidates/security` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/project` | `docs/archive/redundant-artifacts/delete-candidates/project` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/test-artifacts` | `docs/archive/redundant-artifacts/delete-candidates/test-artifacts` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/merged-spec-sources` | `docs/archive/redundant-artifacts/delete-candidates/merged-spec-sources` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/governance-superseded` | `docs/archive/redundant-artifacts/delete-candidates/governance-superseded` | Redundant artifact or merged source retained only for 30-day cleanup window |
| `docs/archive/root-superseded` | `docs/archive/redundant-artifacts/delete-candidates/root-superseded` | Redundant artifact or merged source retained only for 30-day cleanup window |

## Physical Deletion Policy

No file was physically deleted in this step. Redundant artifacts are delete candidates after `2026-07-21` only if:

1. merge complete;
2. no active backlink;
3. no open decision;
4. owner approves deletion.

## Decision

```text
DOCUMENTATION_REDUCTION_COMPLETED
ACTIVE_DOCUMENTATION_SET_MINIMIZED
ARCHIVE_SPLIT_INTO_DECISIONS_AND_DELETE_CANDIDATES
REDUNDANT_ARTIFACTS_MARKED_FOR_30_DAY_RETENTION
NO_APPLICATION_CODE_CREATED
```
## Product Cleanup Addendum

| From | To | Reason |
|---|---|---|
| `docs/product/owner-risk-acceptance-controlled-mvp-prototype.md` | `docs/archive/decisions/product-decisions/owner-risk-acceptance-controlled-mvp-prototype.md` | Owner risk acceptance decision record |
| `docs/product/implementation-readiness.md` | `docs/archive/decisions/product-decisions/implementation-readiness.md` | Readiness/status decision record |
| `docs/product/product-brief.md` | `docs/archive/redundant-artifacts/delete-candidates/product/product-brief.md` | Redundant product/validation artifact outside reduced active product target |
| `docs/product/validation-execution-plan.md` | `docs/archive/redundant-artifacts/delete-candidates/product/validation-execution-plan.md` | Redundant product/validation artifact outside reduced active product target |
| `docs/product/validation-results-template.md` | `docs/archive/redundant-artifacts/delete-candidates/product/validation-results-template.md` | Redundant product/validation artifact outside reduced active product target |
| `docs/product/validation-run-checklist.md` | `docs/archive/redundant-artifacts/delete-candidates/product/validation-run-checklist.md` | Redundant product/validation artifact outside reduced active product target |

