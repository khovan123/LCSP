# CI/CD Implementation Design

## Purpose

Define CI/CD design expectations without creating workflow YAML or executable pipeline configuration.

## Scope

Covers LCSP application delivery quality gates, artifact policy, migration deployment and release coordination. Customer repository CI/CD compliance gate is not MVP scope.

## Dependencies / Source References

- [Implementation Scope and Invariants](implementation-scope-and-invariants.md)
- [Testing Implementation](testing-implementation.md)

## Implementation Boundaries

- No CI/CD YAML is defined here.
- No deployment vendor is selected here.
- Customer repository CI/CD compliance gate remains Future/Enterprise scope.

## Branch and Release Assumptions

Use protected main/release branches, PR review, quality gates and versioned releases for app, scanner rulesets, legal corpus and prompt templates.

## Quality Gates

| Gate | Purpose |
| --- | --- |
| Static checks | Formatting/lint/type constraints where applicable |
| Unit tests | Module correctness |
| Integration tests | API/DB/queue/worker boundaries |
| Contract tests | API/event/schema compatibility |
| Scanner fixture tests | A2-b scanner/AIUsageFlow behavior |
| Security scan | Dependency and secret checks |
| Migration check | Backward/forward migration safety |
| Documentation check | Invariants and readiness wording preserved |

## Artifact and Version Compatibility

Version application services, scanner rulesets, legal corpus, prompt templates and API/event contracts. Releases must be compatible with persisted workflow state or provide migration policy.

## Migration Deployment Policy

Database migrations must be ordered before dependent app changes where required. Rollback must account for immutable snapshots and audit events.

## Rollback Policy

Rollback application runtime without mutating historical evidence/results. If corpus/ruleset changes are involved, preserve version pinning.

## Secret Injection

Secrets are injected through environment-specific secret stores, not stored in repo or logs.

## Security and Privacy Considerations

CI/CD must prevent secret leakage, raw source artifact persistence and unsafe test fixture publication.

## Audit Requirements

Release events, corpus activation and ruleset activation should be traceable through deployment/change records.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| CI provider | Provider-neutral | Implementation configuration |
| Image/container scanning tooling | Required class of control; tool deferred | Implementation |

