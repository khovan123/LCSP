# Infrastructure and Deployment Implementation

## Purpose

Define provider-neutral infrastructure and deployment guidance for LCSP.

## Scope

Covers Web/API/Worker deployment, PostgreSQL, queue, vector store, object storage, network boundaries, health checks, scaling, backup/restore, disaster recovery and scanner workspace cleanup.

## Dependencies / Source References

- [System Runtime and Component Contracts](system-runtime-and-component-contracts.md)
- [Configuration, Secrets and Environments](configuration-secrets-environments.md)

## Implementation Boundaries

- Do not choose a new cloud vendor here.
- API must remain responsive and delegate long-running work to Queue + Worker.
- Worker owns scanner/orchestrator runtime.
- Scanner workspace must be isolated and temporary.

## Runtime Components

| Component | Deployment Concern |
| --- | --- |
| Next.js Web | Public web runtime behind TLS |
| NestJS API | Auth/RBAC/domain API behind TLS |
| Python Worker | Queue consumer and orchestrator runtime |
| PostgreSQL | Authoritative state and metadata store |
| Queue | RabbitMQ-compatible async boundary |
| Vector store | Legal RAG retrieval boundary |
| Object storage | Generated documents and allowed artifacts |
| Reverse proxy/load balancer | TLS, routing, request limits |
| Scanner workspace | Isolated temporary workspace per scan |

## Network Boundaries

- Web talks to API.
- API talks to DB, queue, OAuth/OIDC provider, GitHub App and object storage.
- Worker talks to queue, DB, GitHub App access context, object storage, vector store and LLM Gateway.
- LLM Gateway talks to external provider.
- Scanner outbound network should be restricted after repository retrieval.

## Health / Readiness / Liveness

| Component | Health Check |
| --- | --- |
| Web | static/runtime readiness |
| API | DB/queue/config readiness, auth callback route availability |
| Worker | queue consumer readiness, DB connectivity, cleanup controller health |
| Queue | broker availability and dead-letter rate |
| DB | connectivity, replication/backup health where applicable |
| Object storage | read/write probe for allowed artifacts |

## Scaling Boundaries

Scale Web/API independently from Worker. Worker scaling must respect scanner sandbox capacity, queue concurrency, GitHub API limits, LLM rate limits and database write pressure.

## Backup and Restore

Back up PostgreSQL and object storage metadata/artifacts according to retention policy. Raw source workspaces are not backed up. Restore procedures must preserve audit and version relationships.

## Workspace Cleanup

Scanner workspace cleanup is mandatory. Cleanup failure is a critical security event and must trigger alert/remediation.

## State / Error / Failure Handling

Infrastructure failure should preserve durable workflow state and allow retry/resume where safe. Queue outage blocks new async work but should not corrupt assessment state.

## Security and Privacy Considerations

Use TLS, secret store/KMS, restricted network policies, least privilege service credentials and environment separation.

## Audit Requirements

Audit deployment-sensitive domain events through application audit; infrastructure logs must be redacted and correlated but should not include raw source/secrets.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Hosting/VPS/container target | Provider-neutral deployment model | Implementation configuration |
| Queue deployment topology | RabbitMQ-compatible boundary | Implementation configuration |
| Object storage provider | S3-compatible or equivalent boundary | Implementation configuration |

