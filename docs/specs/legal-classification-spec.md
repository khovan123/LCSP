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

## Output

```json
{
  "classificationResultId": "risk_001",
  "assessmentId": "assess_001",
  "verifiedProfileId": "vp_001",
  "riskLevel": "BLOCKED_OR_CLASSIFIED",
  "legalRuleMatches": ["rule_match_001"],
  "citationCoverage": "COMPLETE | PARTIAL | MISSING",
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
<!-- PHASE-5-5-CLASSIFICATION-TRIGGER:END -->
