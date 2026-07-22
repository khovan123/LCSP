---
task_id: MW-intel-002
module: python-workers/intelligence
runtime: lcsp-python-workers
priority: P0
status: DONE
epic_story: 4.2
depends_on:
  - python-workers/intelligence/01-technical-profile-worker.md
---

# AIUsageFlow Worker

## Outcome

Consume `technical-profile-ready` events and generate `AIUsageFlow` claims using a **deterministic rule engine** — not an LLM. Each claim is produced by matching `TechnicalFinding`/`TechnicalProfile` evidence (plus optional `WizardProfile` answers) against the fixed claim-generation rule table in `docs/specs/ai-usage-flow-domain-spec.md`, with a deterministic confidence formula. Raw source code, full prompts, secrets, and full AST bodies are never sent anywhere in this worker — evidence refs and pattern names only. This supersedes any prior LLM-Gateway-based claim generation design; `ai-usage-flow-domain-spec.md` is the authoritative behavior source.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/intelligence/ai_usage_flow_consumer.py` | Create | `ConsumerBase` subclass for `technical-profile-ready` |
| `lcsp-python-workers/src/lcsp_workers/intelligence/ai_usage_flow_rule_engine.py` | Create | Deterministic claim-generation rule table + evaluator (no LLM call) |
| `lcsp-python-workers/src/lcsp_workers/intelligence/confidence_calculator.py` | Create | Deterministic confidence formula per `ai-usage-flow-domain-spec.md` |
| `lcsp-python-workers/src/lcsp_workers/intelligence/conflict_candidate_builder.py` | Create | WizardProfile vs. TechnicalProfile conflict candidate detection |

## RabbitMQ

| Attribute | Value |
|---|---|
| Queue | `intelligence.technical-profile-ready` |
| Routing key | `technical-profile-ready` |
| PBAC preflight | No (system event) |

## Rule Engine Inputs (No LLM Prompting)

This worker never constructs an LLM prompt or calls an LLM Gateway. It reads:
- `TechnicalProfile` fields: `aiDetected`, `providers`, `frameworks`, `modelInvocationCount`, `inputCategories`, `outputCategories`, `decisionFlowSignals`, `humanReviewSignals`, `coverageLimitations`, `confidence`, `evidenceRefs`.
- `WizardProfile` fields when linked (optional — see Verification Source below): `answers.businessProcess`, `answers.aiPurpose`, `answers.humanReview`, `answers.affectedSubjects`, `answers.dataTypes`.
- `TechnicalEvidenceReport`: `TechnicalFinding[]`, `EvidenceReference[]`, `coverageSummary`, `qualityStatus`.

## Verification Source

| WizardProfile state | `verificationSource` | Effect |
|---|---|---|
| Linked | `TECHNICAL_PLUS_WIZARD` | Business-declaration-dependent fields (business process, affected subjects) may use WizardProfile answers; conflict rules active. |
| Not linked | `TECHNICAL_ONLY` | Worker proceeds using TechnicalProfile/TechnicalEvidenceReport alone. Business-declaration-dependent fields fall back to technical-evidence-only inference with a confidence penalty and are more likely `UNKNOWN`. Generation is NOT blocked solely for a missing WizardProfile. |

`AIUsageFlow` generation is `BLOCKED` only when `TechnicalProfile` or `TechnicalEvidenceReport` is missing/failed — never solely for a missing `WizardProfile`.

## Claim Taxonomy (Authoritative — see `ai-usage-flow-domain-spec.md`)

`MODEL_PROVIDER_USAGE`, `MODEL_INVOCATION`, `AI_GENERATED_OUTPUT`, `DOWNSTREAM_ACTION`, `AUTOMATED_DECISION`, `HUMAN_REVIEW`, `PROMPT_STORAGE`, `PERSONAL_DATA_INPUT`, `TRAINING_ACTIVITY`, `RAG_USAGE`, `DOCUMENT_GENERATION`, `CONTENT_LABELING`, `HUMAN_OVERSIGHT_CONTROL`, `AI_INTERACTION_DISCLOSURE`, `INCIDENT_HANDLING`.

Each category's required/optional signals, missing-evidence behavior, and conflict behavior are defined in `ai-usage-flow-domain-spec.md`'s Claim Generation Rules table — this worker implements that table verbatim, it does not redefine it.

## AIUsageFlowClaim Generation

```python
@dataclass
class AIUsageFlowClaim:
    claim_id: str
    ai_usage_flow_id: str
    claim_category: str      # One of the 15 canonical categories above
    claim_field: str         # e.g. 'automation_level', 'human_review', 'content_labeling_status'
    claim_value: object      # Structured value (enum/string/list)
    lifecycle_state: str     # DETECTED | VALIDATED | CONFLICTED | VERIFIED | REJECTED | ABSTAINED
    evidence_refs: list[str] # Required for material claims
    confidence: float        # 0.00-1.00, deterministic formula
    confidence_breakdown: dict  # {base, required_evidence_bonus, optional_support_bonus, coverage_penalty, conflict_penalty, missing_evidence_penalty}
    uncertainty_reasons: list[str]
    conflict_refs: list[str] | None
```

## Confidence Formula (Deterministic — verbatim from `ai-usage-flow-domain-spec.md`)

```python
def calculate_claim_confidence(
    claim_category: str,
    required_evidence_present: bool,
    optional_signal_count: int,
    material_coverage_limitations: int,
    has_wizard_conflict: bool,
    missing_required_evidence_class: bool,
) -> tuple[float, dict]:
    base = CLAIM_CATEGORY_BASE[claim_category]
    D = 0.10 if required_evidence_present else 0.0
    O = min(optional_signal_count * 0.05, 0.10)
    C = min(material_coverage_limitations * 0.15, 0.30)
    K = 0.20 if has_wizard_conflict else 0.0
    M = 0.35 if missing_required_evidence_class else 0.0
    raw = base + D + O - C - K - M
    confidence = max(0.00, min(1.00, raw))
    return confidence, {"base": base, "D": D, "O": O, "C": C, "K": K, "M": M}
```

`CLAIM_CATEGORY_BASE` table (verbatim, must match `ai-usage-flow-domain-spec.md` exactly):

```python
CLAIM_CATEGORY_BASE = {
    "MODEL_PROVIDER_USAGE": 0.35,
    "MODEL_INVOCATION": 0.70,
    "AI_GENERATED_OUTPUT": 0.65,
    "DOWNSTREAM_ACTION": 0.70,
    "AUTOMATED_DECISION": 0.80,
    "HUMAN_REVIEW": 0.70,
    "PROMPT_STORAGE": 0.55,
    "PERSONAL_DATA_INPUT": 0.60,
    "TRAINING_ACTIVITY": 0.60,
    "RAG_USAGE": 0.65,
    "DOCUMENT_GENERATION": 0.65,
    "CONTENT_LABELING": 0.60,
    "HUMAN_OVERSIGHT_CONTROL": 0.65,
    "AI_INTERACTION_DISCLOSURE": 0.60,
    "INCIDENT_HANDLING": 0.55,
}
```

Thresholds: `< 0.40` → `ABSTAINED`; `0.40..0.64` → `DETECTED` (not material-eligible); `>= 0.65` → `VALIDATED` if no conflict; `>= 0.75` with complete evidence path → eligible to support legal matching after reconciliation.

## Business Rules

1. Listen on `technical-profile-ready`. Fetch `TechnicalProfile` and `TechnicalEvidenceReport` from NestJS API. Fetch `WizardProfile` only if linked to the assessment.
2. For each claim category, evaluate the rule engine's required/optional signal conditions against `TechnicalFinding[]` — never call an LLM to decide a claim.
3. Set `evidence_refs` from the exact `TechnicalFinding`/`EvidenceReference` IDs that grounded the claim; a claim without required evidence refs cannot reach `VALIDATED`.
4. Compute `confidence`/`confidence_breakdown` via the deterministic formula above — never an LLM-assigned categorical confidence.
5. Set `verificationSource` per the Verification Source table; a missing `WizardProfile` alone must not block generation.
6. Run conflict candidate rules (WizardProfile vs. TechnicalProfile) per `ai-usage-flow-domain-spec.md`'s Conflict Generation Rules table; attach `conflict_refs` and set `lifecycle_state = CONFLICTED` when triggered.
7. Apply Abstention Rules verbatim (e.g., provider/package presence alone never yields a material `MODEL_INVOCATION` claim; unresolved dynamic output-to-action path abstains from `AUTOMATED_DECISION`).
8. Preserve `coverageLimitations` and `uncertaintyReasons` — never silently drop them.
9. Assemble `AIUsageFlowSummary` (all fields, including `contentLabelingStatus`, `riskDocumentationEvidence`, `trainingDataLawfulnessSignal`, `interventionControlPresent`, `aiInteractionDisclosurePresent`, `incidentHandlingPresent`) from validated claims.
10. Assert no raw source/full prompt/secret/full AST body is present in any output field before callback.
11. Submit to `POST /internal/ai-usage-flow/callback`.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | `AI_MODEL_INVOCATION` finding with evidence ref | `MODEL_INVOCATION` claim, `VALIDATED`, confidence per formula |
| T02 | Provider/package finding only, no invocation | `MODEL_PROVIDER_USAGE` claim only; no material `MODEL_INVOCATION` claim (abstain) |
| T03 | No `WizardProfile` linked | `verificationSource = TECHNICAL_ONLY`; generation not blocked |
| T04 | `WizardProfile` says no AI, `TechnicalProfile.aiDetected = confirmed` | Conflict `WIZARD_NO_AI_BUT_INVOCATION_EXISTS` created |
| T05 | Synthetic-media output with no labeling pattern found, path resolved | `CONTENT_LABELING` claim `contentLabelingStatus = ABSENT` |
| T06 | Raw source content in any output field | Test MUST FAIL (never allowed) |
| T07 | Claim confidence computed via LLM categorical score instead of formula | Test MUST FAIL (rule engine only) |
| T08 | Missing `TechnicalProfile` | `AIUsageFlow` generation `BLOCKED` |
| T09 | Material claim missing `evidence_refs` | Claim rejected by callback validation |
| T10 | Coverage limitation present | Preserved in `coverageLimitations`, not discarded |

## Definition of Done

- No LLM call anywhere in claim generation — deterministic rule engine only.
- Claim taxonomy matches the 15 canonical categories in `ai-usage-flow-domain-spec.md` exactly.
- Confidence computed via the exact deterministic formula and base-score table.
- `verificationSource` set correctly; missing `WizardProfile` never blocks generation alone.
- `evidence_refs` set for all material claims; no raw source/prompt/secret/AST content in any output field.
- Conflict candidates generated per the Conflict Generation Rules table.

## Implementation Evidence

- Added deterministic AIUsageFlow worker modules under `lcsp-python-workers/src/lcsp_workers/intelligence/`:
  - `ai_usage_flow_consumer.py`
  - `ai_usage_flow_rule_engine.py`
  - `confidence_calculator.py`
  - `conflict_candidate_builder.py`
- Implemented `AIUsageFlowConsumer` as a `ConsumerBase` subclass for queue `intelligence.technical-profile-ready`, routing key `technical-profile-ready`, with `requires_pbac = False` for system event processing.
- Implemented canonical 15-category claim base-score table and deterministic confidence formula from `docs/specs/ai-usage-flow-domain-spec.md`.
- Implemented deterministic claim generation for provider usage, model invocation, generated output, content labeling, provider-only abstention, missing-evidence rejection, coverage limitation preservation, and `WIZARD_NO_AI_BUT_INVOCATION_EXISTS` conflict candidate generation.
- Updated `AIUsageFlowCallbackPayload` and `WorkerApiClient` to submit to `POST /internal/ai-usage-flow/callback` and fetch required TechnicalProfile/TechnicalEvidenceReport/WizardProfile inputs.
- Added unit coverage in `lcsp-python-workers/tests/test_ai_usage_flow_worker.py` for T01–T10, consumer callback behavior, and no-network/no-LLM generation behavior.

## Validation

- `python -m py_compile lcsp-python-workers/src/lcsp_workers/intelligence/ai_usage_flow_consumer.py lcsp-python-workers/src/lcsp_workers/intelligence/ai_usage_flow_rule_engine.py lcsp-python-workers/src/lcsp_workers/intelligence/confidence_calculator.py lcsp-python-workers/src/lcsp_workers/intelligence/conflict_candidate_builder.py lcsp-python-workers/src/lcsp_workers/intelligence/technical_profile_consumer.py lcsp-python-workers/src/lcsp_workers/intelligence/technical_profile_builder.py lcsp-python-workers/src/lcsp_workers/platform/api_client.py lcsp-python-workers/src/lcsp_workers/platform/callback_schemas.py lcsp-python-workers/src/package/contract/api_client_contracts.py`
  - Result: passed.
- `python -m pytest lcsp-python-workers/tests/test_ai_usage_flow_worker.py lcsp-python-workers/tests/test_technical_profile_worker.py lcsp-python-workers/tests/test_api_client.py lcsp-python-workers/tests/test_queue_consumer.py lcsp-python-workers/tests/test_evidence_assembler.py -q`
  - Result: 47 passed, 1 warning (`asyncio_mode` pytest config warning in minimal targeted environment).
