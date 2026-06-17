# LCSP Test Architecture

## Purpose

Tài liệu này định nghĩa kiến trúc kiểm thử cho LCSP ở mức system-level trước implementation. Đây là tài liệu thiết kế kiểm thử, không tạo test source, framework project, CI workflow hoặc backlog.

## Scope

Áp dụng cho MVP LCSP với các invariant:

- Manager là MVP super-role và Developer absence không block workflow.
- OAuth/OIDC Login là MVP và tách khỏi GitHub App authorization.
- GitHub Repository Scan là active MVP technical-evidence path duy nhất.
- Scanner static-analysis only, không execute source, scripts, builds, installs, tests, Docker, CI workflows hoặc API probing.
- `TechnicalEvidenceReport -> Schema Gate -> Quality Gate -> TechnicalProfile -> AI Usage Flow Analysis -> Reconciliation -> VerifiedProfile -> Legal Rule Matching / RAG -> Risk Classification -> Gap Analysis -> Document Generation`.
- Raw source, full prompts, secrets và full AST bodies không vào LLM, ordinary audit logs hoặc long-term persistence.

## Source References

- `docs/specs/implementation-contract.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/workflows/phase-2-technical-documentation-checkpoint-report.md`
- `docs/implementation/testing-implementation.md`
- `docs/design/traceability-matrix.md`
- `docs/qa/test-strategy.md`
- `docs/qa/acceptance-criteria.md`

## Test Layers and Responsibilities

| Layer | Responsibility | Primary Risk Controlled | Example Focus |
| --- | --- | --- | --- |
| Unit | Validate deterministic rules and pure transformations | Logic defect | state transitions, confidence bands, gate predicates |
| Module/service integration | Validate service + persistence + policy boundaries | Integration defect | RBAC guard, transaction + audit write |
| API contract | Validate request/response and state preconditions | Contract drift | OAuth callback, scan request, conflict resolution |
| Async event/queue | Validate job envelope, retry, idempotency and event payloads | Workflow loss/duplication | duplicate scan job, dead-letter |
| Workflow/orchestrator | Validate node order, pause/resume and blocking rules | Unsafe transition | conflict pause, VerifiedProfile gate |
| Scanner fixture | Validate static scanner signal extraction and abstention | Evidence overclaim | loan approval, HR ranking, dynamic prompt |
| RAG and legal citation evaluation | Validate rule retrieval and citation guardrail | Unsupported legal output | missing citation, wrong rule family |
| End-to-end functional | Validate critical Manager-owned journeys | Business workflow failure | Manager completes assessment without Developer |
| Security/privacy | Validate auth, source privacy, redaction and audit constraints | Security/compliance failure | invalid OAuth callback, no raw source to LLM |
| Reliability/recovery | Validate failure handling, retry and user-visible blocking | Operational failure | queue outage, worker crash, storage failure |
| Manual validation A1/A2/A2-b/A3 | Validate product/legal/abuse assumptions | Incorrect product premise | wizard completeness, legal corpus, scanner mapping |

## LCSP Test Pyramid

| Level | Weight | Rationale |
| --- | --- | --- |
| Unit and rule tests | High | Deterministic gates, state rules and scanner claims should be fast and stable. |
| Integration and contract tests | High | LCSP risk sits at API/state/queue/evidence boundaries. |
| Scanner fixture tests | High | A2-b depends on fixture-backed evidence quality. |
| E2E tests | Selective | Use for Manager-owned critical paths and compliance gates, not every branch. |
| Manual validation | Required | A1/A2/A2-b/A3 cannot be replaced by automation. |

## Test Environment Topology

| Environment | Purpose | External Dependency Strategy |
| --- | --- | --- |
| Local | Design-time fixture validation and developer feedback | Mock OAuth, mock GitHub, synthetic scanner fixtures, fixture corpus |
| Integration | API/queue/worker contract validation | Controlled fake providers and isolated test DB/storage |
| Staging | End-to-end workflow and operational recovery | Test OAuth/GitHub installation, approved test corpus, test LLM provider config |
| Manual validation environment | A1/A2/A2-b/A3 research | Curated fixtures, reviewer protocols, no real customer data |

## Mock / Fake / Stub Boundaries

| Dependency | Preferred Test Double | Must Validate For Real Before Release |
| --- | --- | --- |
| OAuth/OIDC Provider | Fake provider for state/nonce/error cases | At least one configured provider callback and linking flow |
| GitHub App | Fake repository provider for most tests | Test GitHub App installation and selected repo read-only access |
| Queue | In-memory/fake queue for unit tests; real broker for integration | Retry, duplicate delivery and dead-letter behavior |
| LLM Gateway/provider | Fake gateway for schema/timeouts; no direct provider in unit tests | Provider adapter config, timeout and schema validation |
| Vector store | Fixture retrieval index | Corpus version pinning and retrieval quality |
| Object storage | Local/fake storage | Metadata, hash and access policy |

## External Dependency Handling

- OAuth/OIDC: validate callback, account linking and MFA policy without granting GitHub access.
- GitHub App: test selected repository/branch/commit authorization separately from user login.
- Queue: validate idempotency and at-least-once delivery assumptions.
- LLM Gateway: validate sanitized metadata, schema output, timeout and rejection of disallowed input.
- Vector store: validate retrieval through versioned legal corpus fixtures.
- Object storage: validate metadata/hash, not raw source retention.

## Test Isolation Principles

- Use synthetic fixtures only; no real credentials, personal data or proprietary source.
- Keep scanner fixture repositories versioned by checksum.
- Reset workflow state per test case.
- Do not let tests depend on execution order except explicit recovery protocols.
- Treat flaky tests as release risk, not harmless noise.

## Fixture Versioning and Expected Output Policy

Each fixture must define fixture id, version, checksum, expected findings, expected AIUsageFlow claims, uncertainty behavior, expected gates, legal-rule eligibility and sensitive-data handling.

## Evidence Retention and Redaction in Tests

Test artifacts may retain redacted metadata, hashes, evidence refs and expected-output snapshots. They must not retain raw source, full prompts, secrets, full AST bodies or raw provider tokens.

## Required Test Metadata

| Metadata | Meaning |
| --- | --- |
| Test ID | Stable identifier such as `TSC-001` |
| Source requirement | UC/FR/BR/NFR/architecture invariant |
| Risk level | Critical, High, Medium or Low |
| Test layer | Unit, integration, contract, scanner, RAG, E2E, security, manual |
| Data sensitivity | none, synthetic personal, synthetic financial, synthetic employment, synthetic health |
| Expected result | State, result, gate or output expectation |
| Blocking condition | What must stop if expectation fails |

## Quality-Gate Hierarchy

| Gate | Blocks |
| --- | --- |
| P0/Critical test failure | Phase progression or release decision |
| Contract mismatch | Integration and implementation acceptance |
| Missing citation test failure | Risk classification/final output acceptance |
| Raw source/privacy invariant failure | Security acceptance |
| A1/A2/A2-b/A3 inconclusive or failed | Backlog unblock |

## Testability Labels

Use these labels consistently:

- `TESTABLE_NOW`
- `TESTABLE_WITH_FIXTURE`
- `TESTABLE_AFTER_IMPLEMENTATION`
- `MANUAL_VALIDATION_REQUIRED`
- `BLOCKED_BY_VALIDATION_DEPENDENCY`

