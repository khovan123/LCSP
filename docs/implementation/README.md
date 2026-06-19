# LCSP Implementation Documentation Pack

## Purpose

This folder contains the Phase 2 technical implementation documentation pack for LCSP. It translates the approved architecture and canonical contracts into implementation-ready guidance for future engineering work.

This is documentation only. It is not a backlog, sprint plan, source-code scaffold, schema implementation or deployment artifact.

## Current Readiness Warning

Implementation remains blocked until validation gates are completed and formally recorded:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

## Main Invariants

- OAuth/OIDC Login is active MVP authentication and is separate from GitHub App repository authorization.
- Manager is the MVP super-role and can complete the full MVP assessment without Developer assignment.
- Developer is optional in MVP. Delegation is Post-MVP, scoped, revocable, audited and never reduces Manager authority.
- GitHub Repository Scan is the only active MVP technical evidence path.
- The scanner is static-analysis only and must not execute customer code, installs, builds, tests, Docker, CI workflows or API probes.
- `TechnicalEvidenceReport -> Schema Gate -> Quality Gate -> TechnicalProfile -> AI Usage Flow Analysis -> Reconciliation -> VerifiedProfile -> Legal Rule Matching / RAG -> Risk Classification -> Gap Analysis -> Document Generation`.
- Classification requires `VerifiedProfile`.
- Unresolved conflict, insufficient evidence, unknown critical usage purpose or missing legal citation blocks or degrades output.
- AI provider/model/framework detection alone does not determine legal risk.
- Raw source, full prompts, secrets and full AST bodies must not go to LLM, long-term persistence or ordinary audit logs.
- All LLM calls go only through the LLM Gateway.

## Reading Order by Role

| Role | Reading Order |
| --- | --- |
| Frontend Developer | [implementation-scope-and-invariants.md](implementation-scope-and-invariants.md), [web-frontend-implementation.md](web-frontend-implementation.md), [auth-oauth-mfa-rbac-implementation.md](auth-oauth-mfa-rbac-implementation.md), [api-and-async-event-contracts.md](api-and-async-event-contracts.md) |
| NestJS Backend Developer | [system-runtime-and-component-contracts.md](system-runtime-and-component-contracts.md), [nestjs-api-implementation.md](nestjs-api-implementation.md), [data-persistence-and-migration-plan.md](data-persistence-and-migration-plan.md), [queue-jobs-retry-idempotency.md](queue-jobs-retry-idempotency.md) |
| Python / AI Worker Developer | [repository-and-module-layout.md](repository-and-module-layout.md), [github-app-repository-scan-implementation.md](github-app-repository-scan-implementation.md), [python-worker-orchestrator-implementation.md](python-worker-orchestrator-implementation.md), [ai-usage-flow-implementation.md](ai-usage-flow-implementation.md) |
| QA Engineer | [testing-implementation.md](testing-implementation.md), [api-and-async-event-contracts.md](api-and-async-event-contracts.md), [operational-failure-recovery-runbook.md](operational-failure-recovery-runbook.md) |
| DevOps Engineer | [configuration-secrets-environments.md](configuration-secrets-environments.md), [infrastructure-deployment-implementation.md](infrastructure-deployment-implementation.md), [ci-cd-implementation.md](ci-cd-implementation.md), [local-development-runbook.md](local-development-runbook.md) |
| Security Reviewer | [security-privacy-implementation.md](security-privacy-implementation.md), [auth-oauth-mfa-rbac-implementation.md](auth-oauth-mfa-rbac-implementation.md), [llm-gateway-implementation.md](llm-gateway-implementation.md), [audit-observability-implementation.md](audit-observability-implementation.md) |

## Documentation Map

| Concern | Primary Document |
| --- | --- |
| Scope and invariants | [implementation-scope-and-invariants.md](implementation-scope-and-invariants.md) |
| Canonical contract | [../specs/implementation-contract.md](../specs/implementation-contract.md) |
| Runtime architecture | [system-runtime-and-component-contracts.md](system-runtime-and-component-contracts.md) |
| Frontend | [web-frontend-implementation.md](web-frontend-implementation.md) |
| API backend | [nestjs-api-implementation.md](nestjs-api-implementation.md) |
| Auth/OAuth/MFA/RBAC | [auth-oauth-mfa-rbac-implementation.md](auth-oauth-mfa-rbac-implementation.md) |
| GitHub App and scanning | [github-app-repository-scan-implementation.md](github-app-repository-scan-implementation.md) |
| Worker/orchestration | [python-worker-orchestrator-implementation.md](python-worker-orchestrator-implementation.md) |
| AIUsageFlow | [ai-usage-flow-implementation.md](ai-usage-flow-implementation.md) |
| Evidence and reconciliation | [evidence-gates-reconciliation-implementation.md](evidence-gates-reconciliation-implementation.md) |
| Legal RAG | [legal-rag-rule-matching-implementation.md](legal-rag-rule-matching-implementation.md) |
| LLM boundary | [llm-gateway-implementation.md](llm-gateway-implementation.md) |
| Documents | [document-generation-implementation.md](document-generation-implementation.md) |
| Persistence | [data-persistence-and-migration-plan.md](data-persistence-and-migration-plan.md) |
| API/events | [api-and-async-event-contracts.md](api-and-async-event-contracts.md) |
| Queue | [queue-jobs-retry-idempotency.md](queue-jobs-retry-idempotency.md) |
| Security | [security-privacy-implementation.md](security-privacy-implementation.md) |
| Environments | [configuration-secrets-environments.md](configuration-secrets-environments.md) |
| Deployment | [infrastructure-deployment-implementation.md](infrastructure-deployment-implementation.md) |
| CI/CD | [ci-cd-implementation.md](ci-cd-implementation.md) |
| Testing | [testing-implementation.md](testing-implementation.md) |
| Local setup | [local-development-runbook.md](local-development-runbook.md) |
| Recovery | [operational-failure-recovery-runbook.md](operational-failure-recovery-runbook.md) |
| Sequencing | [implementation-sequencing-and-dependencies.md](implementation-sequencing-and-dependencies.md) |
| Handoff gates | [readiness-gates-and-handoff.md](readiness-gates-and-handoff.md) |

## Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Static Analysis Scanner Contract](../specs/static-analysis-scanner-contract.md)
- [Architecture](../architecture/architecture.md)
- [Multi-Agent System Architecture](../architecture/multi-agent-system-architecture.md)
- [Architecture Decision Records](../architecture/architecture-decision-records.md)
- [Phase 1 Final Architecture Review](../workflows/phase-1-final-architecture-review-report.md)

