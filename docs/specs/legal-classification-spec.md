# Legal Classification Spec

## Status

AUTHORITATIVE

## Purpose

Single source of truth for Legal Matching and Risk Classification.

## Input Preconditions

- VerifiedProfile exists.
- AIUsageFlow material claims have evidence refs.
- Legal corpus is versioned and citation traceability is available.
- No unresolved conflict remains.

## Legal Matching

- Retrieve legal rules by evidence-backed claim, not provider/model presence.
- Every material legal conclusion requires citation coverage.
- Missing citation blocks or degrades classification/output.
- Policy-only documents cannot be treated as standalone mandatory legal obligations unless the spec identifies them as binding.

## Risk Classification

Classification may use VerifiedProfile, AIUsageFlow business usage and downstream action, LegalRuleMatch[] with citations, evidence confidence, and uncertainty.

Classification must not use provider/model/framework presence alone, unverified Manager claims, unresolved conflict, or missing citation as if it were sufficient legal basis.

## Gap Analysis

Gap Analysis is a first-class runtime component between classification and document generation.

Gap Analysis uses completed `RiskClassification`, `LegalRuleMatch[]`, citation coverage and evidence refs to produce `GapAnalysis` items. It identifies missing obligations, missing evidence, citation gaps, blocked/degraded output reasons and prioritized remediation items.

Document generation must use `GapAnalysis` as an input and must not run directly from `event.classification.completed.v1`.

## Output

```json
{
  "riskClassificationId": "018f0000-0000-7000-8000-000000000611",
  "assessmentId": "018f0000-0000-7000-8000-000000000001",
  "verifiedProfileId": "018f0000-0000-7000-8000-000000000411",
  "riskLevel": "BLOCKED_OR_CLASSIFIED",
  "legalRuleMatchIds": ["018f0000-0000-7000-8000-000000000521"],
  "citationCoverage": "COMPLETE_CITATION | PARTIAL_CITATION | NO_CITATION",
  "blockingReasons": []
}
```

<!-- PHASE-5-5-CLASSIFICATION-TRIGGER:START -->

## Phase 5.5 Canonical Trigger Contract

Legal matching is triggered only after VerifiedProfile is ready:

```text
event.reconciliation.verified-profile-ready.v1
-> command.legal-matching.requested.v1
```

Risk classification is triggered only after legal matching completes:

```text
event.legal-matching.completed.v1
-> command.classification.requested.v1
```

Classification must not consume `event.reconciliation.verified-profile-ready.v1` directly. The legal matching step is mandatory because classification requires `LegalRuleMatch[]` and citation traceability.

Gap Analysis is triggered only after classification completes:

```text
event.classification.completed.v1
-> command.gap-analysis.requested.v1
```

Document generation is triggered only after gap analysis completes:

```text
event.gap-analysis.completed.v1
-> command.document.requested.v1
```

Document generation must not consume `event.classification.completed.v1` directly.
<!-- PHASE-5-5-CLASSIFICATION-TRIGGER:END -->
