# Configuration, Secrets and Environments

## Purpose

Define configuration groups, secret handling and environment expectations for LCSP.

## Scope

Applies to local, development, staging and production environments. This document does not provide real secret values or runnable configuration.

## Dependencies / Source References

- [Security and Privacy Implementation](security-privacy-implementation.md)
- [Infrastructure Deployment Implementation](infrastructure-deployment-implementation.md)

## Implementation Boundaries

- No secret values in docs, code, logs, audit records or frontend.
- OAuth/OIDC provider selection is configuration, not Future scope.
- Enterprise SSO/SAML/SCIM/domain federation remains Future/Enterprise.

## Environment Expectations

| Environment | Purpose | Notes |
| --- | --- | --- |
| local | Developer documentation/testing environment | May use mocks for external providers |
| development | Shared integration validation | Non-production data only |
| staging | Release candidate validation | Production-like controls |
| production | Live LCSP environment | Strict secret, audit, backup and retention controls |

## Configuration Groups

| Config Group | Example Key Category | Owner | Storage Location | Rotation | Never Log? |
| --- | --- | --- | --- | --- | --- |
| database | host, db name, connection ref | DevOps | Secret/config store | per policy | Yes for password |
| queue | broker URL/ref, exchange/queue names | DevOps | Secret/config store | per policy | Yes for credential |
| object storage | bucket/container, access ref | DevOps | Secret/config store | per policy | Yes |
| OAuth/OIDC | issuer, client id, secret ref, callback URL | Security | Secret/config store | provider policy | Yes for secret/token |
| MFA encryption | key reference | Security | KMS/secret store | security policy | Yes |
| GitHub App | app id, installation refs, private key ref | Security/DevOps | Secret store | GitHub policy | Yes |
| LLM Gateway | provider refs, model labels, rate limits | Architecture/Security | Secret/config store | provider policy | Yes for API keys |
| legal corpus | active corpus version, ingestion refs | Legal/RAG owner | Config/DB | versioned | No secrets expected |
| scanner rulesets | ruleset version, feature flags | Scanner owner | versioned artifact/config | release policy | No |
| observability | metrics/logging endpoints | DevOps | Secret/config store | per policy | Yes for tokens |
| application URLs | base URLs, callback URLs | DevOps | config store | deployment policy | No secrets |
| feature flags | optional capabilities | Product/DevOps | config store | release policy | No secrets |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Environment config | Bootstrapped API/Web/Worker |
| Secret refs | Runtime provider credentials without log exposure |
| Feature flags | Enabled/disabled UI/API capabilities |

## State / Error / Failure Handling

Missing required production secrets must prevent service startup. Invalid callback URLs must block OAuth/OIDC login configuration. Missing GitHub App config must block repository connection.

## Security and Privacy Considerations

Secret injection must avoid frontend exposure. Logs and audit records must use references or redacted labels.

## Audit Requirements

Audit configuration-sensitive changes where LCSP supports admin operations, including provider config changes, corpus version activation and ruleset version changes.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Secret manager/KMS tooling | Provider-neutral | Implementation configuration |
| Exact OAuth/OIDC provider | At least one configured provider before release | Release configuration |

