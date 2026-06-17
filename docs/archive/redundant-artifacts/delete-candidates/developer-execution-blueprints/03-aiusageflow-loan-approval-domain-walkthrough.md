# AIUsageFlow Domain Walkthrough — Loan Approval

## Purpose

Show how a concrete loan approval code path transforms Scanner evidence into AIUsageFlow claims. This is a domain walkthrough, not architecture and not source code.

## Domain Scenario

The repository contains a loan workflow where an AI model produces or influences a score. The score controls an approve/reject path without visible human review.

## Input Chain

```text
Assessment
  -> WizardProfile
  -> RepositorySnapshot
  -> TechnicalEvidenceReport
  -> TechnicalFinding[]
  -> TechnicalProfile
  -> AIUsageFlowRuleEngine
  -> AIUsageFlowClaim[]
  -> AIUsageFlow
```

## Input Objects

### WizardProfile

```json
{
  "wizardProfileId": "wiz_001",
  "assessmentId": "assess_001",
  "declaredBusinessProcess": "loan approval",
  "declaredAiPurpose": "credit scoring support",
  "declaredHumanReview": "not_declared",
  "declaredDownstreamAction": "approve_or_reject"
}
```

### TechnicalFinding[]

```json
[
  {
    "findingId": "tf_001",
    "findingType": "AI_PROVIDER_INVOCATION",
    "confidence": 0.9,
    "evidenceRefs": ["ev:src/loan.ts:1", "ev:src/loan.ts:3"]
  },
  {
    "findingId": "tf_002",
    "findingType": "AI_OUTPUT_TO_DECISION",
    "confidence": 0.75,
    "evidenceRefs": ["ev:src/loan.ts:3", "ev:src/loan.ts:5", "ev:src/loan.ts:6"]
  },
  {
    "findingId": "tf_003",
    "findingType": "AUTOMATED_DECISION_PATH",
    "confidence": 0.72,
    "evidenceRefs": ["ev:src/loan.ts:5", "ev:src/loan.ts:6"]
  }
]
```

### TechnicalProfile

```json
{
  "technicalProfileId": "tp_001",
  "assessmentId": "assess_001",
  "technicalEvidenceReportId": "ter_001",
  "summary": {
    "providerInvocations": 1,
    "decisionPathSignals": 2,
    "humanReviewSignals": 0,
    "coverageLimitations": 0
  }
}
```

## Rule Execution Trace

| Rule | Why It Runs | Input Evidence | Output Claim |
|---|---|---|---|
| `AUF-002` Provider invocation | `AI_PROVIDER_INVOCATION` exists | `tf_001` | Technology invocation claim, not legal risk. |
| `AUF-010` AI output feeds threshold | `AI_OUTPUT_TO_DECISION` exists | `tf_002` | Downstream action claim. |
| `AUF-014` Loan approval action | Wizard and action path indicate lending | `wiz_001`, `tf_002`, `tf_003` | Business process `loan_approval`. |
| `AUF-015` Credit scoring action | Score affects eligibility | `tf_002`, `tf_003` | Potential harm category `financial_access`. |
| `AUF-019` Human review absent on bounded path | No review gate in bounded path | `tf_003` plus graph path | Human review `ABSENT_ON_BOUNDED_PATH`. |
| `AUF-032` AI output stored/used as decision | AI output controls approve/reject state | `tf_002`, `tf_003` | Automation level `AUTOMATED_DECISION`. |
| `AUF-046` Citation precondition | Legal matching may be needed | material claims | Citation required later. |
| `AUF-050` VerifiedProfile precondition | Flow complete but not yet reconciled | all material claims | Allow VerifiedProfile only after reconciliation state is clean. |

## Expected AIUsageFlowClaim[]

```json
[
  {
    "claimType": "BUSINESS_PROCESS",
    "value": "loan_approval",
    "confidence": 0.82,
    "sourceTypes": ["WIZARD_DECLARATION", "TECHNICAL_FINDING"],
    "evidenceRefs": ["wiz_001", "ev:src/loan.ts:5", "ev:src/loan.ts:6"],
    "materialForLegalMatching": true
  },
  {
    "claimType": "DOWNSTREAM_ACTION",
    "value": "loan_rejection_or_approval",
    "confidence": 0.75,
    "sourceTypes": ["TECHNICAL_FINDING", "GRAPH_INFERENCE"],
    "evidenceRefs": ["ev:src/loan.ts:3", "ev:src/loan.ts:5", "ev:src/loan.ts:6"],
    "materialForLegalMatching": true
  },
  {
    "claimType": "HUMAN_REVIEW",
    "value": "ABSENT_ON_BOUNDED_PATH",
    "confidence": 0.72,
    "sourceTypes": ["GRAPH_INFERENCE"],
    "evidenceRefs": ["ev:src/loan.ts:5", "ev:src/loan.ts:6"],
    "materialForLegalMatching": true,
    "uncertaintyReasons": ["Human review absence is asserted only for the bounded static path."]
  },
  {
    "claimType": "AUTOMATION_LEVEL",
    "value": "AUTOMATED_DECISION",
    "confidence": 0.72,
    "sourceTypes": ["TECHNICAL_FINDING", "GRAPH_INFERENCE"],
    "evidenceRefs": ["ev:src/loan.ts:3", "ev:src/loan.ts:5", "ev:src/loan.ts:6"],
    "materialForLegalMatching": true
  }
]
```

## Expected AIUsageFlow

```json
{
  "aiUsageFlowId": "auf_001",
  "assessmentId": "assess_001",
  "technicalProfileId": "tp_001",
  "claims": "AIUsageFlowClaim[]",
  "automationLevel": "AUTOMATED_DECISION",
  "humanReview": "ABSENT_ON_BOUNDED_PATH",
  "legalRuleEligibility": "ELIGIBLE",
  "unresolvedItems": [],
  "coverageLimitations": [],
  "confidence": 0.75
}
```

## What Must Not Happen

- `AI_PROVIDER_INVOCATION` alone must not set `automationLevel = AUTOMATED_DECISION`.
- Missing evidence refs on any material claim must block that claim from legal matching.
- If the reject/approve action is dynamic or unresolved, output must become `UNKNOWN` or blocked, not automated certainty.
- If WizardProfile says human review exists, but source path does not show it, create reconciliation conflict instead of overwriting scanner evidence.

## Developer Implementation Anchor

Implement `AIUsageFlowService.buildFromTechnicalProfile()` so it accepts exactly:

```text
assessmentId
wizardProfileId
technicalProfileId
technicalEvidenceReportId
technicalFindingIds[]
graphPathRefs[]
```

and returns exactly:

```text
AIUsageFlow
AIUsageFlowClaim[]
nextEvent = ai-usage-flow.ready | reconciliation.required
```
