# Audit and Observability Implementation

## Purpose

Define audit taxonomy, tracing, metrics, alerting and redaction expectations for LCSP.

## Scope

Audit supports compliance traceability, security review, workflow debugging and readiness evidence. Observability supports operational health without exposing sensitive source or secrets.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Threat Model](../security/threat-model.md)
- [API and Async Event Contracts](api-and-async-event-contracts.md)

## Implementation Boundaries

- Audit logs are metadata records, not raw source repositories.
- Ordinary audit records must not contain raw source, full prompts, secrets, raw provider tokens or full AST bodies.
- Critical audit write failure should fail closed for critical transitions where policy requires traceability.

## Audit Event Taxonomy

| Category | Events |
| --- | --- |
| Auth | login success/failure, OAuth callback validation, account linked/unlinked, MFA events, session revoked |
| Authorization | access denied, permission grant/revoke, Developer delegated action |
| Assessment | created, Wizard submitted, state changed |
| Repository | GitHub connected/disconnected, scan requested/started/completed/failed |
| Evidence | schema passed/failed, quality ready/insufficient, report hash verified |
| AIUsageFlow | ready, uncertain, conflict candidate created |
| Reconciliation | conflict found, Manager task created, conflict resolved, reconciliation re-run |
| Classification | requested, blocked, completed, citation missing |
| Document | requested, blocked, generated, downloaded |
| Security | redaction event, cleanup failure, disallowed LLM input rejected |

## Correlation and Workflow Tracing

Every audit event should include correlation id, workflow run id, assessment id, actor id/role where applicable, component, action, result, timestamp and redacted context.

## Metrics

| Metric | Purpose |
| --- | --- |
| scan success/failure rate | Scanner reliability |
| schema failure rate | Contract quality |
| quality insufficient rate | Evidence sufficiency |
| AIUsageFlow uncertainty rate | A2-b and scanner quality |
| conflict rate | Wizard/evidence mismatch signal |
| classification block rate | Gate health |
| citation-missing rate | Legal corpus quality |
| document success/failure rate | Output reliability |
| queue latency | Async health |
| worker duration | Worker capacity |
| LLM timeout rate | Provider/gateway health |
| conflict-resolution age | Human workflow SLA |

## Alerting

Alert on workspace cleanup failure, audit write failure, high queue dead-letter rate, high citation-missing rate, repeated OAuth callback failures, secret redaction failures and object storage write failures.

## Operational Dashboards

Dashboards should show workflow health, queue latency, scanner success, gate outcomes, LLM gateway status, document generation status and security alerts.

## Audit Export

Export must be redacted and scoped by organization/assessment authorization. Export should include hashes/refs and correlation ids, not raw source or secrets.

## Security and Privacy Considerations

Apply deterministic redaction before audit persistence. Store sensitive identifiers only where needed and governed by retention policy.

## Audit Requirements

This document defines audit requirements. Each implementation component must emit events through the shared audit service or equivalent API-owned boundary.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Audit immutability mechanism | Append-oriented expectation defined | Implementation |
| Metrics backend | Provider-neutral observability boundary | Implementation configuration |

