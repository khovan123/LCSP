# A2 Legal Corpus Validation Execution Pack

## Purpose

Prepare real validation for A2: legal corpus and legal-rule reliability. This pack defines how reviewers will verify that LCSP legal outputs are grounded in versioned rules, citations and reproducible rule mapping.

## Scope

This is preparation only. It does not claim legal corpus validity, run legal review or record validation results.

## Source References

- `docs/product/validation-plan.md`
- `docs/product/validation-execution-plan.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/qa/manual-validation-protocols.md`
- `docs/qa/test-fixture-and-test-data-design.md`

## Legal Reviewer Profile

| Reviewer Role | Criteria | Exclusion Criteria |
| --- | --- | --- |
| Legal / compliance reviewer | Can evaluate legal citation, rule applicability and obligation wording | Sole author of all rules under review |
| Product rule owner | Understands LCSP risk classification intent and corpus scope | Cannot be the only legal reviewer |
| Architecture/QA observer | Verifies traceability and missing-citation behavior | Cannot override legal reviewer decision |

## Corpus Source Acceptance Process

1. Identify legal document source.
2. Record document title, source, jurisdiction/scope, version and effective date if available.
3. Assign `LegalDocumentVersion`.
4. Assign `LegalRule` and `rule_id`.
5. Attach citation text or citation reference.
6. Mark rule as hard-rule or advisory.
7. Record corpus version used for the validation run.
8. Exclude any rule without source/citation from critical final classification.

## Phase 4.1.1 Corpus Versioning Decision

| Decision Item | Selected Value | Status |
| --- | --- | --- |
| Protocol version | A2-LEGAL-CORPUS-VALIDATION-v0.1 | OWNER_CONFIRMED for internal legal-rule review |
| Internal corpus versioning model | `LCSP-LEGAL-CORPUS-v0.1.0` | OWNER_CONFIRMED |
| Actual corpus sources | Not recorded in this phase | PENDING_OWNER_CONFIRMATION |
| Legal reviewer roster | Two independent legal reviewers plus one adjudicator for unresolved disagreement | PENDING_OWNER_CONFIRMATION |
| Sample size | 30 stratified legal retrieval/rule-mapping cases | OWNER_CONFIRMED |

## Phase 4.1.2 Legal Review Scope Normalization

Phase 4.1.2 records owner-provided corpus metadata and approved internal review defaults, while keeping formal legal reliability validation blocked.

| Decision Item | Normalized Value | Status |
| --- | --- | --- |
| Corpus version | `LCSP-LEGAL-CORPUS-v0.1.0` | OWNER_CONFIRMED |
| Sample size | 30 stratified cases | OWNER_CONFIRMED |
| Rule-mapping correctness threshold | >=90% after adjudication | OWNER_CONFIRMED |
| Fabricated citation tolerance | 0 | OWNER_CONFIRMED |
| Material citation mismatch | Validation failure | OWNER_CONFIRMED |
| A2 scope | `INTERNAL_LEGAL_RULE_REVIEW_ONLY` | PENDING_OWNER_CONFIRMATION for formal validation |
| Formal legal reliability validation | `NOT_APPROVED` | PENDING_OWNER_CONFIRMATION |

Reason:

```text
Formal legal-reviewer qualification and independent legal reliability assurance
are not evidenced.
```

Allowed future scope:

```text
Internal legal-rule review only.
```

Not allowed:

```text
Claiming independent, formal, or professional legal reliability validation.
```

### Owner-Provided Corpus Date Metadata

These records are owner-provided corpus metadata only. They are not official corpus source hashes and do not complete corpus integrity approval.

| Document | Identifier | Ban hanh | Hieu luc | Additional Note |
| --- | --- | --- | --- | --- |
| Luat Tri tue nhan tao | 134/2025/QH15 | 10/12/2025 | 01/03/2026 | Owner-provided metadata |
| Luat Cong nghiep cong nghe so | 71/2025/QH15 | 14/06/2025 | 01/01/2026 | Mot so dieu khoan: 01/07/2025 |
| Nghi quyet 57-NQ/TW | 57-NQ/TW | 22/12/2024 | Not provided | Owner-provided metadata |
| Quyet dinh 127/QD-TTg | 127/QD-TTg | 26/01/2021 | Not provided | Owner-provided metadata |

Do not create official corpus hashes or mark corpus integrity complete until source files are actually present and hashed.

Before A2 can start, each corpus source must record:

| Required Corpus Source Field | Status Before Execution |
| --- | --- |
| document title | Required |
| issuer/source reference | Required |
| document identifier | Required |
| publication/effective-date metadata when available | Required when available |
| retrieval date | Required |
| content hash | Required |
| corpus version | Required |
| review approval status | Required |

## Corpus Provenance Checklist

| Check | Required |
| --- | --- |
| Legal source identified | Yes |
| Legal citation/reference present | Yes for critical rules |
| Corpus version pinned | Yes |
| Rule ID stable | Yes |
| Rule family identified | Yes |
| Effective date recorded where available | Yes |
| Reviewer identity/role recorded | Yes |
| Missing citation behavior documented | Yes |

## Legal-Rule Sampling Plan

| Sample | Fixture / Scenario | Expected Review |
| --- | --- | --- |
| A2-S1 Internal assistant | F-RAG-01 + F-SCAN-01/F-SCAN-02 where applicable | Low-impact/non-decision or transparency rules only when cited |
| A2-S2 AI-assisted decision | F-RAG-01 + decision-support fixture | Decision-impact, oversight and accountability rules |
| A2-S3 High-impact/sensitive data | F-RAG-01 + F-SCAN-03/F-SCAN-04 | Financial/employment/high-impact/sensitive-data rule families |
| A2-S4 Missing citation | F-RAG-02 | Block/degrade behavior |
| A2-S5 Ambiguous mapping | F-RAG-03 | Reviewer disagreement and clarification behavior |

## Citation Verification Procedure

1. For each expected classification reason, identify selected `rule_id`.
2. Trace `rule_id` to `LegalRule`.
3. Trace `LegalRule` to `LegalCitation`.
4. Trace `LegalCitation` to `LegalDocumentVersion`.
5. Confirm citation supports the rule condition.
6. Confirm output does not include unsupported LLM-created legal conclusion.
7. Mark mismatch as fail or inconclusive according to rubric.

## Disagreement Resolution

| Disagreement Type | Resolution |
| --- | --- |
| Citation supports rule partially | Mark PARTIAL or INCONCLUSIVE; reviewer note required |
| Rule family disagreement | Require second legal/domain reviewer |
| Missing legal source | Fail critical rule or block/degrade output |
| Ambiguous legal mapping | Mark ambiguous; final classification cannot overclaim |

## False Citation / Missing Citation / Wrong-Rule Handling

| Case | Expected Result |
| --- | --- |
| False citation | FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT for critical output |
| Missing critical citation | Classification blocked or degraded |
| Wrong rule family | Fail or rerun after rule mapping correction |
| Advisory rule used as hard-rule | Fail unless corrected and disclosed |

## Acceptance Thresholds

| Threshold | Required |
| --- | --- |
| Critical rules have citation | 100% |
| Risk output traces to rule_id | 100% for scenario validation |
| Rule_id traces to legal document/version | 100% |
| Missing critical citation | 0 final classifications allowed |
| Unsupported LLM legal conclusion | 0 allowed |
| Reviewer agreement | Required for formal legal reliability validation; internal review may record reviewer disagreement but cannot claim formal assurance |

### Phase 4.1.1 Proposed Decision Rules

These rules are owner-confirmed for internal legal-rule review. They do not authorize independent/formal/professional legal reliability validation until reviewer qualifications, corpus source files and corpus hashes are recorded.

| Rule | Proposed Default | Status |
| --- | --- | --- |
| Fabricated citation | No fabricated citation is acceptable | OWNER_CONFIRMED |
| Citation traceability | All citations used in a final legal conclusion must be traceable to a pinned corpus version | OWNER_CONFIRMED |
| Material citation mismatch | Material citation mismatch is a failure | OWNER_CONFIRMED |
| Rule-mapping correctness | At least 90% of sampled rule mappings must be judged correct by final adjudicated result | OWNER_CONFIRMED |
| Reviewer disagreements | Original reviewer disagreements must remain recorded | OWNER_CONFIRMED |

## Evidence Capture Template

| Field | Capture |
| --- | --- |
| validation_run_id | Stable run ID |
| sample_id | A2-S1..A2-S5 |
| corpus_version | Version/ref |
| rule_id | Rule ID |
| citation_ref | Citation/version |
| expected_rule_family | Expected family |
| observed_rule_family | Observed family |
| reviewer_decision | pass/fail/inconclusive |
| disagreement_note | Required if reviewers disagree |
| required_update | PRD/spec/architecture/ADR/QA update |

## Required Architecture / Spec Updates After Result

| Result Pattern | Required Updates |
| --- | --- |
| Rule schema insufficient | Update legal-rule citation contract and data model docs |
| Rule matching ambiguous | Update AI usage rule mapping spec and retrieval query design |
| Missing citation behavior weak | Update citation guardrail and document generation requirements |
| LLM overclaims legal conclusion | Update LLM Gateway and legal RAG guardrail docs |

## Privacy Rules

- Use public/approved legal corpus references only.
- Use synthetic assessment profiles.
- Do not include real customer legal documents unless separately approved.
- Do not record personal data in reviewer notes.
