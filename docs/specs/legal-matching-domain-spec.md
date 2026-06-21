# Legal Matching Domain Spec

## Purpose

This document explains how verified LCSP business facts become citation-backed legal matches.

It is the domain behavior source of truth for `LegalMatchingWorker` and the legal-match input boundary for `ClassificationWorker`. It does not create legal advice, legal validation, architecture, implementation files, test plans or backlog items.

## Inputs

### VerifiedProfile

| Input | Meaning | Required | Missing behavior |
|---|---|---:|---|
| `verifiedProfileId` | Reconciled profile identity. | Yes | Legal matching is blocked. |
| `assessmentId` | Assessment scope. | Yes | Legal matching is blocked. |
| `technicalProfileId` | Technical source basis. | Yes | Legal matching is blocked. |
| `aiUsageFlowId` | AI usage claim source. | Yes | Legal matching is blocked. |
| `profileVersion` | Versioned verified basis. | Yes | Matching cannot be reproduced; block. |
| `mergedProfile` | Reconciled business and technical facts. | Yes | Rule applicability cannot be evaluated. |
| `evidenceRefs` | Evidence refs supporting merged facts. | Yes | Material legal matches are not allowed. |

### Legal Corpus

| Input | Meaning | Required | Missing behavior |
|---|---|---:|---|
| `legalCorpusVersionId` | Corpus version identity. | Yes | Legal matching is blocked. |
| `version` | Version label. | Yes | Legal matching is blocked. |
| `sourceRefs` | Source documents and retrieval metadata. | Yes | Citation coverage is `NO_CITATION`. |
| `status` | Corpus approval/availability state. | Yes | Obsolete or unapproved corpus blocks formal match output. |

### Legal Rule

| Input | Meaning | Required | Missing behavior |
|---|---|---:|---|
| `ruleId` | Stable legal rule identifier. | Yes | Match cannot be created. |
| `ruleFamily` | Classification family such as AI use, data, oversight, documentation. | Yes | Candidate ranking is degraded. |
| `requiredFacts` | VerifiedProfile facts that must be present. | Yes | If absent, rule is not applicable or blocked. |
| `optionalFacts` | Facts that strengthen confidence. | No | Confidence may be lower. |
| `blockingFacts` | Facts that make the rule inapplicable. | No | Match is rejected when present. |
| `unknownFactPolicy` | How unknown critical facts affect applicability. | Yes | Default is blocked/degraded, never guessed. |

### Citation

| Input | Meaning | Required | Missing behavior |
|---|---|---:|---|
| `citationId` | Citation identity. | Yes for material match | Match coverage becomes `NO_CITATION` if absent. |
| `sourceTitle` | Legal source title. | Yes for material match | `PARTIAL_CITATION`. |
| `sourceIdentifier` | Law/decree/article/source identifier. | Yes for material match | `PARTIAL_CITATION`. |
| `locator` | Article/clause/section or other locator. | Yes for material match | `PARTIAL_CITATION`. |
| `corpusVersion` | Pinned corpus version. | Yes | Legal match is blocked. |
| `retrievalRef` | Retrieval/chunk/reference identity. | Yes | Citation cannot be audited; block/degrade. |
| `effectiveDateMetadata` | Effective/publication date when available. | Conditional | If unavailable, mark limitation, do not fabricate. |

## Outputs

### LegalRuleMatch

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `legalRuleMatchId` | Match identity. | Yes | System generated. |
| `assessmentId` | Assessment scope. | Yes | VerifiedProfile. |
| `verifiedProfileId` | Verified profile source. | Yes | VerifiedProfile. |
| `legalCorpusVersionId` | Corpus version used. | Yes | Legal Corpus. |
| `ruleId` | Matched rule identifier. | Yes | Legal Rule. |
| `status` | `MATCHED`, `NOT_APPLICABLE`, `BLOCKED_UNKNOWN_FACT`, `BLOCKED_MISSING_CITATION`, or `FAILED`. | Yes | Applicability and citation evaluation. |
| `citationRefs` | Citation references. | Yes | Citation retrieval. |
| `matchRationale` | Structured fact-to-rule rationale. | Yes | Rule evaluation. |
| `confidence` | Deterministic match confidence, 0.0 to 1.0. | Yes | Confidence model. |
| `coverage` | CitationCoverage object. | Yes | Coverage model. |
| `createdAt` | Creation timestamp. | Yes | System generated. |

### CitationCoverage

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `coverageStatus` | `NO_CITATION`, `PARTIAL_CITATION`, or `COMPLETE_CITATION`. | Yes | Citation checks. |
| `requiredCitationCount` | Number of required citation refs. | Yes | Rule. |
| `completeCitationCount` | Number of complete citations. | Yes | Citation checks. |
| `partialCitationCount` | Number of partial citations. | Yes | Citation checks. |
| `missingCitationCount` | Number of missing citations. | Yes | Citation checks. |
| `coveragePercent` | `completeCitationCount / requiredCitationCount * 100`. | Yes | Coverage model. |
| `citationGaps` | Missing/incomplete citation descriptors. | Yes | Citation checks. |
| `limitations` | Non-fabricated limitations such as missing effective date. | Yes | Citation metadata. |

### LegalMatchingResult

| Field | Meaning | Required | Source |
|---|---|---:|---|
| `legalMatchingResultId` | Run identity. | Yes | System generated. |
| `assessmentId` | Assessment scope. | Yes | VerifiedProfile. |
| `verifiedProfileId` | Verified profile source. | Yes | VerifiedProfile. |
| `legalCorpusVersionId` | Corpus version used. | Yes | Legal Corpus. |
| `matches` | LegalRuleMatch array. | Yes | Rule evaluation. |
| `overallCoverage` | CitationCoverage aggregate. | Yes | Coverage model. |
| `blockingReasons` | Blocking conditions for classification. | Yes | Failure and citation checks. |
| `classificationEligible` | Whether classification command may be requested. | Yes | Handoff rules. |
| `createdAt` | Creation timestamp. | Yes | System generated. |

## Legal Matching Workflow

1. Load `VerifiedProfile`.
2. Verify no unresolved conflict remains.
3. Load active `LegalCorpusVersion`.
4. Extract legal facts from `VerifiedProfile.mergedProfile`.
5. Reject facts without evidence refs when they are material.
6. Retrieve candidate rules by evidence-backed AIUsageFlow fields: business process, AI purpose, automation level, affected subjects, input/output data types, human review and harm categories.
7. Retrieve citations for each candidate rule from the pinned corpus version.
8. Evaluate rule applicability against required, optional, blocking and unknown facts.
9. Build `LegalRuleMatch` objects.
10. Calculate citation coverage per match and aggregate coverage.
11. Persist `LegalRuleMatch[]`.
12. Emit `event.legal-matching.completed.v1` if classification can evaluate the result.
13. Emit `event.legal-matching.failed.v1` if missing profile, obsolete corpus or fatal citation failure prevents evaluation.

## Rule Applicability Model

| Fact Type | Meaning | Applicability behavior |
|---|---|---|
| Required facts | Facts that must be present for the rule to apply. | If all are present with evidence refs, continue. If any are absent, status is `NOT_APPLICABLE`. If any are unknown and legally material, status is `BLOCKED_UNKNOWN_FACT`. |
| Optional facts | Facts that strengthen or explain the match. | Improve confidence but never make a rule applicable alone. |
| Blocking facts | Facts that make the rule inapplicable. | If present, status is `NOT_APPLICABLE` with rationale. |
| Unknown facts | Facts that cannot be verified. | If critical to rule applicability, block/degrade; do not guess. |

Rule applicability expression:

```text
applicable =
  all(requiredFacts.present && requiredFacts.evidenceBacked)
  && none(blockingFacts.present)
  && no critical unknown facts
```

Provider/model/framework presence alone is never a required fact for legal rule applicability.

## Citation Requirements

| Status | Meaning | Classification effect |
|---|---|---|
| `NO_CITATION` | No citation ref exists for the material rule. | Blocks material legal conclusion and final classification when critical. |
| `PARTIAL_CITATION` | Citation exists but lacks required locator/version/source metadata. | Degrades or blocks depending on materiality; must be explicit. |
| `COMPLETE_CITATION` | Citation has source title, identifier, locator, corpus version and retrieval ref; effective date metadata included when available. | May support classification. |

No citation may be fabricated. Policy-only sources cannot be treated as standalone mandatory obligations unless the active legal classification spec identifies them as binding.

## Match Confidence Model

Confidence is deterministic:

```text
requiredFactScore = matchedRequiredFacts / totalRequiredFacts
optionalFactScore = min(matchedOptionalFacts * 0.05, 0.15)
citationScore =
  1.00 if COMPLETE_CITATION
  0.50 if PARTIAL_CITATION
  0.00 if NO_CITATION
corpusScore =
  1.00 if corpus status is approved/current
  0.50 if corpus has non-fatal metadata limitation
  0.00 if corpus obsolete/unavailable
unknownPenalty = 0.25 for each critical unknown, capped at 0.50
blockingPenalty = 1.00 if any blocking fact is present

matchConfidence = clamp(
  (0.45 * requiredFactScore)
  + optionalFactScore
  + (0.35 * citationScore)
  + (0.20 * corpusScore)
  - unknownPenalty
  - blockingPenalty,
  0.00,
  1.00
)
```

Thresholds:

- `>= 0.75` with complete citations: classification-eligible match.
- `0.50..0.74`: degraded match; classification may block if material.
- `< 0.50`: not eligible for material classification conclusion.

## Coverage Model

```text
coveragePercent = completeCitationCount / requiredCitationCount * 100
```

Coverage categories:

- `100%`: all required legal citations complete.
- `50%..99%`: partial coverage; gap list required.
- `< 50%`: insufficient coverage for material conclusions.
- `0%`: no citation basis; block critical classification and final legal output.

Missing coverage means a legal fact, rule or citation required for classification cannot be traced. Coverage gaps and citation gaps must be stored in `LegalMatchingResult.blockingReasons` or `CitationCoverage.citationGaps`.

## Failure Modes

| Failure mode | Trigger | Output |
|---|---|---|
| Missing profile | VerifiedProfile cannot be loaded. | `event.legal-matching.failed.v1`; no classification command. |
| Missing citation | Material rule lacks citation. | Match status `BLOCKED_MISSING_CITATION`; classification blocked/degraded. |
| Ambiguous rule | Multiple candidate rules apply with contradictory conditions. | Match status `BLOCKED_UNKNOWN_FACT` or degraded rationale; no unsupported conclusion. |
| Contradicting citations | Retrieved citations conflict or point to incompatible versions. | Block/degrade and require corpus/rule review. |
| Obsolete corpus version | Corpus status is obsolete/unapproved. | `event.legal-matching.failed.v1`; no classification command. |
| Unknown critical usage | VerifiedProfile has `UNKNOWN` automation/human review/downstream action where rule requires it. | `BLOCKED_UNKNOWN_FACT`. |

## Classification Handoff

Legal matching hands off to classification only after legal matches are persisted.

```text
event.reconciliation.verified-profile-ready.v1
-> command.legal-matching.requested.v1
-> LegalRuleMatch[]
-> event.legal-matching.completed.v1
-> command.classification.requested.v1
```

Classification must not consume `event.reconciliation.verified-profile-ready.v1` directly. The handoff payload contains references only:

```json
{
  "assessmentId": "assess_001",
  "verifiedProfileId": "vp_001",
  "legalRuleMatchIds": ["lrm_001"],
  "legalCorpusVersionId": "lcsp_corpus_v0_1_0"
}
```

## Worked Example

### VerifiedProfile Facts

```json
{
  "verifiedProfileId": "vp_loan_001",
  "assessmentId": "assess_001",
  "mergedProfile": {
    "businessProcess": "loan_approval",
    "automationLevel": "FULLY_AUTOMATED",
    "humanReview": "ABSENT_WITH_BOUNDED_PATH",
    "aiInputTypes": ["financial", "personal_data"],
    "aiOutputTypes": ["score"],
    "downstreamAction": "APPROVE_REJECT",
    "affectedSubjects": ["loan_applicant"],
    "potentialHarmCategories": ["financial_harm"]
  },
  "evidenceRefs": ["ev_invocation_001", "ev_score_001", "ev_branch_001"]
}
```

### Rule Evaluation

| Rule input | Value | Result |
|---|---|---|
| Required fact: financial input | present | pass |
| Required fact: automated approve/reject | present | pass |
| Required fact: affected subject | loan applicant | pass |
| Required fact: human review absent/bounded | present | pass |
| Blocking fact: assistive-only use | absent | pass |
| Citation | complete citation exists | pass |

### LegalRuleMatch Output

```json
{
  "legalRuleMatchId": "lrm_loan_001",
  "assessmentId": "assess_001",
  "verifiedProfileId": "vp_loan_001",
  "legalCorpusVersionId": "lcsp_corpus_v0_1_0",
  "ruleId": "AI-HIGH-IMPACT-FINANCIAL-AUTOMATED-DECISION",
  "status": "MATCHED",
  "citationRefs": [
    {
      "citationId": "cit_001",
      "sourceTitle": "Pinned legal corpus source",
      "sourceIdentifier": "corpus-rule-ref",
      "locator": "article-or-rule-locator",
      "corpusVersion": "LCSP-LEGAL-CORPUS-v0.1.0",
      "retrievalRef": "retrieval_001"
    }
  ],
  "matchRationale": {
    "requiredFactsMatched": [
      "loan_approval",
      "FULLY_AUTOMATED",
      "APPROVE_REJECT",
      "financial",
      "loan_applicant"
    ],
    "blockingFactsPresent": [],
    "unknownFacts": []
  },
  "confidence": 0.95,
  "coverage": {
    "coverageStatus": "COMPLETE_CITATION",
    "requiredCitationCount": 1,
    "completeCitationCount": 1,
    "partialCitationCount": 0,
    "missingCitationCount": 0,
    "coveragePercent": 100,
    "citationGaps": [],
    "limitations": []
  }
}
```
