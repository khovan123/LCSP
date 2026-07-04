---
task_id: MW-cls-py-001
module: python-workers/classification
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 6.2
depends_on:
  - python-workers/legal/01-chromadb-legal-retrieval-worker.md
  - python-workers/llm/01-llm-gateway-client.md
---

# Classification Worker

## Outcome

Consume `legal-rule-match-ready` events and generate classification output using `VerifiedProfile` + `LegalRuleMatch`. **The `riskLevel`/applicability decision itself is computed deterministically** from `LegalRuleMatch[]` confidence and citation coverage per `docs/specs/legal-classification-spec.md` — it is never decided by an LLM. An LLM, if used at all, only drafts human-readable rationale **text** that narrates an already-computed decision; it must not be able to change `riskLevel` or `applicability_assessment`. Apply citation guardrail (degrade or block if citation basis missing). Never overclaim certification or compliance.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/classification/__init__.py` | Create | Package init |
| `lcsp-python-workers/src/lcsp_workers/classification/classification_consumer.py` | Create | `ConsumerBase` for `legal-rule-match-ready` |
| `lcsp-python-workers/src/lcsp_workers/classification/risk_tier_calculator.py` | Create | Deterministic `riskLevel`/`applicability_assessment` computation from `LegalRuleMatch[]` — no LLM call |
| `lcsp-python-workers/src/lcsp_workers/classification/rationale_narrator.py` | Create | Optional LLM-drafted rationale **text** only, given the already-computed decision; must not alter the decision |
| `lcsp-python-workers/src/lcsp_workers/classification/citation_guardrail.py` | Create | Guardrail: passed \| degraded \| blocked |
| `lcsp-python-workers/src/lcsp_workers/classification/overclaim_detector.py` | Create | Output guardrail against overclaim wording |

## RabbitMQ

| Attribute | Value |
|---|---|
| Queue | `classification.legal-rule-match-ready` |
| Routing key | `legal-rule-match-ready` |
| PBAC preflight | No (system event) |

## Classification Data Schema

```python
@dataclass
class ClassificationData:
    classification_version: str
    usage_claims: list[dict]            # From VerifiedProfile (claim_category, confidence)
    applicable_rules: list[dict]        # From LegalRuleMatch (rule_id, article_ref, match_type, confidence, coverage_status)
    risk_level: str                     # Deterministic — see Risk Tier Calculation below. Never LLM-assigned.
    applicability_assessment: str       # 'applicable' | 'partially_applicable' | 'not_applicable' — deterministic, never LLM-assigned
    citation_refs: list[str]            # Citation chunk IDs backing the decision
    citation_coverage: str              # NO_CITATION | PARTIAL_CITATION | COMPLETE_CITATION
    rationale: str | None               # Optional LLM-drafted narrative text describing the decision above — never the source of the decision
    guardrail_status: str               # 'passed' | 'degraded' | 'blocked'
    guardrail_reason: str | None
```

## Risk Tier Calculation (Deterministic — Computed Before Any LLM Call)

1. `risk_level` and `applicability_assessment` are derived solely from `LegalRuleMatch[].status`, `LegalRuleMatch[].confidence`, and `LegalRuleMatch[].coverage_status`, per `docs/specs/legal-classification-spec.md`. This computation must run and produce a final value **before** `rationale_narrator.py` is invoked, if it is invoked at all.
2. Classification must not use provider/model/framework presence alone, unverified Manager claims, unresolved conflict, or missing citation as sufficient legal basis for `risk_level`.
3. If an LLM is used for `rationale`, its output is validated to be text-only narration of the already-computed `risk_level`/`applicability_assessment`/`citation_refs` — it has no write path to those fields. A rationale draft that contradicts the computed decision is rejected, not reconciled by re-asking the LLM to "decide" again.

## Citation Guardrail Rules

| State | Condition |
|---|---|
| `passed` | All decision citations in `LegalRuleMatch.citationAllowlist`, none `REPEALED` |
| `degraded` | Some citations missing — decision uses only verified citations, rest degraded |
| `blocked` | No valid citations — classification cannot proceed |

## Overclaim Wording Detector

Applies only to the optional `rationale` narrative text (never to the deterministic `risk_level` field itself, which uses its own fixed enum). Block rationale output that contains: `certified`, `validated`, `approved`, `compliant`, `non-compliant`, `production ready`, `legally approved`.

## Business Rules

1. Fetch `LegalRuleMatch` and `VerifiedProfile` from NestJS API.
2. Require `LegalRuleMatch.guardrailStatus = passed` before computing a classification-eligible decision.
3. Compute `risk_level`, `applicability_assessment`, `citation_coverage` deterministically via `risk_tier_calculator.py` — no LLM call in this step.
4. Only if a human-readable rationale is required downstream: build an LLM prompt from evidence metadata (rule IDs, claim categories, WizardProfile context) — NO raw source code — and call `LLMGatewayClient.complete()` with budget cap, passing the already-computed decision as context to narrate, not to decide.
5. Run `OverclaimDetector.check(rationale)` on the narrative text — reject if overclaim detected, set `guardrail_status = blocked`.
6. Run `CitationGuardrail.check(citation_refs, citationAllowlist)` against the deterministic decision's citations — degrade or block.
7. Reject any rationale draft whose stated conclusion contradicts the deterministic `risk_level`/`applicability_assessment` — regenerate narration or omit rationale, never let it override the decision.
8. Submit to `POST /internal/classification/result-callback`.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Valid match + valid citations | `guardrail_status = passed`, `risk_level` computed deterministically |
| T02 | Missing some citations | `guardrail_status = degraded` |
| T03 | No valid citations | `guardrail_status = blocked` |
| T04 | Rationale contains `certified` | Rationale rejected, `guardrail_status = blocked` for the narrative; `risk_level` unaffected |
| T05 | `LegalRuleMatch.guardrailStatus = blocked` | Classification not started |
| T06 | Raw source in LLM prompt | `PromptSafetyViolation` raised |
| T07 | Budget exceeded | `BudgetExceeded`; `risk_level` already computed remains valid, rationale omitted |
| T08 | LLM rationale draft states a different risk level than computed | Rationale rejected; `risk_level` field unchanged |
| T09 | `risk_level` computed without any LLM call in the pipeline | Confirmed — LLM call is optional and downstream of the decision |

## Definition of Done

- `risk_level`/`applicability_assessment` computed deterministically from `LegalRuleMatch[]` — verified with zero LLM calls in the path.
- LLM, if used, only produces narrative text and cannot alter the computed decision.
- LLM prompt (when used) contains no raw source code.
- Overclaim wording detected and blocked in rationale text.
- Citation guardrail applied: `passed` | `degraded` | `blocked`, `REPEALED` citations never accepted.
- Monthly LLM budget cap applied when LLM is used.
