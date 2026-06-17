# Risk Classification Spec

## Status

AUTHORITATIVE

## Merged From

- `docs/specs/scoring-model.md`
- Classification invariants from `docs/specs/implementation-contract.md`

## Purpose

Single source of truth for risk classification behavior. Classification cannot run before VerifiedProfile and cannot treat provider/model/framework detection alone as legal risk.

---

# LCSP Scoring Model

## Purpose

Defines the three LCSP scores at product/architecture level.

MVP workflow rule:

```text
conflict_exists = conflicts.length > 0

if conflict_exists:
    route = CONFLICT_RESOLUTION_REQUIRED
else:
    route = VERIFIED_PROFILE_READY
```

For MVP, any unresolved conflict blocks classification and final compliance report. Conflict Score may be kept as an internal explanation/supporting value, but it does not create multiple workflow routes.

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
| 0.75 - 0.84 | Strong | Manager review recommended |
| >= 0.85 | Very strong | Manager conflict resolution required if conflicting with Wizard |

Example: OpenAI package declared but unused may have low confidence and should not create a legal conclusion.

Static scanner confidence inputs are defined in `docs/specs/static-analysis-scanner-contract.md`. Evidence Confidence should weigh direct AST/model invocation evidence and traced output-to-action paths higher than naming conventions, README comments or LLM interpretation. `SCAN_COVERAGE_LIMITATION` and `UNSUPPORTED_DYNAMIC_FLOW` reduce confidence and should surface uncertainty rather than overclaim coverage.

## AI Intervention Score

| Item | Description |
| --- | --- |
| Purpose | Measures how deeply AI affects workflow or decisions |
| Inputs | AIUsageFlow: business_process, ai_purpose, ai_input_types, ai_output_types, downstream_action, affected_subjects, automation_level, human_review, potential_harm_categories |
| Output range | 0.00 - 1.00 |
| Used by | Risk Classification after VerifiedProfile |
| Blocking behavior | Does not block workflow by itself |

AI Intervention Score is derived from AIUsageFlow, not only from model/provider detection. A repository containing OpenAI/Gemini/LangChain/TensorFlow is not enough to assign intervention risk. The score reflects what AI output does in the business flow.

AI Intervention Score must use claim-level AIUsageFlow evidence. Claims without evidence refs are not eligible for legal rule matching and should not increase intervention score beyond uncertainty/supporting context.

Thresholds:

| Range | Meaning |
| --- | --- |
| 0.00 - 0.29 | Light/internal support |
| 0.30 - 0.59 | Analysis/recommendation |
| 0.60 - 0.74 | Influences decision |
| 0.75 - 0.89 | Important decision recommendation |
| >= 0.90 | Automated or rights-impacting decision signal |

Example: Model output connected to approve/reject flow has high AI Intervention Score and becomes classification input.

Usage-flow signal examples:

| Signal | Meaning |
| --- | --- |
| AI output only generates content | Intervention lower |
| AI output recommends action | Intervention medium |
| AI output ranks/scores people | Intervention higher |
| AI output triggers approve/reject | Intervention high |
| No human review | Intervention higher |
| Sensitive domain/data | Intervention higher |

## Conflict Score

| Item | Description |
| --- | --- |
| Purpose | Measures severity of mismatch between WizardProfile and TechnicalProfile/AIUsageFlow |
| Inputs | Wizard value, technical signal, usage-flow claim, evidence confidence, field criticality, legal/risk impact |
| Output range | 0.00 - 1.00 |
| Used by | Reconciliation explanation, reviewer context, audit |
| Blocking behavior | Does not create severity-based workflow routes in MVP. Workflow decision remains binary: conflict exists or not. |

MVP routing:

| Rule | Action |
| --- | --- |
| `conflicts.length == 0` | Route to `VERIFIED_PROFILE_READY` |
| `conflicts.length > 0` | Route to `CONFLICT_RESOLUTION_REQUIRED`; classification remains locked until resolved |

Conflict Score can still be displayed as explanatory context to help users understand seriousness. It is not used to create severity-based workflow branches in MVP.

Example: Wizard says `auto_decision = NO`, scanner finds AI output entering approve/reject flow. Reconciliation creates a conflict. The workflow pauses until Manager resolves the conflict and reconciliation passes, regardless of score threshold.
