# LCSP Test Strategy

## Purpose

Defines pre-implementation test strategy for LCSP. This is not a test backlog.

## Test Layers

| Layer | Focus |
| --- | --- |
| Authentication tests | Register/login/logout/session/email verification/password reset/change password/profile constraints, OAuth/OIDC login/callback/linking, and Authenticator App MFA setup/login/disable/reset |
| Unit tests | Pure rules, state transitions, scoring thresholds, validators |
| Integration tests | Evidence report validation, reconciliation, RAG/rule lookup, document pipeline |
| E2E tests | Manager-only assessment completion, optional Developer evidence task, repository scan/re-scan, conflict resolution, VerifiedProfile approval, gap view, report generation |
| Agent output validation | Schema validation, rule trace, no unsupported legal conclusion |
| Evidence contract validation | Required fields, privacy flags, report hash, provenance and scan job output contract |
| AI Usage Flow tests | Purpose/input/output/downstream action/affected subject/human review/harm-potential extraction and uncertainty handling |
| Reconciliation tests | Conflict creation, Manager routing, optional delegated clarification, block conditions |
| Scoring tests | Evidence Confidence, AI Intervention from AIUsageFlow and optional Conflict Score explanation; conflict routing remains binary |
| Security/privacy tests | No raw source to LLM, no long-term source storage, secret redaction |
| MFA/security tests | MFA secret not logged plaintext, invalid/expired OTP rejected, OTP brute force protection, MFA reset audit |
| Regression tests | Wizard-only no risk level, no classification before VerifiedProfile, no final report with conflict |

## Validation A1-A3 Dependency

| Assumption | Test strategy dependency |
| --- | --- |
| A1 | Final WizardProfile fields and Wizard UX test cases |
| A2 | Legal rule fixtures, citation contract and output validation |
| A3 | Attestation abuse tests and role-bound claim policy |

## Non-negotiable Regression Assertions

- Wizard-only never shows HIGH/MEDIUM/LOW or provisional risk label.
- Risk Classification cannot run before Manager-approved VerifiedProfile.
- Conflict routing is binary in MVP: no conflict creates VerifiedProfile; any unresolved conflict locks classification and final report.
- Human attestation cannot replace machine-generated metadata.
- Raw source code is not sent to LLM.
- Final report cannot be generated with any unresolved conflict.
- MFA-enabled account cannot create a session without a valid Authenticator App OTP.
- MFA setup is not enabled until OTP verification succeeds.
- MFA reset/disable actions are audited and cannot bypass authentication policy.
- OAuth/OIDC login validates callback/state/nonce/provider claims and does not grant GitHub repository access.
- Manager can run repository scan without Developer assignment.
- Delegated Developer cannot run repository scan without `RUN_REPOSITORY_SCAN` policy.
- Developer cannot run repository scan before GitHub repository is connected.
- Scanner creates `TechnicalEvidenceReport` with `source_type=GITHUB_REPOSITORY_SCAN`, scan_job_id, repo/branch/commit metadata and report_hash.
- Risk Classification must not be based only on `provider=OpenAI` or any model/framework/dependency presence.
- AI Intervention Score must be derived from AIUsageFlow.
- Failed scan or invalid report keeps classification locked.
- No manual evidence upload, Local/CI upload or generic evidence submission path appears in MVP UI/API flow.
- Gap analysis view cannot be presented as final compliance report.

## Conflict Routing MVP Test Cases

- No conflict -> VerifiedProfile created.
- Any conflict -> workflow pauses.
- Any unresolved conflict -> classification locked.
- Any unresolved conflict -> final report blocked.
- Conflict resolved -> VerifiedProfile can be created.
- Manager can resolve business/legal conflict.
- Manager can resolve technical conflict by reviewing evidence or requesting re-scan/correction.
- Workflow is not blocked because Developer is absent.
- No MVP test depends on Developer action to unlock classification.
- No severity-based conflict route appears in MVP main flow.

## OAuth/OIDC Test Cases

- User can start OAuth/OIDC login.
- Valid callback creates or links LCSP identity safely.
- Invalid callback/state/nonce/issuer/audience/expiry is rejected.
- OAuth/OIDC login does not create GitHub repository connection automatically.
- OAuth/OIDC login does not grant repository scan permission automatically.
- OAuth-linked user still follows LCSP MFA policy when applicable.
- Provider identity cannot link to another account without verified identity/linking policy.
- OAuth secrets/tokens do not appear in UI, logs or audit events.

## Manager Superset Permission Test Cases

- Manager can connect a repository without Developer assignment.
- Manager can run a repository scan without Developer assignment.
- Manager can review TechnicalEvidenceReport and AIUsageFlow.
- Manager can resolve business conflict.
- Manager can resolve technical conflict.
- Manager can complete assessment from start to document generation without Developer account.
- Workflow is not blocked because Developer is absent.

## Post-MVP Delegation Test Cases

- Manager can grant scoped technical permission to Developer.
- Manager keeps the same permission after delegation.
- Manager can revoke delegated permission.
- Developer cannot finalize conflict or generate final compliance document unless future policy explicitly changes this.
- All grants, revocations and delegated actions are audited.

## AI Usage Flow Analysis Test Cases

- Validate `AIUsageFlow` output against `docs/specs/ai-usage-flow-analysis-spec.md`.
- Validate scanner finding types and required fields against `docs/specs/scanner-signal-taxonomy.md`.
- Validate static scanner behavior against `docs/specs/static-analysis-scanner-contract.md`.
- Scanner does not execute repository code, install dependencies, run build/test scripts, run Docker/CI workflows or probe APIs.
- Tree-sitter generic parsing is used for fallback structure; TypeScript Compiler API is used for TS/JS semantic analysis; Python `ast` plus import resolver is used for Python semantic analysis.
- Scanner emits graph paths for route -> service -> model invocation -> output -> downstream action where traceable.
- Scanner emits `SCAN_COVERAGE_LIMITATION` or `UNSUPPORTED_DYNAMIC_FLOW` for dynamic imports, reflection, runtime prompts, queue breaks, generated/minified code or unresolved output path.
- AIUsageFlow uses claim-level evidence refs; material claims without evidence refs cannot be used for legal rule matching.
- Validate Legal Rule Matching behavior against `docs/specs/ai-usage-rule-mapping-spec.md`.
- Repo uses OpenAI only for internal summarization -> AIUsageFlow should not classify it as automated decision.
- Repo uses AI score to approve/reject loan -> AIUsageFlow detects decision flow, downstream approve/reject action and affected customer.
- Wizard says internal assistant but repo shows customer-facing chatbot -> conflict created.
- Wizard says human review exists but repo shows auto-approve path -> conflict created.
- Repo contains system prompt for legal/compliance decision support -> `SYSTEM_PROMPT_PURPOSE_SIGNAL` is created without sending full prompt/raw source to LLM.
- Dynamic runtime prompt reference detected but content unavailable -> usage flow marked uncertain.
- Legal Rule Matching uses AIUsageFlow business_process and ai_purpose.
- Risk Classification is blocked if usage purpose conflict is unresolved.
- Risk Classification must not be based only on `provider=OpenAI`.
- AIUsageFlow material claims without evidence refs cannot be used for legal rule matching.
- Scanner finding output must not contain secrets, raw source blocks or full prompt content by default.
- Internal summarization maps to low-impact/general governance obligations when applicable, not automated decision/high-impact rule family by default.
- Loan approval scoring maps to automated-decision, financial-service, affected-person and oversight/documentation rule families when evidence supports those fields.
- HR candidate ranking maps to employment/recruitment, discrimination-risk, oversight and transparency rule families when evidence supports those fields.
- Customer chatbot maps to transparency/user-facing AI obligations when applicable and is not high-risk by default unless the usage flow shows protected/high-impact decisioning.
- A2-b validation remains required before implementation backlog can be unblocked.

## Static Analysis Scanner Fixtures and A2-b Metrics

Required fixture families:

- Internal summarization / internal assistant.
- Loan approval / credit scoring.
- HR screening / recruitment ranking.
- Customer-facing chatbot without decision.
- Human-reviewed loan decision.
- Auto-approve or auto-reject decision.
- Dynamic runtime prompt reference.
- Provider/model detected but no business impact.
- AI invocation with unresolved downstream path.
- Wizard says no automated decision but source shows approve/reject.

A2-b metrics:

| Metric | Purpose |
| --- | --- |
| AI invocation detection precision | Avoid false AI invocation evidence |
| Business purpose mapping precision | Validate business_process claim quality |
| Input category detection accuracy | Validate data category evidence fusion |
| Output type detection accuracy | Validate output claim quality |
| Downstream-action detection accuracy | Validate action tracing |
| Human-review detection accuracy | Validate present/absent/unclear review states |
| Automated-decision false-positive rate | Prevent overclaiming automated decisions |
| Unknown/abstain correctness | Verify scanner abstains at unsupported boundaries |
| AIUsageFlow claim evidence completeness | Ensure claim-level evidence refs exist |
| Legal-rule mapping eligibility completeness | Ensure only evidence-backed claims feed legal matching |

## Phase 3.1 Test Architecture Documents

The following Phase 3.1 documents define the risk-based test architecture and design pack. They are documentation-only artifacts and do not create test source, automation framework setup, CI workflow, Dockerfile, backlog, epic, story, sprint or task.

| Document | Purpose |
| --- | --- |
| `docs/qa/test-architecture.md` | Defines LCSP test layers, environment topology, fixture versioning, redaction rules, test metadata and quality-gate hierarchy. |
| `docs/qa/risk-based-test-design.md` | Prioritizes critical/high/medium/low risk areas and required test layers. |
| `docs/qa/test-scenario-catalog.md` | Provides stable `TSC-001..TSC-035` scenario catalogue mapped to UC/FR/BR/NFR. |
| `docs/qa/test-fixture-and-test-data-design.md` | Defines synthetic fixture families `F-SCAN`, `F-RAG`, `F-CONFLICT`, `F-AUTH` and `F-OPS`. |
| `docs/qa/contract-and-integration-test-design.md` | Defines API/event/job/worker/LLM/document/audit contract groups. |
| `docs/qa/failure-mode-and-recovery-test-design.md` | Defines failure injection, expected recovery, user-visible behavior and audit/alert evidence. |
| `docs/qa/manual-validation-protocols.md` | Defines A1, A2, A2-b and A3 manual validation protocols without recording results. |

## Phase 3.2 NFR Quality Audit Documents

The following Phase 3.2 documents define NFR quality gates and evidence plans. They are documentation-only artifacts and do not create test source, load-test scripts, penetration-test scripts, monitoring configuration, CI workflow, Dockerfile, backlog, epic, story, sprint or task.

| Document | Purpose |
| --- | --- |
| `docs/qa/nfr-quality-audit.md` | Reviews NFR quality attributes, architecture surfaces, risks, evidence and validation methods. |
| `docs/qa/nfr-acceptance-gates.md` | Defines NFR-GATE-01..NFR-GATE-15 go/no-go gates. |
| `docs/qa/security-privacy-control-verification.md` | Maps OAuth, MFA, RBAC, GitHub App, scanner, LLM and audit threats to controls and verification methods. |
| `docs/qa/reliability-resilience-quality-design.md` | Defines recovery behavior for queue, worker, scanner, database, RAG, LLM, document and audit failures. |
| `docs/qa/performance-capacity-quality-design.md` | Defines performance/capacity measurement design without unapproved numeric thresholds. |
| `docs/qa/observability-operational-readiness-audit.md` | Defines correlation dimensions, telemetry and dashboard/alert design. |
| `docs/qa/accessibility-usability-nfr-review.md` | Defines Manager-facing accessibility/usability review criteria. |
| `docs/qa/nfr-measurement-and-evidence-plan.md` | Defines evidence collection, redaction, retention and reviewer responsibilities for NFR gates. |

## Phase 3.3 Traceability and Quality-Gate Documents

The following Phase 3.3 documents define traceability and documentation-level quality gates. They do not create test automation, CI/CD setup, backlog, story, sprint or implementation work.

| Document | Purpose |
| --- | --- |
| `docs/qa/traceability-and-quality-gate-review.md` | Maps UC/FR/BR/NFR/invariants to implementation docs, scenarios, fixtures/protocols, NFR gates and release quality gates. |
| `docs/qa/coverage-gap-register.md` | Records validation dependencies and implementation decisions that remain open before backlog unblocking or implementation. |
| `docs/qa/release-quality-gate-model.md` | Defines documentation-level release quality gates RQG-01..RQG-12. |
