# LCSP Developer Execution Blueprints

## Purpose

This package turns the controlled MVP prototype story artifacts into developer-ready implementation blueprints. It is a technical execution guide, not application code.

## Boundary

These blueprints do not authorize production deployment, compliance certification, formal legal reliability validation, runtime scanner accuracy claims or A2-b2 completion.

## Reading Order

1. `00-prototype-technology-decisions.md`
2. `01-repository-and-module-map.md`
3. `02-shared-domain-data-contracts.md`
4. `03-api-event-and-job-catalog.md`
5. `04-database-migration-plan.md`
6. `05-local-development-and-verification.md`
7. `06-security-and-secret-handling.md`
8. `07-prototype-default-decision-register.md`
9. `story-to-blueprint-index.md`
10. `implementation-wave-plan.md`
11. `cross-service-contract-map.md`
12. `stories/DEV-BLUEPRINT-*.md`

## Current Implementation Permission

Only `STORY-01-01` has per-story implementation authorization. All other blueprints are for external team review and later per-story authorization.

## Phase 5.2C Remediation Documents

- `08-uuid-and-identity-standard.md` - UUIDv7 identity policy and API error behavior.
- `09-manager-super-role-policy.md` - Manager/Developer/System Worker authorization policy and enforcement chain.
- `10-tool-catalog-and-operational-purpose.md` - concrete operational contracts for GitHub App, scanner, AIUsageFlow, reconciliation, legal RAG, classification and document shells.
- `11-rabbitmq-topology-and-event-contracts.md` - exact RabbitMQ exchanges, queues, routing keys, retry and DLQ rules.
- `12-npm-workspace-and-runtime-standard.md` - npm-only workspace and command standard.
- `13-manager-assessment-golden-path.md` - end-to-end Manager workflow trace from UI to API, DB, queue, worker and audit.
- `14-from-zero-local-build-runbook.md` - local prototype build and verification guide.
- `15-legacy-scope-resolution.md` - active/deferred scope and legacy Python-worker resolution.
