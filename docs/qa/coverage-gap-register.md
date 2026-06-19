# Coverage Gap Register

## Purpose

Register Phase 3.3 traceability and quality-gate gaps for LCSP. A gap is blocking only when it breaks a canonical invariant, prevents verification of a critical workflow gate or makes A1/A2/A2-b/A3 validation invalid.

## Gap Severity

| Severity | Meaning |
| --- | --- |
| Critical | Breaks canonical invariant or makes validation unusable. |
| High | Blocks implementation readiness or release gate until resolved. |
| Medium | Must be resolved before implementation or operational acceptance, but does not block Phase 3 final review. |
| Low | Future or configuration issue with clear owner/timing. |

## Gap Register

| Gap ID | Category | Missing Link | Impact | Severity | Recommended Action | Owner | Required Before | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GAP-3.3-001 | VALIDATION_DEPENDENCY_GAP | A1 results are not present | Wizard usability, locked-state clarity and Manager comprehension remain unvalidated | High | Execute A1 protocol and update PRD/UX/FR/BR/NFR/readiness docs from results | Product/QA | Implementation backlog unblocking | OPEN |
| GAP-3.3-002 | VALIDATION_DEPENDENCY_GAP | A2 legal corpus/rule validation results are not present | Legal classification and citation reliability remain unvalidated | High | Execute A2 protocol and update legal rule/citation, RAG and output guardrail docs | Product/Legal/QA | Implementation backlog unblocking | OPEN |
| GAP-3.3-003 | VALIDATION_DEPENDENCY_GAP | A2-b scanner + AIUsageFlow mapping results are not present | Scanner-derived usage flow may not reliably support legal rule matching | High | Execute A2-b fixture protocol and update scanner/AIUsageFlow/rule mapping docs | Architecture/QA | Implementation backlog unblocking | OPEN |
| GAP-3.3-004 | VALIDATION_DEPENDENCY_GAP | A3 governance/attestation validation results are not present | Manager conflict resolution and future delegation abuse controls remain unvalidated | High | Execute A3 protocol and update RBAC, reconciliation, attestation and audit docs | Product/Security/QA | Implementation backlog unblocking | OPEN |
| GAP-3.3-005 | IMPLEMENTATION_DECISION_GAP | Numeric performance and capacity thresholds are not approved | NFR-GATE-14 can be designed but not passed after implementation without target decisions | Medium | Establish baseline targets after implementation environment shape is known | Product/Architecture/DevOps/QA | Implementation/release validation | OPEN |
| GAP-3.3-006 | IMPLEMENTATION_DECISION_GAP | Accessibility conformance target not approved | NFR-GATE-15 cannot be objectively evaluated after UI implementation | Medium | Approve WCAG 2.1 AA or stricter standard for Manager-facing MVP screens | Product/UX/QA | Implementation | OPEN |
| GAP-3.3-007 | IMPLEMENTATION_DECISION_GAP | Audit immutability mechanism not finalized | NFR-GATE-12 evidence can be planned but not fully assessed | Medium | Decide append-only database, hash chain/export or external immutable log approach | Architecture/Security | Implementation | OPEN |
| GAP-3.3-008 | IMPLEMENTATION_DECISION_GAP | Final evidence/audit retention periods not finalized | Privacy and audit evidence plans require retention policy | Medium | Align retention with source privacy policy and institutional compliance requirements | Product/Security | Implementation | OPEN |
| GAP-3.3-009 | IMPLEMENTATION_DECISION_GAP | Exact OAuth/OIDC provider remains configuration decision | OAuth callback contract is clear, but provider-specific validation config remains unset | Low | Select/configure at least one MVP OAuth/OIDC provider before release | Product/Architecture | Implementation/release configuration | OPEN |
| GAP-3.3-010 | IMPLEMENTATION_DECISION_GAP | LLM provider/model selection remains configuration decision | LLM Gateway contract is provider-neutral; model behavior must still be configured | Low | Select provider/model behind LLM Gateway adapter and validate schema/output behavior | Architecture | Implementation/release configuration | OPEN |
| GAP-3.3-011 | NFR_COVERAGE_GAP | NFR-GATE-14 threshold decision is deferred | Performance gate is measurement-ready, not pass/fail ready | Medium | Keep as design gate now; approve thresholds before implementation/release gate | DevOps/QA | Implementation/release validation | OPEN |
| GAP-3.3-012 | FUTURE_SCOPE_DECISION | Enterprise SSO/SAML/SCIM remains future scope | No impact to MVP OAuth/OIDC traceability | Low | Keep out of MVP quality gate; revisit under enterprise identity scope | Product | Future / Enterprise | ACKNOWLEDGED |
| GAP-4.1.1-001 | VALIDATION_DEPENDENCY_GAP | Validation execution decision approvals are not recorded | A1/A2/A2-b1/A3 cannot collect real evidence until decision-log rows are approved | High | Record owner confirmation in `docs/validation/validation-execution-decision-log.md` | Product/QA | Validation execution | OPEN |
| GAP-4.1.1-002 | VALIDATION_DEPENDENCY_GAP | Evidence storage provider/location/custodian/ACL/retention/deletion are not approved | No validation stream can safely store evidence | High | Approve storage model, custodian, ACL and retention/deletion policy | Product/Security | Validation execution | OPEN |
| GAP-4.1.1-003 | VALIDATION_DEPENDENCY_GAP | A2-b fixture hashes and release approvals are not recorded | A2-b1 fixture validation cannot begin | High | Finalize fixture specification artifacts, generate hashes and move required fixtures to `APPROVED_FOR_VALIDATION` | QA/Architecture | A2-b1 execution | OPEN |
| GAP-4.1.1-004 | VALIDATION_DEPENDENCY_GAP | A2-b2 requires real scanner implementation | Empirical scanner accuracy cannot be validated in documentation-only phase | High | Keep A2-b2 as `POST_IMPLEMENTATION_ACCEPTANCE_GATE` | Architecture/QA | Post-implementation acceptance | ACKNOWLEDGED |

## Phase 4.1.2 Gap Normalization

Phase 4.1.2 reduces several Phase 4.1.1 execution blockers but does not close validation-result gaps or implementation blockers.

| Gap ID | Normalized Status | Rationale |
| --- | --- | --- |
| GAP-4.1.1-001 | PARTIALLY_REDUCED | D-01, D-02, D-04, D-05 and D-06 now have owner-attested approvals; D-03 formal legal validation and D-07 fixture release remain pending. |
| GAP-4.1.1-002 | REDUCED_FOR_RECHECK | Evidence storage has owner-attested GitHub private repository controls; this supports Phase 4.2 recheck but is not an independent ACL audit. |
| GAP-4.1.1-003 | OPEN | D-07 remains pending because fixture approver, finalized fixture cards, reviewer approvals, SHA-256 hashes and `APPROVED_FOR_VALIDATION` release status are not complete. |
| GAP-4.1.1-004 | ACKNOWLEDGED | A2-b2 remains a post-implementation empirical scanner acceptance gate. |

Additional Phase 4.1.2 gaps:

| Gap ID | Category | Missing Link | Impact | Severity | Recommended Action | Owner | Required Before | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GAP-4.1.2-001 | VALIDATION_DEPENDENCY_GAP | Formal legal reviewer qualification and independent legal reliability assurance are not evidenced | A2 cannot be claimed as independent/formal/professional legal reliability validation | High | Treat near-term A2 as `INTERNAL_LEGAL_RULE_REVIEW_ONLY` until qualified legal reviewers and assurance process are approved | Product/Legal | Formal A2 legal reliability execution | OPEN |
| GAP-4.1.2-002 | VALIDATION_DEPENDENCY_GAP | Official corpus source files and content hashes are not present | Corpus integrity is not complete for formal A2 validation | High | Add approved corpus source register, source artifacts and hashes before formal A2 execution | Product/Legal | Formal A2 legal reliability execution | OPEN |
| GAP-4.1.2-003 | VALIDATION_DEPENDENCY_GAP | Fixture approver and finalized hashed fixture cards are missing | A2-b1 fixture-based evidence collection remains blocked | High | Confirm fixture approver, finalize 10 fixture cards, generate SHA-256 hashes and move fixtures to `APPROVED_FOR_VALIDATION` | QA/Architecture | A2-b1 evidence collection | OPEN |

## Category Review

| Category | Blocking Gap Found? | Notes |
| --- | --- | --- |
| FUNCTIONAL_COVERAGE_GAP | No | Critical MVP flows map to TSC-001..TSC-035. |
| SECURITY_COVERAGE_GAP | No critical gap | Security decisions remain for implementation details, not Phase 3 trace. |
| PRIVACY_COVERAGE_GAP | No critical gap | Source/privacy invariants map to TSC-016, TSC-017 and NFR-GATE-05/06. |
| SCANNER_COVERAGE_GAP | Validation gap only | A2-b still required, but fixture coverage is designed. |
| AI_USAGE_FLOW_COVERAGE_GAP | Validation gap only | A2-b still required, but claim-level coverage is designed. |
| LEGAL_CITATION_COVERAGE_GAP | Validation gap only | A2 still required, but citation guardrail trace exists. |
| NFR_COVERAGE_GAP | Non-blocking decision gap | NFR-GATE-14 threshold decision remains before implementation. |
| VALIDATION_DEPENDENCY_GAP | Yes for backlog/implementation | A1/A2/A2-b/A3 are intentionally pending. |
| IMPLEMENTATION_DECISION_GAP | Yes before implementation | Decisions do not block Phase 3 final review. |
| CONTRADICTION_REQUIRES_ARCHITECTURE_AMENDMENT | No | No contradiction found in Phase 3.3 review. |

## Blocking Assessment

No gap blocks Phase 3 final quality checkpoint. The open gaps block implementation backlog unblocking, implementation execution or release validation as stated in the `Required Before` column.
