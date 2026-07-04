# Legal Rule Catalog Specification

## Status

AUTHORITATIVE — Governance/Entity Frame Only (Phase 5.2M)

Introduced 2026-07-05 to close a governance asymmetry: the legal corpus (raw law text used for RAG citation) has a full ingestion/approval/versioning spec (`docs/specs/legal-corpus-source-spec.md`), but the rule catalog that actually determines risk-tier applicability (`ruleId`, `ruleFamily`, `requiredFacts`, `blockingFacts`, `unknownFactPolicy` — the "Legal Rule" input in `docs/specs/legal-matching-domain-spec.md`) had no equivalent governance definition. This spec defines the entity, authoring, versioning, and approval process for that rule catalog. It does not contain legal rule content.

## Purpose

Defines the `LegalRule` entity, its relationship to the legal corpus, the authoring/review/approval lifecycle, and versioning policy. Design/spec contract, not source code, and not a source of actual compliance rules.

## Non-Claims

- This spec does not define, approve, or imply any specific `LegalRule` content.
- No rule in this catalog is valid, binding, or production-usable until it passes the Rule Catalog Approval Process below.
- This spec does not constitute legal certification or legal advice.
- The illustrative AIUsageFlow-field-to-Điều mapping discussed during Phase 5.2M research (see project memory) is a starting point for authoring, not approved rule content.

## Relationship to the Legal Corpus

The legal corpus (`docs/specs/legal-corpus-source-spec.md`, `LegalCorpusVersion`, `LegalDocumentChunk`) and the rule catalog defined here are **separate artifacts with a one-directional citation dependency**:

```text
LegalCorpusVersion (APPROVED)
  provides citation targets (document_id::art-N::cl-M::pt-X)
       |
       v  (validated against, never generated from)
LegalRule.citationLocatorRefs
```

- A `LegalRule` is never auto-extracted from `LegalDocumentChunk` text by an LLM, embedding similarity, or any automated rule-mining process.
- A `LegalRule` is hand-authored by an Internal Legal Operator who reads approved corpus text and writes applicability logic (`requiredFacts`/`optionalFacts`/`blockingFacts`) referencing `VerifiedProfile.mergedProfile` fields, plus one or more `citationLocatorRefs`.
- At rule approval time, every `citationLocatorRef` must resolve to a chunk inside an `APPROVED` `LegalCorpusVersion`. A rule with an unresolvable locator is rejected — it cannot enter an `APPROVED` `LegalRuleCatalogVersion`.
- The corpus can change (new `LegalCorpusVersion`) without automatically changing the rule catalog, and vice versa. `LegalRuleMatch` pins both a `legalCorpusVersionId` and a `legalRuleCatalogVersionId` so results remain reproducible if either changes independently.

## Rule Identity Schema

| Field | Description | Example |
|---|---|---|
| `legalRuleId` | Stable rule identifier | `AI-HIGH-IMPACT-FINANCIAL-AUTOMATED-DECISION` |
| `ruleFamily` | Classification family | `AI use`, `data`, `oversight`, `documentation` |
| `legalRuleCatalogVersionId` | Owning catalog version | `uuid` |
| `status` | Rule lifecycle state | `DRAFT`, `APPROVED`, `DEPRECATED` |
| `authoredBy` | Internal Legal Operator identity | `actor ref` |

## Rule Content Schema

| Field | Description |
|---|---|
| `requiredFacts` | `VerifiedProfile.mergedProfile` facts that must be present, with evidence refs, for the rule to apply |
| `optionalFacts` | Facts that strengthen confidence without being required |
| `blockingFacts` | Facts whose presence makes the rule inapplicable |
| `unknownFactPolicy` | How unknown critical facts affect applicability — default is blocked/degraded, never guessed |
| `citationLocatorRefs` | One or more `{legalCorpusVersionId, document_id, locator}` targets this rule's obligation/prohibition is grounded in |
| `riskTierImplication` | How a `MATCHED` status for this rule contributes to `RiskClassification.riskLevel` (e.g. contributes to `Đ9`-style tier, or is itself a prohibited-conduct match) |

This schema reuses the "Legal Rule" input fields already defined in `docs/specs/legal-matching-domain-spec.md` — this document adds the missing entity, authoring process, and versioning policy around them; it does not redefine `LegalRuleMatch` consumption behavior.

## Rule Authoring Pipeline

| Step | Input | Output | Failure Behavior |
|---|---|---|---|
| 1. Draft | Approved `LegalCorpusVersion` text + candidate applicability logic | `LegalRuleDraft` | N/A — draft state, not yet reviewed |
| 2. Locator validation | `citationLocatorRefs` | Confirmed resolvable chunk IDs | `RULE_CITATION_UNRESOLVED`; block from review |
| 3. Legal review | `LegalRuleDraft` | Reviewed draft with comments | Best-effort; flag unresolved review comments |
| 4. Review submission | Reviewed draft | `RuleApprovalRecord` attached to `LegalRuleCatalogVersion.status = DRAFT` | Blocked until approved |
| 5. Approval | Review | `RuleApprovalRecord` (APPROVED) + `LegalRuleCatalogVersion` | Blocked if not approved |

## Rule Catalog Approval Process

| Step | Requirement |
|---|---|
| Review authority | Internal Legal Operator |
| Review scope | Applicability logic correctness, citation locator resolution, risk-tier implication, non-overlap/non-contradiction with existing approved rules in the same family |
| Approval record | `authority`, `date`, `scope_description`, `status`, `legalRuleCatalogVersionId` |
| Approval gate | `LegalRuleCatalogVersion.status = APPROVED` before production legal-matching use |
| Rejection | Approval is not recorded as approved; the catalog version remains `DRAFT` and is blocked from legal-matching until corrected or abandoned |
| Re-approval trigger | Rule content change, citation locator change, referenced `LegalCorpusVersion` supersession affecting a `citationLocatorRef`, or new rule addition |

## LegalRuleCatalogVersion Management

| Concern | Policy |
|---|---|
| Creation | Only after all included rules are approved |
| Immutability | Once approved, cannot be modified |
| Supersession | Replaced versions are `SUPERSEDED`; existing `LegalRuleMatch` records retain their pinned version |
| Catalog pinning | Each legal-matching run pins to the approved rule catalog version active at run time, alongside the pinned `LegalCorpusVersion` |

Canonical lifecycle vocabulary, matching `legal-corpus-source-spec.md`'s convention:

```text
DRAFT -> APPROVED -> SUPERSEDED
```

## Corpus Supersession Impact on Rules

```text
If a LegalCorpusVersion referenced by an APPROVED rule's citationLocatorRef is superseded and the target locator's legal_status becomes REPEALED or the chunk is removed:
  → flag affected LegalRule for mandatory re-review
  → do not silently continue matching against a rule whose citation basis no longer resolves to ACTIVE text
  → LegalRuleCatalogVersion is not auto-superseded; a human re-approval decision is required
```

## Golden-Path Fixture Note

The two-document corpus fixture (`LAW-134-2025-QH15`, `LAW-71-2025-QH15` — see `legal-corpus-source-spec.md`'s Golden-Path Corpus Fixture) is the intended source text for the first rule catalog draft. The illustrative AIUsageFlow-field-to-Điều mapping produced during Phase 5.2M research is a candidate starting point for `LegalRuleDraft` authoring, explicitly marked `PENDING_LEGAL_REVIEW` — it is not itself an approved `LegalRule`.

## Acceptance

- `LegalRule` content does not exist in production legal-matching until it has an `APPROVED` `RuleApprovalRecord`.
- Every `citationLocatorRef` resolves to a chunk in an `APPROVED` `LegalCorpusVersion` at approval time.
- `LegalRuleMatch` records both `legalCorpusVersionId` and `legalRuleCatalogVersionId` for reproducibility.
- A rule catalog is never auto-generated from corpus text by an automated process.
