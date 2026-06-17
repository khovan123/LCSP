# Performance and Capacity Quality Design

## Purpose

Define performance and capacity measurement design for LCSP. This document does not create load-test scripts or numeric SLOs.

## Repository Size Categories

| Category | Definition |
| --- | --- |
| small | Repository within default MVP scanner limits and expected to complete quickly |
| medium | Repository near normal MVP size limits requiring representative scanner duration measurement |
| large | Repository approaching configured file/count/time limits |
| unsupported/exceeds-MVP-limit | Repository exceeds static scanner policy and should emit coverage limitation or fail safely |

## Measurement Matrix

| Quality Concern | Workload Profile | Measurement Method | Instrumentation Needed | Candidate Threshold | Threshold Status | Required Before |
| --- | --- | --- | --- | --- | --- | --- |
| API latency | Manager dashboard, Wizard, status, evidence views | API timing percentiles by endpoint group | API metrics/traces | TBD after baseline | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation/release |
| OAuth callback latency | OAuth/OIDC callback and MFA handoff | Callback duration and failure rate | Auth metrics/audit | TBD after provider config | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Release |
| Repository-scan queue latency | scan requested -> scan started | Queue age and job start timestamp | queue metrics, job timestamps | TBD by environment | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Scan duration by repository size | small/medium/large/unsupported fixtures | scan started -> completed/failed | scanner metrics, repo inventory | TBD per category | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | A2-b/implementation |
| Scanner memory and CPU | Static scanner workloads | Worker resource metrics | worker telemetry | TBD by sandbox tech | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Queue backlog age | concurrent scan/classification/doc jobs | max/avg backlog age | queue metrics | TBD | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Worker concurrency | multiple jobs and scanner sandbox capacity | worker throughput and contention | worker metrics | TBD by deployment | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| RAG retrieval latency | legal rule query by AIUsageFlow | retrieval timing | RAG metrics | TBD by vector store | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Classification workflow duration | VerifiedProfile -> classification result | workflow run timing | orchestrator traces | TBD | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| LLM Gateway latency and timeout frequency | allowed sanitized calls | gateway duration, timeout rate | LLM gateway metrics | TBD by provider | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Document-generation duration | valid report generation | job duration and storage write time | worker/storage metrics | TBD | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Database query behavior | assessment/evidence/audit reads/writes | query duration and lock wait | DB metrics/traces | TBD | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Object-storage latency | document write/read | storage operation timing | storage metrics | TBD by provider | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Implementation |
| Manual validation throughput | A1/A2/A2-b/A3 sessions | reviewer time and completion rate | manual protocol records | protocol-defined | DEFINED_IN_CANONICAL_DOCS | Validation |

## Execution Boundary

Full load, stress and soak execution requires implementation and a configured environment. Phase 3.2 only defines the measurement plan and unresolved threshold decisions.

## Capacity Risks

- Scanner sandbox concurrency can exhaust worker resources.
- Queue backlog can hide workflow failures without age metrics.
- RAG/LLM latency can stall classification.
- Audit write throughput must keep up with critical transitions.

