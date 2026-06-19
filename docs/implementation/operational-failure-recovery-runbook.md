# Operational Failure Recovery Runbook

## Purpose

Define expected detection, automatic response, operator action, user-visible result and audit/alert behavior for LCSP failure modes.

## Scope

This is an operations design runbook, not executable automation.

## Dependencies / Source References

- [Audit and Observability Implementation](audit-observability-implementation.md)
- [Queue Jobs, Retry and Idempotency](queue-jobs-retry-idempotency.md)

## Failure Matrix

| Failure | Detection | Automatic Response | Operator Action | User-visible Result | Audit / Alert |
| --- | --- | --- | --- | --- | --- |
| OAuth provider outage | callback/start failure rate | Show login unavailable/retry | Verify provider/config | Login unavailable | Alert auth outage |
| OAuth callback validation failure | invalid state/nonce/issuer/audience | Reject callback | Investigate abuse/config | Login failed | Audit failure |
| GitHub App token failure | API/clone auth failure | Mark scan blocked/failed | Reconnect/rotate app creds | Repository access issue | Audit + alert if repeated |
| Repository clone failure | worker clone error | Retry if transient | Inspect repo access/network | Scan failed/retryable | Audit scan failure |
| Scanner failure | worker node failure | Retry or fail job | Inspect scanner/ruleset | Scan failed | Audit + metric |
| Report hash mismatch | gate validation | Reject report | Investigate integrity | Evidence rejected | Security alert |
| Schema invalid | Schema Gate fail | Reject report | Fix scanner contract/rules | Classification locked | Audit gate fail |
| Quality insufficient | Quality Gate fail | Request re-scan/correction | Review coverage | Classification locked | Audit insufficient |
| AIUsageFlow uncertain | critical claim unknown | Block final classification or create Manager clarification | Review evidence/fixtures | Needs clarification | Audit uncertainty |
| Unresolved conflict | conflict status open | Pause workflow | Manager resolves | Classification locked | Audit conflict age |
| RAG failure | retrieval error | Retry/degrade/block | Inspect corpus/vector store | Classification unavailable | Alert if repeated |
| Missing citation | citation guardrail fail | Block/degrade output | Review corpus/rules | Legal output blocked/degraded | Audit citation missing |
| LLM timeout | gateway timeout | Retry then fail closed | Inspect provider/rate limits | Step delayed/blocked | Audit model timeout |
| LLM invalid output | schema validation fail | Retry then fail closed | Inspect prompt/model | Step blocked/degraded | Audit invalid output |
| Queue outage | broker health | Stop enqueue/consume | Restore queue | Async actions unavailable | Alert queue outage |
| Worker crash | heartbeat/job timeout | Requeue/resume checkpoint | Restart worker | Job delayed | Audit retry |
| Database outage | DB health | Fail requests closed | Restore DB | Service unavailable | Critical alert |
| Object-storage failure | storage write/read error | Retry then fail | Restore storage | Document unavailable | Audit storage failure |
| Document generation failure | job failure | Retry if safe | Inspect template/data | Document failed | Audit failure |
| Audit write failure | audit service error | Fail closed for critical transitions | Restore audit path | Action blocked | Critical alert |

## Security and Privacy Considerations

Operator diagnostics must use redacted metadata. Do not pull raw source or secrets into support tickets/logs.

## Audit Requirements

Each failure and recovery action should be traceable through audit event and correlation id.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Alerting backend and escalation policy | Provider-neutral | Implementation/operations |

