# LCSP Scoring Model

## Purpose

Defines the three LCSP scores at product/architecture level.

Hard rule:

```text
Only Conflict Score can block workflow.
```

## Evidence Confidence Score

| Item | Description |
| --- | --- |
| Purpose | Measures reliability of technical evidence |
| Inputs | source_type, tool confidence, finding type, scope, provenance, signal strength |
| Output range | 0.00 - 1.00 |
| Used by | Evidence Gate, Developer review, Reconciliation |
| Blocking behavior | Does not block workflow by itself |

Thresholds:

| Range | Meaning | Action |
| --- | --- | --- |
| < 0.40 | Weak evidence | Record only |
| 0.40 - 0.59 | Uncertain | Warning |
| 0.60 - 0.74 | Moderately strong | May ask Developer |
| 0.75 - 0.84 | Strong | Developer confirmation recommended |
| >= 0.85 | Very strong | Developer confirmation required if conflicting with Wizard |

Example: OpenAI package declared but unused may have low confidence and should not create a legal conclusion.

## AI Intervention Score

| Item | Description |
| --- | --- |
| Purpose | Measures how deeply AI affects workflow or decisions |
| Inputs | decision flow, model output usage, approval/rejection links, human review signals |
| Output range | 0.00 - 1.00 |
| Used by | Risk Classification after VerifiedProfile |
| Blocking behavior | Does not block workflow by itself |

Thresholds:

| Range | Meaning |
| --- | --- |
| 0.00 - 0.29 | Light/internal support |
| 0.30 - 0.59 | Analysis/recommendation |
| 0.60 - 0.74 | Influences decision |
| 0.75 - 0.89 | Important decision recommendation |
| >= 0.90 | Automated or rights-impacting decision signal |

Example: Model output connected to approve/reject flow has high AI Intervention Score and becomes classification input.

## Conflict Score

| Item | Description |
| --- | --- |
| Purpose | Measures severity of mismatch between WizardProfile and TechnicalProfile |
| Inputs | Wizard value, technical signal, evidence confidence, field criticality, legal/risk impact |
| Output range | 0.00 - 1.00 |
| Used by | Reconciliation workflow and blocking |
| Blocking behavior | Only score allowed to block workflow |

Thresholds:

| Range | Meaning | Action |
| --- | --- | --- |
| < 0.40 | Not material | No block |
| 0.40 - 0.59 | Warning | Show warning |
| 0.60 - 0.74 | Possible conflict | Review required |
| 0.75 - 0.84 | Material conflict | Block final classification/report until resolved |
| >= 0.85 | Critical conflict | Block workflow and require dual confirmation |

Example: Wizard says `auto_decision = NO`, scanner finds AI output entering approve/reject flow with high confidence. Conflict Score may be critical and requires Developer + Manager confirmation.
