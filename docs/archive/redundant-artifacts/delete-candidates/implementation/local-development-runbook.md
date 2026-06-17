# Local Development Runbook

## Purpose

Describe local setup expectations for future LCSP implementation work without providing runnable commands or configuration.

## Scope

Covers prerequisites, startup order, environment categories, local OAuth/GitHub strategy, scanner fixtures, legal corpus initialization, migration order, queue/object storage inspection, test accounts and troubleshooting.

## Dependencies / Source References

- [Configuration, Secrets and Environments](configuration-secrets-environments.md)
- [Repository and Module Layout](repository-and-module-layout.md)

## Implementation Boundaries

This runbook is not an implementation script. It must not include real secrets or production tokens.

## Prerequisites

Future developers will need runtime support for Web, API, Worker, PostgreSQL, queue, object storage substitute, legal corpus fixtures, scanner fixtures and configured OAuth/GitHub test integration or mocks.

## Startup Order

| Order | Area | Reason |
| ---: | --- | --- |
| 1 | Configuration and secrets | Services fail closed when required config missing |
| 2 | PostgreSQL and migrations | API/Worker need durable state |
| 3 | Queue | Async job boundary |
| 4 | Object storage | Document artifacts and allowed refs |
| 5 | API | Auth/domain/job creation |
| 6 | Worker | Queue consumption and orchestrator |
| 7 | Web | UI integration |
| 8 | Legal corpus fixtures | RAG/classification tests |
| 9 | Scanner fixtures | A2-b/local scanner tests |

## Local Environment Variables by Category

Use placeholder categories only: database, queue, object storage, OAuth/OIDC, MFA encryption, GitHub App, LLM Gateway, legal corpus, scanner rulesets, observability and app URLs.

## Local OAuth Callback Strategy

Use a configured local callback URL or mocked provider. Validate state, nonce, issuer, audience and expiry even in local mode.

## GitHub App Testing Strategy

Use a test GitHub App installation or mock repository provider. Do not substitute OAuth/OIDC identity for repository authorization.

## Scanner Fixture Strategy

Use synthetic repositories for internal summarization, loan approval, HR ranking, chatbot, dynamic prompt and provider-only cases. Scanner remains static-analysis only.

## Legal Corpus Initialization

Load approved fixture corpus versions with deterministic citation ids. Do not claim real legal advice from incomplete fixtures.

## Safe Local Data Rules

Do not use real customer repositories, secrets, full prompts or regulated personal data in local fixtures.

## Troubleshooting

| Symptom | Likely Area |
| --- | --- |
| Login succeeds but repo unavailable | GitHub App not connected; OAuth does not grant repo access |
| Scan stuck | Queue/Worker/job state |
| Classification blocked | Missing VerifiedProfile, unresolved conflict, unclear usage or missing citation |
| Document blocked | Final report gate failed |
| AIUsageFlow unknown | Scanner coverage limitation or unsupported dynamic flow |

## Audit Requirements

Local runs should still emit redacted audit events so developers can verify traceability.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Local mock versus real integration defaults | Both allowed by policy; exact setup deferred | Implementation |

