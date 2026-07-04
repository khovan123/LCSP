---
task_id: MW-intel-004
module: python-workers/intelligence
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 5.4
depends_on:
  - python-workers/intelligence/03-conflict-detection-worker.md
---

# VerifiedProfile Worker

## Outcome

Consume `reconciliation.all-conflicts-resolved` events and assemble the `VerifiedProfile` from the resolved `AIUsageFlow` + `WizardProfile` (when linked). VerifiedProfile contains final evidence-backed usage claims with resolution context. Gate: all conflicts must be resolved before building. When `AIUsageFlow.verificationSource = TECHNICAL_ONLY` (no linked WizardProfile), there are no Wizard-declaration conflicts to resolve by construction, so this gate is trivially satisfied and VerifiedProfile is built directly from AIUsageFlow.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/intelligence/verified_profile_consumer.py` | Create | `ConsumerBase` subclass for `reconciliation.all-conflicts-resolved` |
| `lcsp-python-workers/src/lcsp_workers/intelligence/verified_profile_builder.py` | Create | Final profile assembly |

## RabbitMQ

| Attribute | Value |
|---|---|
| Queue | `intelligence.all-conflicts-resolved` |
| Routing key | `reconciliation.all-conflicts-resolved` |
| PBAC preflight | No (system event) |

## VerifiedProfile Assembly

**Inputs:**
- Resolved `AIUsageFlow` (from NestJS API)
- Resolved `ConflictRecord` list (with Manager resolution notes) — empty when `verificationSource = TECHNICAL_ONLY`
- `WizardProfile` answers, optional — present only when `AIUsageFlow.verificationSource = TECHNICAL_PLUS_WIZARD`

**Output:**
```python
@dataclass
class VerifiedProfileData:
    verified_claims: list[AIUsageClaim]       # Claims surviving conflict resolution
    verification_source: str                   # 'TECHNICAL_ONLY' | 'TECHNICAL_PLUS_WIZARD', carried from AIUsageFlow
    wizard_context: dict | None                 # Relevant WizardProfile fields, None when TECHNICAL_ONLY
    conflict_resolutions: list[dict]           # Resolution summaries (not Manager notes verbatim); empty when TECHNICAL_ONLY
    gates_passed_at: dict                      # { 'conflicts_resolved': ISO timestamp }
    evidence_chain_integrity: bool             # True if all material claims have evidence_refs
```

## Business Rules

1. Fetch resolved `AIUsageFlow` + conflict resolutions from NestJS API.
2. Check NestJS preflight gate: no `PENDING` conflicts → `PENDING_CONFLICTS_EXIST` error from API is a signal to re-queue.
3. Include only claims from `AIUsageFlow` — do NOT add new claims in this worker.
4. `gates_passed_at.conflicts_resolved` = timestamp from event message.
5. `evidence_chain_integrity = True` only if all material claims have `evidence_refs`.
6. No LLM calls.
7. Submit to `POST /internal/reconciliation/verified-profile-callback`.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | All conflicts resolved | VerifiedProfile submitted |
| T02 | API returns `PENDING_CONFLICTS_EXIST` | Re-queue (not discard) |
| T03 | Material claims missing `evidence_refs` | `evidence_chain_integrity = False` |
| T04 | No new claims added | Verified claims = original AIUsageFlow claims |
| T05 | No LLM calls | Network trace verified |

## Definition of Done

- VerifiedProfile includes only existing claims — no new claims added.
- Gate check via API call — re-queue on `PENDING_CONFLICTS_EXIST`.
- `evidence_chain_integrity` accurately reflects material claim completeness.
- No LLM calls.
