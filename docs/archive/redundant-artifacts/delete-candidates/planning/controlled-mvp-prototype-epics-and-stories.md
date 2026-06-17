# Controlled MVP Prototype Epics and Stories

## Scope and Authorization

This backlog is authorized only for controlled MVP prototype implementation under owner risk acceptance.

Decision source:

- `docs/validation/owner-risk-acceptance-controlled-mvp-prototype.md`
- `docs/workflows/controlled-mvp-prototype-implementation-activation-report.md`

Readiness boundary:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_NOT_READY
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

This document does not claim real validation completion, formal legal reliability validation, compliance certification, production release authorization, runtime scanner accuracy validation or A2-b2 completion.

## Global Prototype Guardrails

- Manager is the MVP super-role and can complete the prototype flow without Developer assignment.
- OAuth/OIDC login authenticates LCSP identity only and remains separate from GitHub App repository authorization.
- GitHub Repository Scan is the only active MVP technical evidence path.
- Scanner prototype is static-analysis only and synthetic-fixture driven.
- Raw source, full prompts, secrets and raw AST bodies must not enter LLM, ordinary audit logs or long-term persistence.
- Provider/model/framework detection alone must not create legal risk classification.
- Classification requires VerifiedProfile and citation traceability; workflow shells must block when prerequisites are missing.
- Validated/production backlog remains blocked.

## Epic Inventory

### EPIC-01 Platform Foundation and Prototype Guardrails

| Field | Detail |
|---|---|
| Epic ID | EPIC-01 |
| Title | Platform Foundation and Prototype Guardrails |
| Business objective | Establish a prototype-safe workspace, module boundaries, status vocabulary and guardrails before user-facing workflow work begins. |
| Prototype scope | Local development boundaries, app/module skeleton planning, shared contracts, feature flags, prototype status gates and explicit non-production markers. |
| Out-of-scope boundary | Production infrastructure, CI/CD deployment, customer onboarding, validated release claims. |
| Dependencies | Owner risk acceptance; implementation readiness normalization. |
| References | `docs/implementation-readiness.md`, `docs/implementation/repository-and-module-layout.md`, `docs/implementation/system-runtime-and-component-contracts.md`, `docs/specs/state-machine.md` |
| Validation limitation / risk acceptance | Prototype may proceed before real validation evidence; global readiness remains `IMPLEMENTATION_NOT_READY`. |
| Definition of done | Prototype guardrails are visible in configuration/docs, app boundaries are ready for implementation stories, and no production/validated-release language appears. |

#### STORY-01-01 Prototype Runtime Boundary Setup

- Epic ID: EPIC-01
- User story: As a technical lead, I want the prototype runtime boundaries represented in the project structure so Web, API, Worker, scanner, contracts and rules are separated from the start.
- Business value: Reduces rework and keeps implementation aligned to architecture.
- Acceptance criteria:
  - Web, API, Worker, scanner, shared contracts, rules and config boundaries are represented according to repository layout guidance.
  - Web cannot call Worker directly.
  - API enqueues long-running work instead of executing scan/classification/document jobs inline.
  - Prototype-only status is visible in developer-facing documentation.
- Technical notes: Follow logical module layout in `repository-and-module-layout.md`; no source code is created by this planning story.
- Security/privacy constraints: No boundary may allow raw source, provider tokens or secrets to cross into Web or audit logs.
- Evidence/audit expectations: Future implementation must audit boundary-critical actions and job creation.
- Dependencies: None.
- Traceability references: FR-053, NFR-018, `docs/implementation/repository-and-module-layout.md`.
- Explicit non-goals: Production IaC, CI/CD deployment, service extraction.
- Prototype-only limitation: Establishes controlled prototype structure only.

#### STORY-01-02 Shared Prototype Status and Guardrail Vocabulary

- Epic ID: EPIC-01
- User story: As a product owner, I want prototype status constants and blocked-state labels so users and developers do not confuse prototype output with validated compliance output.
- Business value: Prevents false confidence while enabling controlled prototype work.
- Acceptance criteria:
  - Status vocabulary includes `IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE`, `CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED` and prototype-only blocked states.
  - UI/API copy distinguishes prototype shell output from final legal/compliance output.
  - Risk/classification workflow labels include blocked reasons when evidence, VerifiedProfile or citation prerequisites are missing.
- Technical notes: Reuse state-machine terminology where possible.
- Security/privacy constraints: No status message may reveal raw source, prompt or secret content.
- Evidence/audit expectations: Future implementation records status transitions as audit metadata.
- Dependencies: STORY-01-01.
- Traceability references: FR-035, FR-047, FR-051, BR-040, BR-049, `docs/specs/state-machine.md`.
- Explicit non-goals: Validation pass/fail results, production readiness flags.
- Prototype-only limitation: Labels do not imply validated release readiness.

#### STORY-01-03 Prototype Configuration and Environment Boundary

- Epic ID: EPIC-01
- User story: As an engineer, I want prototype configuration categories defined so provider choices and secrets remain configurable and non-hardcoded.
- Business value: Enables local prototype implementation without prematurely choosing production vendors.
- Acceptance criteria:
  - Config categories exist for database, queue, OAuth/OIDC, GitHub App, scanner ruleset, LLM Gateway, legal corpus, object storage and observability.
  - No real secret value appears in config examples.
  - Configuration distinguishes local prototype from production.
- Technical notes: Use provider-neutral configuration contracts.
- Security/privacy constraints: Secrets must be reference-only and never logged.
- Evidence/audit expectations: Future implementation audits relevant config-dependent auth/GitHub/LLM failures.
- Dependencies: STORY-01-01.
- Traceability references: NFR-012, NFR-013, `docs/implementation/configuration-secrets-environments.md`.
- Explicit non-goals: Production secret manager integration.
- Prototype-only limitation: Local/dev configuration only.

### EPIC-02 Identity, OAuth/OIDC, and Manager Authorization

| Field | Detail |
|---|---|
| Epic ID | EPIC-02 |
| Title | Identity, OAuth/OIDC, and Manager Authorization |
| Business objective | Let Manager authenticate into LCSP and exercise all required MVP actions without Developer dependency. |
| Prototype scope | OAuth/OIDC login boundary, TOTP MFA hooks, session lifecycle, Manager super-role authorization and optional future Developer grant model placeholders. |
| Out-of-scope boundary | Enterprise SSO/SAML/SCIM, production identity hardening beyond prototype, Developer-dependent MVP flow. |
| Dependencies | EPIC-01 |
| References | FR-001..FR-017, FR-074..FR-078, BR-086..BR-094, `docs/specs/implementation-contract.md` |
| Validation limitation / risk acceptance | Auth prototype does not certify production security readiness. |
| Definition of done | Manager can sign in, pass session/MFA policy where enabled and perform all MVP-gated actions server-side. |

#### STORY-02-01 OAuth/OIDC Login Boundary

- Epic ID: EPIC-02
- User story: As a Manager, I want to sign in with OAuth/OIDC so LCSP can authenticate my identity without granting repository access.
- Business value: Enables MVP login while preserving GitHub authorization separation.
- Acceptance criteria:
  - OAuth/OIDC login creates only LCSP identity/session state.
  - Callback validation covers state, nonce, issuer, audience, expiry and redirect URI policy.
  - OAuth/OIDC login does not create GitHub repository connection or scan permission.
  - Invalid callback is rejected and audited.
- Technical notes: Implement provider-neutral OAuth/OIDC adapter boundary.
- Security/privacy constraints: Raw provider tokens are not exposed to UI/logs/audit export.
- Evidence/audit expectations: Audit login started/succeeded/failed and callback validation failure.
- Dependencies: STORY-01-03.
- Traceability references: FR-074, FR-075, FR-076, BR-086, BR-087, BR-088, NFR-027, NFR-028.
- Explicit non-goals: SAML, SCIM, enterprise directory federation.
- Prototype-only limitation: Provider configuration remains prototype/local unless later approved.

#### STORY-02-02 Session, MFA Hooks, and Account Safety

- Epic ID: EPIC-02
- User story: As a security reviewer, I want session and MFA hooks present so the prototype preserves LCSP authentication assurance boundaries.
- Business value: Keeps auth prototype aligned with security threat model.
- Acceptance criteria:
  - Session lifecycle supports login, logout and revocation.
  - TOTP MFA challenge is enforced when enabled.
  - MFA setup/reset/disable paths are audit-ready.
  - Failed MFA or invalid session blocks workspace access.
- Technical notes: Use `User`, `UserMfaMethod`, `Session` entities from persistence docs.
- Security/privacy constraints: MFA secret is stored by reference/encrypted form only and never logged plaintext.
- Evidence/audit expectations: Audit MFA setup, challenge success/failure, reset and disable.
- Dependencies: STORY-02-01.
- Traceability references: FR-003..FR-010, BR-003..BR-013, NFR-002..NFR-007.
- Explicit non-goals: SMS OTP.
- Prototype-only limitation: Recovery policy is prototype-level until validated.

#### STORY-02-03 Manager Super-role Authorization

- Epic ID: EPIC-02
- User story: As a Manager, I want all active MVP actions authorized to my role so I can complete the prototype flow without Developer assignment.
- Business value: Preserves the canonical Manager-owned MVP path.
- Acceptance criteria:
  - Manager can create assessment, complete WizardProfile, connect GitHub repo, request scan, view findings, review AIUsageFlow, resolve conflicts, approve VerifiedProfile and request workflow shells.
  - No MVP transition is blocked because Developer is absent.
  - Server-side authorization enforces Manager ownership/scope.
  - Developer grant model is represented only as optional/future scoped delegation.
- Technical notes: Centralize permission checks in API boundary.
- Security/privacy constraints: Authorization decisions must fail closed.
- Evidence/audit expectations: Audit permission denial and critical Manager actions.
- Dependencies: STORY-02-01.
- Traceability references: FR-077, FR-078, BR-089..BR-094, UC-M03-01, UC-M04-08, UC-M06-08.
- Explicit non-goals: Developer final compliance authority.
- Prototype-only limitation: Permission UX can be minimal but must enforce server-side.

### EPIC-03 GitHub App Repository Connection

| Field | Detail |
|---|---|
| Epic ID | EPIC-03 |
| Title | GitHub App Repository Connection |
| Business objective | Allow Manager to connect a repository and select branch/commit for the only active MVP technical evidence path. |
| Prototype scope | GitHub App installation/connection, repository authorization checks, branch/commit selection, repository snapshot metadata. |
| Out-of-scope boundary | Local/CI upload, manual evidence upload, API probing, production GitHub permission certification. |
| Dependencies | EPIC-02 |
| References | FR-025, FR-066, BR-032, BR-077, `docs/implementation/github-app-repository-scan-implementation.md` |
| Validation limitation / risk acceptance | Repository scan prototype remains static-analysis only and does not validate production scanner accuracy. |
| Definition of done | Manager can connect/select repository scope and create a scan-ready snapshot reference without OAuth/GitHub boundary confusion. |

#### STORY-03-01 GitHub App Installation and Repository Connection

- Epic ID: EPIC-03
- User story: As a Manager, I want to connect a GitHub repository through a GitHub App so LCSP can request read-only scan access.
- Business value: Establishes the MVP evidence path.
- Acceptance criteria:
  - GitHub App connection is separate from OAuth/OIDC login.
  - Repository access is limited to selected read-only repository scope.
  - Invalid/missing installation blocks scan requests.
  - Connection metadata persists without raw repository source.
- Technical notes: Persist `GitHubRepositoryConnection` and installation reference metadata.
- Security/privacy constraints: Do not store raw GitHub tokens in UI or audit export.
- Evidence/audit expectations: Audit repository connected/disconnected/access denied.
- Dependencies: STORY-02-03.
- Traceability references: FR-025, BR-032, NFR-014, NFR-022.
- Explicit non-goals: GitHub OAuth as repository authorization.
- Prototype-only limitation: GitHub manifest may be prototype scoped.

#### STORY-03-02 Repository, Branch, and Commit Selection

- Epic ID: EPIC-03
- User story: As a Manager, I want to choose repository, branch and commit so scan evidence is reproducible.
- Business value: Creates traceable evidence provenance.
- Acceptance criteria:
  - Manager can select repository, branch and commit from authorized connection.
  - Selection persists `repository_id`, branch/ref and `commit_sha`.
  - Scan is blocked if commit cannot be resolved or is outside authorized scope.
  - Selected commit appears in future scan job and evidence report metadata.
- Technical notes: Use repository snapshot metadata model.
- Security/privacy constraints: Persist metadata only, not source contents.
- Evidence/audit expectations: Audit repository snapshot selected/changed.
- Dependencies: STORY-03-01.
- Traceability references: FR-066, BR-077, `docs/specs/evidence-report-contract.md`.
- Explicit non-goals: Multi-provider repository support.
- Prototype-only limitation: Selection UX can be minimal.

### EPIC-04 Scan Orchestration and Technical Evidence Foundation

| Field | Detail |
|---|---|
| Epic ID | EPIC-04 |
| Title | Scan Orchestration and Technical Evidence Foundation |
| Business objective | Queue and process repository scan jobs into structured prototype evidence without executing customer code. |
| Prototype scope | Scan job lifecycle, synthetic-fixture-driven scanner prototype, TechnicalEvidenceReport, schema/privacy/quality gate shells, TechnicalProfile persistence. |
| Out-of-scope boundary | Production-grade parser accuracy, A2-b2 empirical scanner acceptance, unrestricted global data-flow analysis. |
| Dependencies | EPIC-03 |
| References | FR-031..FR-035, FR-058..FR-062, FR-066, `docs/specs/static-analysis-scanner-contract.md` |
| Validation limitation / risk acceptance | Synthetic fixture-driven scanner prototype does not claim runtime scanner accuracy. |
| Definition of done | Scan job can produce structured evidence/gate states from approved synthetic fixtures and block downstream workflow when invalid/insufficient. |

#### STORY-04-01 Scan Job Lifecycle and Idempotency

- Epic ID: EPIC-04
- User story: As a Manager, I want scan requests to run asynchronously so the API remains responsive and scan progress is trackable.
- Business value: Enables repository evidence workflow without blocking user requests.
- Acceptance criteria:
  - API creates `RepositoryScanJob` only for valid Manager-owned repo snapshot.
  - Queue job envelope includes assessment, repository, commit, scanner version and ruleset version refs.
  - Duplicate scan requests use idempotency rules.
  - Progress states expose requested, started, completed, failed and blocked.
- Technical notes: API enqueues; Worker consumes; Orchestrator controls long-running work.
- Security/privacy constraints: Job payload contains refs/hashes, not raw source.
- Evidence/audit expectations: Audit scan requested/started/completed/failed.
- Dependencies: STORY-03-02.
- Traceability references: FR-066, FR-053, BR-077, `docs/implementation/queue-jobs-retry-idempotency.md`.
- Explicit non-goals: Inline scan execution in API.
- Prototype-only limitation: Queue topology can be local/prototype.

#### STORY-04-02 Synthetic Fixture-driven Scanner Prototype

- Epic ID: EPIC-04
- User story: As a QA reviewer, I want the scanner prototype to consume approved synthetic fixtures so A2-b1 mapping-design validation can exercise expected evidence shapes.
- Business value: Supports controlled prototype without claiming production scanner accuracy.
- Acceptance criteria:
  - Scanner prototype can emit TechnicalFinding and graph-path metadata from approved A2-b1 fixture specs.
  - Findings include scanner/ruleset version, confidence and evidence refs.
  - Dynamic/unsupported fixtures emit coverage limitations or unsupported flow.
  - Provider-only fixture cannot emit automated/high-impact decision finding.
- Technical notes: Fixture-driven output may simulate scanner signals; it must not be represented as runtime scanner accuracy.
- Security/privacy constraints: Fixtures are synthetic and contain no customer source/secrets.
- Evidence/audit expectations: Evidence report includes fixture id/hash and generation metadata.
- Dependencies: STORY-04-01.
- Traceability references: FR-069..FR-071, BR-080..BR-082, `docs/validation/fixtures/specs/`.
- Explicit non-goals: Parser correctness, AST extraction accuracy, empirical false-positive/negative rates.
- Prototype-only limitation: Pre-implementation mapping-design evidence only.

#### STORY-04-03 TechnicalEvidenceReport Contract Persistence

- Epic ID: EPIC-04
- User story: As a compliance workflow operator, I want scan outputs persisted as TechnicalEvidenceReport metadata so downstream gates can operate on traceable evidence.
- Business value: Creates the evidence basis for TechnicalProfile and AIUsageFlow.
- Acceptance criteria:
  - TechnicalEvidenceReport stores report id, source type, provenance, report hash, findings and coverage limits.
  - Source type is `GITHUB_REPOSITORY_SCAN`.
  - Raw source/full AST bodies/full prompts/secrets are not persisted.
  - Evidence report status supports rejected, insufficient and ready.
- Technical notes: Use normalized metadata + JSON evidence payloads as defined by evidence contract.
- Security/privacy constraints: Redaction before persistence.
- Evidence/audit expectations: Audit report created/accepted/rejected and report hash.
- Dependencies: STORY-04-02.
- Traceability references: FR-031, FR-032, FR-056, `docs/specs/evidence-report-contract.md`.
- Explicit non-goals: Manual evidence JSON upload.
- Prototype-only limitation: Persistence schema can evolve after validation.

#### STORY-04-04 Evidence Gates and TechnicalProfile Builder

- Epic ID: EPIC-04
- User story: As a Manager, I want invalid or insufficient evidence to block classification so LCSP does not overclaim.
- Business value: Protects evidence-gated classification.
- Acceptance criteria:
  - Schema Gate rejects missing/invalid required report fields.
  - Privacy Gate rejects raw source/full prompt/secret policy violations.
  - Quality Gate marks evidence insufficient when critical evidence is missing.
  - TechnicalProfile is built only from accepted evidence.
- Technical notes: Gate results are deterministic and auditable.
- Security/privacy constraints: Gate reasons must not expose raw source or secret values.
- Evidence/audit expectations: Audit schema/privacy/quality gate result and reason code.
- Dependencies: STORY-04-03.
- Traceability references: FR-031..FR-035, BR-036..BR-040, NFR-017, NFR-019.
- Explicit non-goals: Attestation replacing technical evidence.
- Prototype-only limitation: Thresholds may change after validation.

### EPIC-05 AIUsageFlow and Technical Profile Construction

| Field | Detail |
|---|---|
| Epic ID | EPIC-05 |
| Title | AIUsageFlow and Technical Profile Construction |
| Business objective | Convert accepted technical evidence into claim-level usage-flow facts that legal matching can use without provider-only inference. |
| Prototype scope | TechnicalProfile to AIUsageFlow, claim evidence refs, uncertainty handling, domain/action/review signal mapping. |
| Out-of-scope boundary | Final legal classification, runtime scanner accuracy, unsupported whole-repo data-flow claims. |
| Dependencies | EPIC-04 |
| References | FR-069..FR-073, BR-080..BR-085, `docs/specs/ai-usage-flow-analysis-spec.md` |
| Validation limitation / risk acceptance | A2-b1 validates mapping design only; A2-b2 remains post-implementation. |
| Definition of done | AIUsageFlow claims are evidence-backed, uncertainty-aware and never selected from provider/model presence alone. |

#### STORY-05-01 AIUsageFlow Claim Model

- Epic ID: EPIC-05
- User story: As a compliance reviewer, I want AIUsageFlow claims to carry values, confidence, evidence refs and source type so legal matching has traceable inputs.
- Business value: Bridges technical evidence and legal rule matching safely.
- Acceptance criteria:
  - AIUsageFlow includes business_process, ai_purpose, input/output types, downstream_action, affected_subjects, human_review, automation_level and harm categories.
  - Every material claim has `value`, `confidence`, `evidence_refs`, `source_type` and uncertainty reason where applicable.
  - Claim without evidence refs is ineligible for legal rule matching.
  - Provider/model/framework presence alone cannot populate high-impact purpose/action claims.
- Technical notes: Follow claim-level model from static scanner and AIUsageFlow specs.
- Security/privacy constraints: Claims contain metadata and evidence refs, not raw source.
- Evidence/audit expectations: Audit AIUsageFlow generated/unclear and claim eligibility.
- Dependencies: STORY-04-04.
- Traceability references: FR-070, FR-073, BR-081, BR-084, `docs/specs/ai-usage-flow-analysis-spec.md`.
- Explicit non-goals: Legal conclusion generation.
- Prototype-only limitation: Confidence thresholds may be tuned after A2-b validation.

#### STORY-05-02 Uncertainty and Abstention Handling

- Epic ID: EPIC-05
- User story: As a Manager, I want unclear AI usage purpose or downstream action to be marked explicitly so the system blocks unsupported classification.
- Business value: Prevents false certainty.
- Acceptance criteria:
  - Dynamic prompt/runtime dependency emits unknown/unclear or coverage limitation.
  - Generated/minified/unsupported source emits coverage limitation.
  - Provider SDK-only fixture does not trigger high-impact inference.
  - Unknown critical usage fields block/degrade final classification or route to Manager clarification.
- Technical notes: Use `SCAN_COVERAGE_LIMITATION`, `UNSUPPORTED_DYNAMIC_FLOW` and uncertainty reasons.
- Security/privacy constraints: LLM cannot be given raw source/full prompts to resolve uncertainty.
- Evidence/audit expectations: Audit uncertainty state and blocked reason.
- Dependencies: STORY-05-01.
- Traceability references: FR-071, BR-082, NFR-026, A2B-F-07, A2B-F-08, A2B-F-09.
- Explicit non-goals: Guessing from variable names alone.
- Prototype-only limitation: Does not validate runtime coverage accuracy.

#### STORY-05-03 Human Review and Automation Level Mapping

- Epic ID: EPIC-05
- User story: As a compliance reviewer, I want human review and automation level represented carefully so automated decisions are not over- or under-claimed.
- Business value: Supports correct conflict and legal eligibility behavior.
- Acceptance criteria:
  - Human review states support present, absent with bounded-path evidence and unclear.
  - Fully automated decision requires AI output, decision rule, state-changing action and no evidenced review step.
  - HR ranking remains distinct from automated hiring decision unless downstream automation is proven.
  - Human-reviewed loan maps to decision_support or semi_automated as supported by evidence.
- Technical notes: Use scanner signal taxonomy and A2-b1 fixture expectations.
- Security/privacy constraints: No raw source snippets in findings review.
- Evidence/audit expectations: Audit human-review uncertainty and automation-level claim refs.
- Dependencies: STORY-05-01.
- Traceability references: FR-069, FR-070, BR-080, BR-081, A2B-F-04, A2B-F-05, A2B-F-06.
- Explicit non-goals: Formal legal classification.
- Prototype-only limitation: Mapping design only.

### EPIC-06 Reconciliation, Conflict Resolution, and Auditability

| Field | Detail |
|---|---|
| Epic ID | EPIC-06 |
| Title | Reconciliation, Conflict Resolution, and Auditability |
| Business objective | Ensure WizardProfile, TechnicalProfile and AIUsageFlow converge into VerifiedProfile only when conflicts are resolved by Manager. |
| Prototype scope | Reconciliation, conflict records, Manager-only conflict task, VerifiedProfile shell, immutable audit trail. |
| Out-of-scope boundary | Developer final resolution authority, silent scanner evidence overwrite, classification before VerifiedProfile. |
| Dependencies | EPIC-05 |
| References | FR-036..FR-042, FR-067, BR-041..BR-048, `docs/specs/reconciliation-policy.md` |
| Validation limitation / risk acceptance | A3 remains incomplete until real governance evidence is collected. |
| Definition of done | Unresolved conflict blocks classification; Manager resolution is auditable and cannot erase technical evidence. |

#### STORY-06-01 Reconciliation Engine Shell

- Epic ID: EPIC-06
- User story: As a Manager, I want LCSP to compare my WizardProfile with technical and usage-flow evidence so conflicts are detected before classification.
- Business value: Protects VerifiedProfile integrity.
- Acceptance criteria:
  - Reconciliation compares WizardProfile, TechnicalProfile and AIUsageFlow.
  - Result is `NO_CONFLICT_FOUND` or `CONFLICT_FOUND`.
  - Conflict creates a Manager task and keeps classification locked.
  - No conflict allows VerifiedProfile candidate creation.
- Technical notes: Binary MVP conflict routing; scores can be informational only.
- Security/privacy constraints: Conflict views show evidence refs, not raw source.
- Evidence/audit expectations: Audit reconciliation started, conflict/no-conflict, conflict record.
- Dependencies: STORY-05-03.
- Traceability references: FR-036, FR-038, BR-041, BR-042.
- Explicit non-goals: Severity-based workflow routing.
- Prototype-only limitation: Conflict rules may be refined after A3 validation.

#### STORY-06-02 Manager Conflict Resolution Workspace

- Epic ID: EPIC-06
- User story: As a Manager, I want to resolve conflicts with evidence context so I remain the final MVP resolver.
- Business value: Preserves Manager-owned MVP path.
- Acceptance criteria:
  - Manager can review WizardProfile, TechnicalProfile, AIUsageFlow and evidence refs.
  - Manager can confirm, update declaration or request rescan/correction.
  - Manager cannot silently delete or overwrite scanner evidence.
  - Developer absence never blocks conflict completion.
- Technical notes: Store Manager resolution separately from original scanner facts.
- Security/privacy constraints: No raw source/secret in conflict record.
- Evidence/audit expectations: Audit resolution action, previous values, new values/ref and actor.
- Dependencies: STORY-06-01.
- Traceability references: FR-039, FR-040, FR-077, BR-042..BR-047, BR-089.
- Explicit non-goals: Developer final resolver.
- Prototype-only limitation: Optional Developer clarification may be placeholder only.

#### STORY-06-03 VerifiedProfile Builder and Approval Gate

- Epic ID: EPIC-06
- User story: As a Manager, I want VerifiedProfile created only after gates pass and conflicts are resolved so classification has a trusted input.
- Business value: Enforces the classification prerequisite.
- Acceptance criteria:
  - VerifiedProfile candidate requires WizardProfile, accepted TechnicalEvidenceReport, TechnicalProfile, AIUsageFlow and no unresolved conflict.
  - Manager approval is required before `READY_FOR_CLASSIFICATION`.
  - Any new conflict invalidates or blocks approval.
  - Classification cannot run before approved VerifiedProfile.
- Technical notes: Preserve source refs and resolution refs in VerifiedProfile.
- Security/privacy constraints: VerifiedProfile stores refs and structured claims, not raw source.
- Evidence/audit expectations: Audit VerifiedProfile created/approved/blocked.
- Dependencies: STORY-06-02.
- Traceability references: FR-042, FR-067, BR-045, BR-078.
- Explicit non-goals: Wizard-only classification.
- Prototype-only limitation: Versioning can be minimal but traceable.

#### STORY-06-04 Immutable Audit Trail Foundation

- Epic ID: EPIC-06
- User story: As an auditor, I want critical workflow transitions recorded so the prototype has traceability for evidence, conflicts and outputs.
- Business value: Supports later validation and governance review.
- Acceptance criteria:
  - Audit events include actor, action, target, timestamp and safe metadata.
  - Critical transitions include auth, GitHub connection, scan, evidence gates, AIUsageFlow, reconciliation, conflict resolution, VerifiedProfile, legal retrieval, classification shell and document shell.
  - Audit records exclude raw source, full prompt, secrets and raw provider tokens.
  - Critical audit failure fails closed or records explicit recovery state.
- Technical notes: Append-oriented audit model.
- Security/privacy constraints: Redaction enforced before audit write.
- Evidence/audit expectations: This story defines audit expectations for all later stories.
- Dependencies: STORY-01-02.
- Traceability references: FR-053..FR-057, BR-067..BR-070, NFR-018.
- Explicit non-goals: Immutable production log infrastructure.
- Prototype-only limitation: Prototype audit persistence may be DB-backed.

### EPIC-07 Legal Corpus and Citation Traceability Foundation

| Field | Detail |
|---|---|
| Epic ID | EPIC-07 |
| Title | Legal Corpus and Citation Traceability Foundation |
| Business objective | Create a legal corpus and citation foundation so classification shells can require traceability without claiming formal legal reliability. |
| Prototype scope | Corpus version metadata, legal document/rule/citation records, retrieval boundary, citation guardrail shell. |
| Out-of-scope boundary | Formal legal validation, independent legal opinion, compliance certification, complete corpus reliability. |
| Dependencies | EPIC-06 |
| References | FR-043..FR-046, FR-073, BR-049..BR-051, `docs/specs/legal-rule-citation-contract.md` |
| Validation limitation / risk acceptance | A2 formal legal reliability remains not approved; A2 internal review remains limited. |
| Definition of done | Legal retrieval foundation can return versioned rule/citation metadata and block when citations are missing. |

#### STORY-07-01 Legal Corpus Version and Source Metadata

- Epic ID: EPIC-07
- User story: As a legal reviewer, I want legal corpus documents versioned with source metadata so prototype retrieval can cite pinned sources.
- Business value: Enables citation traceability.
- Acceptance criteria:
  - Legal corpus version record exists.
  - Legal document metadata includes title, identifier, issuer/source, publication/effective date if available and content hash when present.
  - Corpus source status distinguishes draft/internal from validated.
  - No formal legal reliability claim is made.
- Technical notes: Use `LegalDocumentVersion` and `LegalRule` metadata contracts.
- Security/privacy constraints: Corpus artifacts are separate from customer evidence.
- Evidence/audit expectations: Audit corpus version imported/updated.
- Dependencies: STORY-06-04.
- Traceability references: FR-043, FR-056, `docs/specs/legal-rule-citation-contract.md`.
- Explicit non-goals: Legal corpus completeness certification.
- Prototype-only limitation: Internal corpus foundation only.

#### STORY-07-02 Legal Rule and Citation Retrieval Boundary

- Epic ID: EPIC-07
- User story: As the classification workflow, I want retrieval to use VerifiedProfile and AIUsageFlow fields so legal matching is based on usage context.
- Business value: Prevents provider-only legal matching.
- Acceptance criteria:
  - Retrieval input requires VerifiedProfile, AIUsageFlow and corpus version.
  - Rule matching considers business process, purpose, input/output, downstream action, affected subjects, human review, automation level and harm categories.
  - Provider/model/framework presence alone cannot select legal rule family.
  - Retrieval output includes rule_id, source, citation and corpus version where available.
- Technical notes: Use RAG/vector store boundary as retrieval support, not final legal authority.
- Security/privacy constraints: LLM/RAG input excludes raw source and secrets.
- Evidence/audit expectations: Audit retrieval query refs and returned/missing citations.
- Dependencies: STORY-07-01, STORY-06-03.
- Traceability references: FR-043, FR-073, BR-084.
- Explicit non-goals: Final legal advice.
- Prototype-only limitation: Retrieval quality remains subject to A2 validation.

#### STORY-07-03 Citation Guardrail Shell

- Epic ID: EPIC-07
- User story: As a Manager, I want legal output blocked or degraded when citations are missing so reports do not invent legal basis.
- Business value: Prevents unsupported compliance claims.
- Acceptance criteria:
  - Critical legal conclusion requires rule_id, source, citation and corpus version.
  - Missing required citation blocks or degrades classification/gap/document output.
  - LLM cannot invent citations outside approved corpus.
  - Blocked reason is visible to Manager.
- Technical notes: Deterministic guardrail runs after retrieval and before output shell.
- Security/privacy constraints: Citation guardrail logs no raw prompts.
- Evidence/audit expectations: Audit citation validation passed/failed.
- Dependencies: STORY-07-02.
- Traceability references: FR-046, BR-051, NFR-020.
- Explicit non-goals: Formal legal reliability validation.
- Prototype-only limitation: Guardrail shell validates traceability, not legal correctness.

### EPIC-08 Risk Classification, Gap Analysis, and Document Workflow Shells

| Field | Detail |
|---|---|
| Epic ID | EPIC-08 |
| Title | Risk Classification, Gap Analysis, and Document Workflow Shells |
| Business objective | Demonstrate end-to-end controlled workflow shells that block when evidence, profile or citation prerequisites are missing. |
| Prototype scope | Classification shell, gap analysis shell, document-generation shell, readiness-only export. |
| Out-of-scope boundary | Final compliance certification, formal legal conclusions, production report claims. |
| Dependencies | EPIC-07 |
| References | FR-044..FR-052, FR-068, BR-049..BR-066 |
| Validation limitation / risk acceptance | Outputs are prototype workflow artifacts, not validated compliance deliverables. |
| Definition of done | Shells enforce VerifiedProfile/citation/output guardrails and expose blocked/degraded states. |

#### STORY-08-01 Risk Classification Workflow Shell

- Epic ID: EPIC-08
- User story: As a Manager, I want classification to run only when prerequisites are satisfied so prototype results cannot bypass gates.
- Business value: Preserves evidence-first product promise.
- Acceptance criteria:
  - Classification shell requires approved VerifiedProfile.
  - Classification shell requires legal retrieval/citation inputs.
  - Missing evidence, unresolved conflict, unclear critical usage or missing citation blocks/degrades output.
  - Provider/model/framework presence alone cannot produce risk level.
- Technical notes: Shell may return blocked/degraded status without final scoring.
- Security/privacy constraints: LLM use only via LLM Gateway with sanitized metadata.
- Evidence/audit expectations: Audit classification requested/completed/blocked/degraded.
- Dependencies: STORY-07-03.
- Traceability references: FR-044, FR-047, BR-049, BR-084.
- Explicit non-goals: Formal risk classification accuracy claim.
- Prototype-only limitation: Demonstrates workflow gating only.

#### STORY-08-02 Gap Analysis Workflow Shell

- Epic ID: EPIC-08
- User story: As a Manager, I want gap analysis only after valid classification so gaps are not generated from Wizard-only data.
- Business value: Prevents misleading compliance guidance.
- Acceptance criteria:
  - Gap analysis shell requires valid or explicitly degraded classification basis.
  - Gap output includes evidence/citation refs when produced.
  - Invalid classification basis blocks gap analysis.
  - Manager sees blocked reason.
- Technical notes: Gap shell can use deterministic placeholder obligations until corpus is validated.
- Security/privacy constraints: No raw source or full prompt in generated gap data.
- Evidence/audit expectations: Audit gap analysis requested/completed/blocked.
- Dependencies: STORY-08-01.
- Traceability references: FR-048, FR-068, BR-062, BR-079.
- Explicit non-goals: Complete compliance gap accuracy.
- Prototype-only limitation: Workflow shell only.

#### STORY-08-03 Document Generation Workflow Shell

- Epic ID: EPIC-08
- User story: As a Manager, I want document generation to respect final gates so LCSP does not create unsupported final reports.
- Business value: Keeps prototype output aligned to legal-output guardrails.
- Acceptance criteria:
  - Final document generation requires VerifiedProfile, valid/degraded classification, gap analysis and citation guardrail pass.
  - Unresolved conflict blocks final document.
  - Missing citation blocks or degrades legal conclusion.
  - Generated artifact metadata includes version, evidence refs, citation refs and limitation warnings.
- Technical notes: Document shell can produce prototype watermarked output metadata.
- Security/privacy constraints: No raw source/full prompt/secrets in document or object storage.
- Evidence/audit expectations: Audit document requested/generated/blocked.
- Dependencies: STORY-08-02.
- Traceability references: FR-049, FR-051, FR-052, BR-063..BR-066.
- Explicit non-goals: Production compliance report.
- Prototype-only limitation: Prototype document shell only.

#### STORY-08-04 Readiness-only Export Shell

- Epic ID: EPIC-08
- User story: As a Manager, I want readiness-only export when evidence is missing so I can see preparation gaps without a risk label.
- Business value: Supports early discovery without false risk classification.
- Acceptance criteria:
  - Readiness-only export is allowed before technical evidence.
  - Export contains no HIGH/MEDIUM/LOW or final risk label.
  - Export explains missing evidence and required next actions.
  - Export is clearly marked prototype/readiness-only.
- Technical notes: Separate output type from compliance report.
- Security/privacy constraints: No raw source or secrets.
- Evidence/audit expectations: Audit readiness export generated.
- Dependencies: STORY-01-02.
- Traceability references: FR-022, FR-023, FR-050, BR-030, BR-065.
- Explicit non-goals: Compliance conclusion.
- Prototype-only limitation: Readiness guidance only.

### EPIC-09 Security, Privacy, and Prototype Observability

| Field | Detail |
|---|---|
| Epic ID | EPIC-09 |
| Title | Security, Privacy, and Prototype Observability |
| Business objective | Make prototype behavior reviewable and fail-closed around source privacy, secret redaction, LLM boundary and operational errors. |
| Prototype scope | Secret redaction, no raw-source-to-LLM checks, retention boundaries, structured logs/metrics/status, manual verification support. |
| Out-of-scope boundary | Production security certification, penetration testing, production observability dashboards. |
| Dependencies | EPIC-01 through EPIC-08 |
| References | FR-058..FR-062, NFR-012..NFR-018, `docs/security/source-code-privacy-policy.md`, `docs/security/threat-model.md` |
| Validation limitation / risk acceptance | Prototype controls support validation and review; they do not certify production security. |
| Definition of done | Prototype exposes safe status, audit and failure evidence while preventing raw source/secret/LLM boundary violations. |

#### STORY-09-01 Secret Redaction and Evidence Sanitization

- Epic ID: EPIC-09
- User story: As a security reviewer, I want secret-like values redacted before persistence so evidence and audit artifacts do not leak credentials.
- Business value: Protects customers and supports safe validation.
- Acceptance criteria:
  - Scanner/evidence outputs pass through redaction before persistence.
  - Redacted findings preserve evidence refs and hash metadata.
  - Secret-like values are not stored in TechnicalFinding, audit or generated documents.
  - Redaction failure blocks evidence acceptance.
- Technical notes: Deterministic redaction rules precede persistence.
- Security/privacy constraints: No secrets in logs, DB, object storage, LLM input.
- Evidence/audit expectations: Audit redaction failure and evidence rejection.
- Dependencies: STORY-04-03.
- Traceability references: FR-059, BR-059, NFR-013.
- Explicit non-goals: Production DLP certification.
- Prototype-only limitation: Initial redaction rules only.

#### STORY-09-02 No Raw Source to LLM Boundary

- Epic ID: EPIC-09
- User story: As a security reviewer, I want all LLM calls to pass only sanitized metadata through the LLM Gateway so source code and prompts remain private.
- Business value: Enforces a core trust boundary.
- Acceptance criteria:
  - LLM Gateway is the only LLM boundary.
  - LLM input contains sanitized metadata, evidence refs, route/service labels and retrieved rule refs only.
  - Raw source, full prompts, secrets and raw AST bodies are rejected.
  - LLM output cannot override deterministic gates.
- Technical notes: Model calls store metadata and output hash, not raw prompt/source.
- Security/privacy constraints: Strict no raw-source/full-prompt/secrets policy.
- Evidence/audit expectations: Audit model run metadata and blocked unsafe input.
- Dependencies: STORY-05-01, STORY-07-02.
- Traceability references: FR-061, BR-057, `docs/implementation/llm-gateway-implementation.md`.
- Explicit non-goals: Direct provider SDK calls from workflow nodes.
- Prototype-only limitation: Provider choice can remain configurable.

#### STORY-09-03 Workspace Cleanup and Retention Boundary

- Epic ID: EPIC-09
- User story: As a security reviewer, I want temporary source workspaces cleaned and retention boundaries enforced so raw source is not retained.
- Business value: Protects source privacy.
- Acceptance criteria:
  - Scanner workspace is temporary and linked to scan job.
  - Cleanup occurs after scan completion/failure.
  - Cleanup failure creates audit/security event and blocks downstream acceptance if privacy risk remains.
  - Persistent stores contain metadata, hashes, graph refs and findings only.
- Technical notes: For synthetic-fixture prototype, workspace behavior can be represented as controlled lifecycle state.
- Security/privacy constraints: No long-term raw source storage.
- Evidence/audit expectations: Audit workspace created/cleanup success/failure.
- Dependencies: STORY-04-01.
- Traceability references: FR-060, FR-062, BR-058, BR-060.
- Explicit non-goals: Production sandbox certification.
- Prototype-only limitation: Prototype cleanup proof may be simulated for synthetic fixtures only.

#### STORY-09-04 Prototype Observability and Manual Verification Support

- Epic ID: EPIC-09
- User story: As a prototype operator, I want workflow status, errors and audit views so manual validation can inspect behavior without reading internals.
- Business value: Supports controlled validation and debugging.
- Acceptance criteria:
  - Workflow status shows assessment, scan, evidence gates, AIUsageFlow, reconciliation, classification, gap and document shell states.
  - Error states include safe reason codes and next action.
  - Basic metrics/log categories exist for scan failures, gate failures, uncertainty, conflicts, missing citations and document blocks.
  - Manual verification can trace user-visible result to audit event and evidence/citation refs.
- Technical notes: Use structured logs/metrics design from observability docs.
- Security/privacy constraints: No raw source, full prompt, secret or raw provider token in telemetry.
- Evidence/audit expectations: Audit and observability records share correlation IDs.
- Dependencies: EPIC-01 through EPIC-08.
- Traceability references: FR-051, FR-053..FR-057, NFR-018.
- Explicit non-goals: Production dashboards or alert rules.
- Prototype-only limitation: Manual verification support only.

## Deferred Work Register

| Deferred Item | Reason |
|---|---|
| Enterprise SSO/SAML/SCIM | Outside approved prototype scope |
| Production CI/CD deployment | Not authorized by owner risk acceptance |
| Production infrastructure scaling | Prototype only |
| A2-b2 empirical scanner acceptance | Requires real scanner prototype and post-implementation acceptance |
| Production-grade scanner accuracy benchmarking | Not allowed in prototype planning |
| Formal legal validation | Not approved |
| Automated production compliance certification | Explicitly blocked |
| Runtime scanner accuracy claims | Explicitly blocked |
