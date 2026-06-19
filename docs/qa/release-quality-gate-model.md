# Release Quality Gate Model

## Purpose

Define LCSP documentation-level release quality gates. These gates are design/readiness gates only; they do not declare implementation readiness or production readiness.

## Gate Outcome Policy

| Outcome | Meaning |
| --- | --- |
| PASS | Required design trace and evidence exist. |
| CONCERNS | Gate can proceed with explicit non-blocking decisions or validation dependencies. |
| FAIL | Gate cannot proceed because a critical invariant, trace, safety control or validation dependency is broken. |
| WAIVED | Explicit owner-approved exception; not allowed for critical privacy, citation or unresolved-conflict guardrails unless future governance approves it. |

## Required Gate Chain

| Gate ID | Entry Evidence | Required Traceability | Failure Condition | Blocks | Validation Dependency | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| RQG-01 Architecture and Contract Consistency | Implementation contract, static scanner contract, ADRs, architecture reports | Canonical invariants map to architecture and implementation docs | Contract/architecture contradiction remains | Phase 2/3/future handoff | None | Architecture |
| RQG-02 Authentication, MFA and Authorization Safety | Auth/OAuth/MFA/RBAC docs, UC/FR/BR/NFR, TSC-001..TSC-004 | UC-M01-14, FR-074..FR-077, BR-086..BR-089, NFR-027..NFR-032, NFR-GATE-01..03 | OAuth callback unsafe, MFA bypass, Manager blocked, Developer gains final authority | Auth/MVP workflow acceptance | A3 for governance abuse | Security + Backend + Product |
| RQG-03 GitHub App and Repository Boundary | GitHub scan docs, OAuth boundary docs, TSC-004..TSC-006, TSC-035 | FR-025, FR-066, FR-076, BR-032, BR-077, BR-088, NFR-014, NFR-028 | OAuth grants repo access or manual/API probing appears active MVP | Repository scan release | None | Security + Backend |
| RQG-04 Static Scanner Safety and Privacy | Static scanner contract, source privacy policy, scanner implementation docs, TSC-016/TSC-017 | FR-058..FR-062, BR-057..BR-061, NFR-012..NFR-016, NFR-GATE-05/06 | Source execution, raw source retention, secret leakage or raw source to LLM | Scanner/evidence release | None | Security + Scanner |
| RQG-05 Evidence Integrity and Quality Gates | Evidence contract, gate docs, TSC-018/TSC-019 | FR-031..FR-035, NFR-017, NFR-023, NFR-GATE-07 | Invalid/insufficient evidence creates TechnicalProfile/classification | TechnicalProfile creation | A1/A2-b | Backend + Worker |
| RQG-06 AIUsageFlow and Reconciliation Integrity | AIUsageFlow spec, scanner taxonomy, reconciliation policy, TSC-007..TSC-023 | FR-069..FR-073, BR-080..BR-085, NFR-026, NFR-GATE-08/09 | Provider-only risk classification, unsupported claim used, unresolved conflict bypassed | Legal matching/classification | A1/A2-b/A3 | Architecture + QA + Product |
| RQG-07 VerifiedProfile and Classification Safeguards | Reconciliation, VerifiedProfile and classification docs, TSC-021..TSC-025 | FR-044..FR-047, FR-067, BR-049..BR-051, BR-078, NFR-018..NFR-020 | Classification runs without VerifiedProfile or critical purpose remains unknown | Classification release | A2/A3 | Worker + Legal/RAG |
| RQG-08 Legal Citation and Document Output Guardrails | Legal citation contract, RAG docs, document generation docs, TSC-024..TSC-028 | FR-045, FR-046, FR-049..FR-052, BR-050, BR-051, BR-063, NFR-019..NFR-021 | Unsupported legal conclusion or final document with unresolved conflict/missing citation | Document release | A2/A3 | Legal/RAG + Product |
| RQG-09 Queue, Worker and Recovery Design | Queue/job docs, worker/orchestrator docs, failure-mode design, TSC-006/TSC-029/TSC-030 | NFR-022, NFR-025, NFR-GATE-11/13 | Synchronous long-running work, unsafe duplicate, silent job loss or recovery bypassing gates | Async workflow release | None | Backend + DevOps |
| RQG-10 Auditability and Observability | Audit docs, observability audit, TSC-032 | FR-053..FR-057, BR-067..BR-070, BR-094, NFR-007, NFR-018, NFR-GATE-12 | Missing critical audit, secret/source/token in audit or no correlation | Compliance trace acceptance | A3 | Security + Backend |
| RQG-11 A1/A2/A2-b/A3 Validation Readiness | Manual protocols, fixtures, scenario catalogue, gap register | Validation matrix maps requirements, scenarios, fixtures, evidence and update path | Required validation lacks scenarios/fixtures/update path | Implementation backlog unblocking | A1/A2/A2-b/A3 | Product + QA |
| RQG-12 Implementation Handoff Readiness | Phase 1/2/3 reports, coverage gap register, readiness docs | All previous RQGs documented; open decisions classified with owner/timing | Backlog opened, readiness changed, or critical gap unresolved | Phase 4 documentation curation / later handoff | A1/A2/A2-b/A3 before implementation backlog | Product + Architecture + QA |

## Current Documentation-Level Gate Assessment

| Gate ID | Current Assessment | Reason |
| --- | --- | --- |
| RQG-01 | PASS | Canonical contract, scanner contract and architecture reports are traced. |
| RQG-02 | CONCERNS | Trace exists; A3 and implementation evidence still pending. |
| RQG-03 | PASS | OAuth/GitHub boundary and Repository Scan-only MVP flow are traced. |
| RQG-04 | PASS | Static scanner safety/privacy controls are traced. |
| RQG-05 | CONCERNS | Gate design exists; implementation evidence and A1/A2-b validation pending. |
| RQG-06 | CONCERNS | AIUsageFlow trace exists; A2-b validation is required. |
| RQG-07 | CONCERNS | VerifiedProfile/classification guardrails traced; A2/A3 validation pending. |
| RQG-08 | CONCERNS | Citation/document guardrails traced; A2/A3 validation pending. |
| RQG-09 | PASS | Queue/worker/recovery design trace exists. |
| RQG-10 | CONCERNS | Audit trace exists; audit immutability decision remains before implementation. |
| RQG-11 | CONCERNS | Validation protocols/fixtures exist; actual A1/A2/A2-b/A3 results are pending. |
| RQG-12 | CONCERNS | Documentation handoff can proceed, but implementation backlog remains blocked. |

## Non-Readiness Statement

These gates do not mark LCSP as implementation-ready or production-ready. They organize documentation-level quality evidence so Phase 3 final review can decide whether the documentation pack is internally traceable.

