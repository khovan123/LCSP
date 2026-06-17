# LCSP Acceptance Criteria

## Purpose

Product/MVP acceptance criteria before implementation. These criteria remain conditional until A1-A3 validation completes.

## Criteria

| Area | Acceptance criteria |
| --- | --- |
| Authentication & MFA / OAuth-OIDC | User can register/login/logout; OAuth/OIDC login is active MVP and validates callback/linking safely; email verification/change password/profile management are scoped and audited when enabled; MFA setup uses Authenticator App/TOTP; MFA-enabled login requires valid OTP; OAuth/OIDC login does not grant GitHub repository access |
| Manager workflow | Manager can create assessment, complete Wizard, connect GitHub repository, run Repository Scan, review technical findings/AIUsageFlow, resolve all MVP conflicts, review/approve VerifiedProfile and generate report only after gates pass without Developer assignment |
| Developer workflow | Developer is optional; Developer can perform only assigned technical policies, including `RUN_REPOSITORY_SCAN` when granted, and cannot finalize conflict, approve VerifiedProfile, trigger final classification or generate final report |
| Evidence collection | MVP active evidence path is GitHub Repository Scan only: Manager connects repository and runs scan; delegated Developer may assist only if assigned; scanner creates `TechnicalEvidenceReport`; no manual/Local-CI upload appears in MVP UI/API flow |
| Evidence gates | Schema completeness gate rejects invalid reports; quality threshold gate controls classification readiness |
| AI Usage Flow Analysis | LCSP derives AIUsageFlow from repository scan evidence after TechnicalProfile according to `docs/specs/ai-usage-flow-analysis-spec.md`, including purpose, input/output, downstream action, affected subject, human review, automation level, uncertainty reasons and evidence refs where possible |
| Scanner signal taxonomy | Scanner findings required for AIUsageFlow follow `docs/specs/scanner-signal-taxonomy.md`, include required metadata/evidence refs and do not store secrets, raw source blocks or full prompt content by default |
| Static analysis scanner | Scanner follows `docs/specs/static-analysis-scanner-contract.md`: static-analysis only, no repository code execution, no install/build/test/Docker/CI/API probing, Tree-sitter generic parsing, TS Compiler API for TS/JS, Python `ast` for Python, traceable graph metadata only |
| Reconciliation | WizardProfile mismatches against TechnicalProfile or AIUsageFlow create conflicts routed to Manager resolution task in MVP |
| Risk classification | Runs only after Manager-approved VerifiedProfile and legal rule/citation retrieval using AIUsageFlow context according to `docs/specs/ai-usage-rule-mapping-spec.md` |
| Gap analysis | Manager can view gap analysis only after valid classification/gap result exists, and gap view is clearly not a final report |
| Document generation | Final report includes evidence source, legal trace, attestation disclosure if used and is blocked by any unresolved conflict |
| Conflict routing | No conflict creates VerifiedProfile; any conflict pauses workflow; unresolved conflict locks classification and final report; resolved conflict allows VerifiedProfile creation |
| Audit trail | Wizard answers, evidence metadata, gates, conflicts, attestations, classification and documents are auditable |
| Security/privacy | No raw source to LLM; no long-term raw source storage; metadata-only audit |
| Validation gates | Backlog cannot start until A1-A3 results exist and required PRD/Architecture/ADR updates are complete |

## Must-not-pass Conditions

- Wizard-only creates risk level.
- Evidence missing but classification runs.
- Attestation replaces scanner metadata.
- LLM produces legal conclusion without rule/citation.
- Risk Classification is based only on AI provider/model/framework presence.
- AIUsageFlow overclaims purpose when evidence is unclear instead of marking uncertainty.
- AIUsageFlow material claim is used for Legal Rule Matching without evidence refs.
- Scanner finding stores secret, raw source block or full prompt content contrary to the scanner signal taxonomy.
- Scanner executes repository code, runs install/build/test scripts, starts Docker/CI workflows or probes customer APIs.
- Scanner persists raw source body, complete AST body, full prompt or secret values.
- Scanner overclaims automated decision when downstream action cannot be traced.
- AIUsageFlow claim lacks claim-level evidence refs but is used for legal rule matching.
- Legal Rule Matching selects high-impact or automated-decision rule family from provider/model/framework presence alone.
- Developer performs Manager-only action.
- Report finalizes with any unresolved conflict.
- MVP main flow uses severity-based conflict routing instead of binary conflict routing.
- MVP conflict resolution depends on Developer action instead of Manager resolution.
- Risk Classification runs before Manager-approved VerifiedProfile.
- OAuth/OIDC login creates GitHub repository connection or grants repository scan permission.
- Delegated Developer runs repository scan without `RUN_REPOSITORY_SCAN` policy.
- Repository scan runs before GitHub repository is connected.
- Manual evidence upload or Local/CI upload is treated as active MVP flow.
- MFA-enabled account logs in without valid Authenticator App OTP.
- MFA secret appears in plaintext logs, evidence, audit or exported documents.
- MFA reset bypasses approved recovery/support/admin verification policy.

## Phase 3.1 Quality Acceptance Criteria

These criteria apply to the Phase 3.1 test architecture and design documentation pack:

- Test architecture must preserve Manager-owned MVP flow and Developer optionality.
- Risk-based design must classify Manager authority, OAuth callback safety, GitHub boundary, static scanner safety, AIUsageFlow evidence refs, VerifiedProfile gate, citation guardrail and final report gate as Critical.
- Test scenarios must map to at least one Use Case, Functional Requirement, Business Rule, Non-Functional Requirement, architecture invariant or acceptance criterion.
- Fixture design must use synthetic data only and must not include real credentials, personal data, proprietary source or runnable repository source.
- A2-b manual protocol must verify that provider/model/framework presence alone does not classify a system as high risk.
- Failure-mode design must require fail-closed behavior for raw source leakage, secret redaction failure, missing citation, unresolved conflict and audit-write failure.
- Phase 3.1 must not create test source, automation framework projects, CI workflow, Dockerfile, backlog, epic, story, sprint or task.

## Phase 3.2 NFR Quality Acceptance Criteria

These criteria apply to the Phase 3.2 NFR quality audit documentation pack:

- NFR audit must preserve OAuth/OIDC as MVP login and keep it separate from GitHub App repository authorization.
- NFR gates must preserve Manager super-role and Developer optionality in MVP.
- Static scanner gates must require no source execution, no install/build/test/Docker/CI/API probing, temporary workspace cleanup and no raw-source retention.
- Security/privacy verification must cover OAuth callback validation, MFA, session security, Manager authorization, GitHub App least privilege, redaction, LLM Gateway sanitization and audit integrity.
- Reliability design must require recovery paths that do not bypass Schema Gate, Quality Gate, Reconciliation, VerifiedProfile, Citation Guardrail or Output Guardrail.
- Performance/capacity design must define measurement points and repository size categories without inventing unapproved numeric thresholds.
- Accessibility/usability review must ensure Manager-facing screens explain uncertainty, blocked states, evidence source differences and conflict resolution without requiring Developer assignment.
- NFR measurement plan must specify collection point, redaction rule, retention rule, reviewer and gate/decision use for critical evidence.
- Phase 3.2 must not create source code, test source, load-test scripts, penetration-test scripts, CI workflow, Dockerfile, backlog, epic, story, sprint or task.

## Phase 3.3 Traceability and Quality-Gate Acceptance Criteria

These criteria apply to the Phase 3.3 traceability and quality-gate documentation pack:

- Critical MVP invariants must trace from canonical requirement or invariant to implementation document, test scenario, fixture or validation protocol, NFR gate and release quality gate.
- Traceability must preserve existing UC, FR, BR and NFR identifiers and must not invent replacement requirement IDs.
- Coverage gap register must distinguish validation dependencies, implementation decisions, future-scope decisions and architecture contradictions.
- Release quality gates must remain design/readiness gates only and must not declare implementation or production readiness.
- A1, A2, A2-b and A3 must each map to linked requirements, scenarios/fixtures, success evidence, decision impact and required document updates.
- A2-b trace must include internal summarization, customer chatbot without material decision, loan approval, HR ranking, human-reviewed decision, automated approval/rejection and unknown/dynamic/unsupported flow.
- Phase 3.3 must not create source code, test source, CI/CD YAML, Dockerfile, backlog, epic, story, sprint, task or development execution.
