# A1 Wizard Validation Execution Pack

## Purpose

Prepare real validation for A1: Wizard simplicity and completeness. This pack defines how to evaluate whether a Manager can complete the Wizard without Developer assistance while still capturing the business/legal truth needed for LCSP downstream workflow.

## Scope

This is preparation only. It does not run interviews, record results or update readiness.

## Source References

- `docs/product/validation-plan.md`
- `docs/product/validation-execution-plan.md`
- `docs/qa/manual-validation-protocols.md`
- `docs/qa/test-scenario-catalog.md`
- `docs/qa/release-quality-gate-model.md`
- `docs/workflows/phase-3-final-quality-documentation-checkpoint-report.md`

## Target Participants

| Participant Type | Criteria | Exclusion Criteria |
| --- | --- | --- |
| SME Manager | Owns or reviews business process, risk or operational decision flow | Primary software implementer of LCSP or scanner |
| Compliance-oriented user | Familiar with compliance review, policy or risk documentation | Legal-rule author for A2 sample set |
| Technical Manager | Understands product/system workflow but is not expected to inspect code | Developer assigned to build scanner or AIUsageFlow |

## Session Count

| Item | Proposed Range | Status |
| --- | --- | --- |
| Number of A1 sessions | 1 pilot plus 6 valid Manager-like participant sessions | APPROVED_FOR_EXECUTION |
| Session duration | 45 minutes maximum per session | APPROVED_FOR_EXECUTION |

## Phase 4.1.1 Proposed Execution Decision

| Decision Item | Proposed Value | Status |
| --- | --- | --- |
| Protocol version | A1-WIZARD-VALIDATION-v0.1 | APPROVED_FOR_EXECUTION |
| Session design | 1 pilot session plus 6 valid Manager-like participant sessions | APPROVED_FOR_EXECUTION |
| Maximum session duration | 45 minutes | APPROVED_FOR_EXECUTION |
| Material policy | Synthetic prototype/demo data only | APPROVED_FOR_EXECUTION |
| Validation owner | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Moderator | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |

## Phase 4.1.2 Approval Normalization

Phase 4.1.2 normalizes A1 according to owner confirmation `DEC-VAL-2026-001`.

| Decision Item | Normalized Value | Status |
| --- | --- | --- |
| Option A | Yes | APPROVED_FOR_EXECUTION |
| Option B | No | APPROVED_FOR_EXECUTION |
| A1 Validation Owner | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| A1 Moderator | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Observer / note-taker | Optional, not an execution blocker | APPROVED_FOR_EXECUTION |
| Pilot sessions | 1 | APPROVED_FOR_EXECUTION |
| Valid Manager-like participant sessions | 6 | APPROVED_FOR_EXECUTION |
| Maximum duration | 45 minutes per session | APPROVED_FOR_EXECUTION |
| Critical-task completion | At least 5 of 6 | APPROVED_FOR_EXECUTION |
| Blocked-state comprehension | At least 5 of 6 | APPROVED_FOR_EXECUTION |
| Manager-authority comprehension | At least 5 of 6 | APPROVED_FOR_EXECUTION |
| Median completion target | <=25 minutes | APPROVED_FOR_EXECUTION |
| Severity rubric | P0/P1/P2 approved | APPROVED_FOR_EXECUTION |

This normalization prepares A1 for the next Phase 4.2 readiness recheck only. It does not collect evidence, claim A1 results or unblock implementation.

## Wizard Tasks

| Task ID | Task | Completion Definition |
| --- | --- | --- |
| A1-T01 | Complete Wizard for internal AI assistant/chatbot | Critical fields captured or explicitly marked unknown |
| A1-T02 | Complete Wizard for loan approval / credit scoring | Decision role, affected subject, data type and human oversight captured |
| A1-T03 | Complete Wizard for HR screening / ranking | Recruitment impact, candidate data, ranking/filtering and review process captured |
| A1-T04 | Interpret blocked state after unknown critical field | Participant can explain why classification cannot continue |
| A1-T05 | Explain evidence requirement before classification | Participant understands Wizard alone is not sufficient for risk classification |
| A1-T06 | Explain Manager authority and Developer optionality | Participant understands Manager can proceed without Developer assignment |

## Critical Fields

```text
purpose
sector
data_type
user_group
user_impact
decision_role
human_oversight
external_llm_usage
biometric_or_high_impact_use
```

## Moderator Script

1. Explain that this is validation of LCSP documentation and Wizard comprehension, not a test of the participant.
2. Confirm consent and privacy rules.
3. Give the participant one scenario at a time.
4. Ask the participant to complete Wizard answers without Developer assistance.
5. Do not explain technical terms unless the scenario itself provides business wording.
6. Ask the participant to think aloud where comfortable.
7. When a blocked or unknown state appears, ask what they believe LCSP needs next.
8. Run the post-session questionnaire.
9. Record only pseudonymized participant ID and structured observations.

## Observation Sheet

| Field | Capture |
| --- | --- |
| participant_ref | Pseudonymized ID |
| scenario_id | A1-T01..A1-T05 |
| task_completion | complete / partial / incomplete |
| fields_completed | List of critical fields completed |
| fields_unknown | List of critical fields marked unknown |
| developer_help_needed | yes/no + note |
| confusion_point | Question label and note |
| terminology_issue | yes/no + term |
| blocked_state_understood | yes/no/inconclusive |
| timing_minutes | Start/end or duration |
| moderator_note | Short factual note |

## Post-Session Questionnaire

| Question | Response Type |
| --- | --- |
| Which Wizard question was hardest to answer? | Free text |
| Did any question require technical knowledge? | Yes/No + explanation |
| Could you tell when LCSP needed repository evidence before classification? | Yes/No + explanation |
| Could you explain why a blocked state occurred? | Yes/No + explanation |
| What wording would make the Wizard clearer? | Free text |
| Confidence completing a real assessment | 1-5 scale |

## Acceptance Thresholds

| Threshold | Required |
| --- | --- |
| Manager completion | At least 5 of 6 valid participants complete all critical tasks without moderator intervention. |
| Developer assistance | At least 5 of 6 correctly distinguish Manager authority from optional Developer participation; Developer assignment must not be required for the task. |
| Question mapping | 100% important questions map to WizardProfile fields. |
| Technical wording | 0 critical questions rely on code/scanner terminology without plain-language explanation. |
| Unknown handling | Unknown critical fields must not become final classification input. |

### Phase 4.1.1 Proposed Thresholds

These thresholds were approved for Phase 4.2 readiness recheck by owner confirmation `DEC-VAL-2026-001`. They do not authorize evidence collection until a Phase 4.2 checkpoint explicitly allows A1.

| Threshold | Proposed Default | Status |
| --- | --- | --- |
| Critical task completion | At least 5 of 6 valid participants complete all critical tasks without moderator intervention | APPROVED_FOR_EXECUTION |
| Verified evidence blocked-state comprehension | At least 5 of 6 correctly explain why classification is blocked before sufficient verified evidence | APPROVED_FOR_EXECUTION |
| Manager/Developer distinction | At least 5 of 6 correctly distinguish Manager authority from optional Developer participation | APPROVED_FOR_EXECUTION |
| Critical-task completion time | Median critical-task completion time is 25 minutes or less | APPROVED_FOR_EXECUTION |
| P0 usability failure | No unresolved severity-P0 usability failure | APPROVED_FOR_EXECUTION |
| P1 misunderstanding | No more than one severity-P1 misunderstanding per critical task | APPROVED_FOR_EXECUTION |

## Severity Definitions

| Severity | Definition | Execution Impact |
| --- | --- | --- |
| P0 | Participant cannot complete a critical validation task, misunderstands a blocking compliance state, or believes Wizard self-declaration is enough for final classification | Blocks A1 pass and requires product/design update |
| P1 | Participant completes the task but misunderstands a critical concept, requires moderator intervention, or confuses Manager authority with Developer dependency | Counts against threshold and may require wording or UX update |
| P2 | Minor wording, ordering or confidence issue that does not affect critical task completion or blocked-state understanding | Record as improvement; does not block by itself |

## Failure Criteria

- Participant cannot complete critical Wizard fields without Developer explanation.
- Wizard misses purpose, sector, data type, user group, user impact, decision role, human oversight or external LLM usage.
- Participant interprets Wizard self-declaration as final risk classification.
- Unknown critical field allows final classification.
- Blocked-state explanation is not understandable.

## Inconclusive Criteria

- Participant sample does not include the required role spread.
- Scenario material is ambiguous or inconsistent.
- Moderator intervention materially changes participant answer.
- Evidence capture is incomplete.

## Required Document Updates After Result

| Result Pattern | Required Updates |
| --- | --- |
| PASS | Record validation result; update readiness evidence references only. |
| PASS_WITH_REQUIRED_UPDATES | Update PRD, WizardProfile spec, UX, FR/BR/NFR, acceptance criteria before readiness change. |
| INCONCLUSIVE_REQUIRES_RERUN | Revise scenarios or participant criteria and rerun A1. |
| FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT | Update product/design docs and rerun A1 after amendment. |

## Privacy Rules

- Use synthetic scenarios only.
- Do not collect real customer system names, real personal data, repository source or credentials.
- Participant identifiers must be pseudonymized.
- Session recordings, if used, require explicit consent and retention approval.
