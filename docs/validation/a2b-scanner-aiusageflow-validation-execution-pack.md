# A2-b Scanner and AIUsageFlow Validation Execution Pack

## Purpose

Prepare real validation for A2-b: whether scanner-derived evidence and AIUsageFlow can reliably support legal rule matching without overclaiming risk from provider/model/framework presence.

## Scope

This pack prepares fixture-based validation. It does not execute scanner code, create test source, record real results or use real customer repositories.

## Phase 4.1.1 A2-b Scope Split

| Stream | Name | Purpose | Status |
| --- | --- | --- | --- |
| A2-b1 | Pre-Implementation Mapping Design Validation | Validate scanner-rule design, expected evidence graph, AIUsageFlow claim model, uncertainty/abstention behavior, reconciliation behavior and legal-rule eligibility rules | APPROVED_FOR_EXECUTION, subject to D-07 fixture release |
| A2-b2 | Post-Implementation Empirical Scanner Acceptance Validation | Validate runtime scanner accuracy, parser correctness, AST extraction accuracy, cross-module data-flow accuracy, performance and actual false-positive rate after a scanner prototype exists | POST_IMPLEMENTATION_ACCEPTANCE_GATE |

A2-b1 must not be described as scanner accuracy validation. It validates whether the designed evidence model and expected mapping behavior are coherent enough to support later implementation.

A2-b1 does not validate:

- runtime scanner accuracy;
- parser correctness;
- AST extraction accuracy;
- cross-module data-flow accuracy;
- performance;
- actual false-positive rate in executed scanner output.

## Phase 4.1.2 A2-b1 Approval Normalization

Phase 4.1.2 records owner approval for A2-b1 scope, reviewer model and thresholds. Fixture release remains separately blocked by D-07 until fixture approver, finalized cards, reviewer approval, hashes and `APPROVED_FOR_VALIDATION` status are present.

| Decision Item | Normalized Value | Status |
| --- | --- | --- |
| A2-b1 scope | Pre-implementation mapping-design validation only | APPROVED_FOR_EXECUTION |
| A2-b2 | Post-implementation empirical scanner acceptance gate | POST_IMPLEMENTATION_ACCEPTANCE_GATE |
| Technical Reviewer 1 | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Technical Reviewer 2 | Nguyễn Anh Tú | APPROVED_FOR_EXECUTION |
| Legal-eligibility Reviewer | Lê Bảo Nhi | APPROVED_FOR_EXECUTION |
| Adjudicator | Nguyễn Tuấn Anh | APPROVED_FOR_EXECUTION |
| Fixture owner | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Material claim evidence-ref threshold | 100% | APPROVED_FOR_EXECUTION |
| Low-impact false high-impact label threshold | 0 | APPROVED_FOR_EXECUTION |
| Dynamic / unsupported abstention threshold | 100% | APPROVED_FOR_EXECUTION |

Explicit limitation:

```text
A2-b1 does not validate runtime scanner accuracy, parser correctness,
AST extraction accuracy, cross-module data-flow accuracy, empirical false-positive rate,
empirical false-negative rate, performance, or resource consumption.
```

## Source References

- `docs/specs/static-analysis-scanner-contract.md`
- `docs/specs/ai-usage-flow-analysis-spec.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/qa/test-fixture-and-test-data-design.md`
- `docs/qa/test-scenario-catalog.md`
- `docs/qa/manual-validation-protocols.md`

## Mandatory A2-b Rules

- Provider/model/framework presence alone must not trigger high-risk classification.
- Every material claim used for legal matching must have `evidence_refs`.
- Unclear business purpose, human review or downstream action must become `unknown` / `unclear`, not unsupported certainty.
- Loan approval and HR ranking must map to appropriate legal-rule family or remain blocked.
- False positives and false negatives must be captured separately.
- Scanner coverage limitations must be visible to reviewers.

## Reviewer Roles

| Reviewer | Responsibility |
| --- | --- |
| Static-analysis reviewer | Reviews expected technical findings and graph/flow plausibility |
| AIUsageFlow reviewer | Reviews claim values, confidence bands, evidence refs and uncertainty |
| Legal/RAG reviewer | Reviews legal-rule matching eligibility, not final legal advice |
| QA scorer | Records pass/fail/inconclusive and false-positive/false-negative notes |

No single person should be the sole legal and technical reviewer.

## Fixture Matrix

| Fixture ID | Fixture | Expected Technical Findings | Expected AIUsageFlow Claims | Expected Confidence Band | Expected Uncertainty | Expected Reconciliation Result | Legal-Rule Matching Eligibility | Expected Classification Behavior | Reviewer Decision |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-SCAN-01 | Internal summarization | AI invocation; internal/user text input; summary output | `business_process=internal_productivity`; `ai_purpose=summarization`; `downstream_action=display_to_user`; `affected_subjects=internal_staff` | 0.60-0.90 | Unknown downstream allowed if not visible | No conflict if Wizard says internal assistant | Eligible only for evidence-backed general/low-impact governance | Not classified high-risk from provider/framework alone | Pass / fail / inconclusive |
| F-SCAN-02 | Customer chatbot without material decision | Chat route; model invocation; user message; generated response | `business_process=customer_support`; `ai_purpose=chatbot`; `downstream_action=display_to_user`; `affected_subjects=customer` | 0.60-0.90 | Protected-domain advice unclear if not evidenced | Conflict only if Wizard says not customer-facing | Eligible for transparency/user-facing rules where cited | Not automated decision unless downstream decision exists | Pass / fail / inconclusive |
| F-SCAN-03 | Loan approval / credit scoring | Financial inputs; score output; threshold; approve/reject action | `business_process=loan_approval`; `ai_purpose=scoring`; `downstream_action=approve_reject`; `affected_subjects=customer`; financial/personal data | 0.80-1.00 | None expected if path complete | Conflict if Wizard denies decision impact | Eligible for automated/financial/affected-person rules | Allowed only after VerifiedProfile and citation; otherwise blocked | Pass / fail / inconclusive |
| F-SCAN-04 | HR screening / ranking | Resume/profile input; score/rank output; ranking action | `business_process=recruitment`; `ai_purpose=ranking`; employment data; candidate affected | 0.80-1.00 | Human review unclear unless bounded path exists | Conflict if Wizard says no employment impact | Eligible for recruitment, discrimination-risk and oversight rules | Allowed only after VerifiedProfile and citation | Pass / fail / inconclusive |
| F-SCAN-05 | Human-reviewed loan decision | Loan scoring plus review queue/action | `human_review=present`; `automation_level=decision_support` or `semi_automated` | 0.70-1.00 | None if review path is bounded | No conflict if Wizard claims review and evidence supports | Eligible for oversight/documentation rules | Classification may proceed only with VerifiedProfile/citation | Pass / fail / inconclusive |
| F-SCAN-06 | Automated approval/rejection | AI output; threshold/branch; reject/status update; no review | `automation_level=fully_automated`; `downstream_action=approve_reject` | 0.80-1.00 | None if bounded path complete | Conflict if Wizard claims human review | Eligible for automated-decision/high-impact rule family | Classification allowed only after VerifiedProfile/citation; otherwise blocked | Pass / fail / inconclusive |
| F-SCAN-08 | Dynamic prompt / runtime dependency | Dynamic prompt reference from DB/config/remote | prompt reference; `ai_purpose=unknown/unclear` if unresolved | 0.00-0.59 for purpose | `DYNAMIC_SYSTEM_PROMPT_REFERENCE`; uncertainty reason | Manager clarification or conflict depending Wizard claim | Unsupported purpose claim not eligible | Final classification blocked/degraded | Pass / fail / inconclusive |
| F-SCAN-10 | Unsupported or generated/minified source | Coverage limitation finding | Critical flow claims unknown | 0.00-0.39 for flow | `SCAN_COVERAGE_LIMITATION` | Insufficient evidence or clarification | No unsupported legal matching | Classification blocked if critical flow hidden | Pass / fail / inconclusive |
| F-SCAN-07 | Provider SDK only / no meaningful invocation | Dependency/provider usage only | Provider/framework signal only; purpose/action unknown | 0.40-0.70 for provider; 0.00-0.39 for purpose/action | Critical usage fields unknown | No legal risk conclusion from provider only | Not eligible for high-risk rule family | Not classified or remains blocked/low eligibility | Pass / fail / inconclusive |
| F-CONFLICT-01 | Wizard declaration conflicts with source evidence | Source shows approve/reject but Wizard says no decision | Conflict candidate with evidence refs | 0.80-1.00 if bounded path complete | None expected if path complete | Manager conflict task; classification locked | Legal matching waits for resolution | Final classification blocked until Manager resolution and VerifiedProfile | Pass / fail / inconclusive |
| F-CONFLICT-02 | Wizard says human review but source path unresolved | Review declaration; unresolved source flow | `human_review=unclear` or conflict | 0.40-0.70 | Unclear review state | Manager clarification; classification blocked if critical | Only evidence-backed claims eligible | No final classification on unsupported review claim | Pass / fail / inconclusive |

## Versioned Synthetic Fixture Specification Cards

These are specification cards only. They are not executable source fixtures and do not validate runtime scanner behavior. Hashes must be generated only after the specification artifact is finalized; do not fabricate fixture hashes.

| Fixture ID | Fixture Version | Specification Hash | Expected Finding Set | Expected Evidence Graph | Expected AIUsageFlow Claims | Expected Confidence Band | Expected Uncertainty Behavior | Expected Reconciliation Outcome | Expected Legal-Rule Eligibility | Expected Classification Blocking / Allowance |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-SCAN-01 | v0.1 | PENDING_FINAL_SPEC_HASH | AI invocation; internal/user text input; summary output | Route/service -> model invocation -> summary output -> display/internal response | internal productivity; summarization; display_to_user; internal staff | 0.60-0.90 | Downstream unknown allowed if not visible | No conflict if Wizard says internal assistant | Eligible only for evidence-backed general/low-impact governance | Must not classify high-risk from provider/framework alone |
| F-SCAN-02 | v0.1 | PENDING_FINAL_SPEC_HASH | Chat route; model invocation; user message; generated response | Route/controller -> chatbot service -> model invocation -> generated response -> user response | customer support; chatbot; display_to_user; customer | 0.60-0.90 | Protected-domain advice unclear if not evidenced | Conflict only if Wizard says not customer-facing | Eligible for transparency/user-facing rules when cited | Not automated decision unless downstream decision exists |
| F-SCAN-03 | v0.1 | PENDING_FINAL_SPEC_HASH | Financial inputs; score output; threshold; approve/reject action | Loan route -> scoring service -> AI/model score -> branch/threshold -> approve/reject | loan approval; scoring; approve_reject; customer; financial/personal data | 0.80-1.00 | None expected if path complete | Conflict if Wizard denies decision impact | Eligible for automated/financial/affected-person rules | Allowed only after VerifiedProfile and citation; otherwise blocked |
| F-SCAN-04 | v0.1 | PENDING_FINAL_SPEC_HASH | Resume/profile input; score/rank output; ranking action | Candidate route -> ranking service -> score/rank output -> ranking action | recruitment; ranking; candidate affected; employment data | 0.80-1.00 | Human review unclear unless bounded path exists | Conflict if Wizard says no employment impact | Eligible for recruitment and oversight/discrimination-risk rules | Allowed only after VerifiedProfile and citation |
| F-SCAN-05 | v0.1 | PENDING_FINAL_SPEC_HASH | Loan scoring plus review queue/action | Loan route -> score output -> review queue/human approval -> final action | human_review=present; decision_support or semi_automated | 0.70-1.00 | None if review path bounded | No conflict if Wizard claims review and evidence supports | Eligible for oversight/documentation rules | Classification may proceed only with VerifiedProfile and citation |
| F-SCAN-06 | v0.1 | PENDING_FINAL_SPEC_HASH | AI output; threshold/branch; reject/status update; no review | Application route -> model output -> decision rule -> status update/reject | fully_automated; approve_reject/change_status | 0.80-1.00 | None if bounded path complete | Conflict if Wizard claims human review | Eligible for automated-decision/high-impact rule family | Classification allowed only after VerifiedProfile/citation; otherwise blocked |
| F-SCAN-08 | v0.1 | PENDING_FINAL_SPEC_HASH | Dynamic prompt reference from DB/config/remote | Prompt reference -> unresolved runtime dependency -> model invocation | ai_purpose unknown/unclear if unresolved | 0.00-0.59 | DYNAMIC_SYSTEM_PROMPT_REFERENCE; uncertainty reason required | Manager clarification or conflict depending Wizard claim | Unsupported purpose claim not eligible | Final classification blocked/degraded |
| F-SCAN-10 | v0.1 | PENDING_FINAL_SPEC_HASH | Coverage limitation finding | Unsupported/minified/generated boundary -> coverage limitation node | Critical flow claims unknown | 0.00-0.39 | SCAN_COVERAGE_LIMITATION | Insufficient evidence or clarification | No unsupported legal matching | Classification blocked if critical flow hidden |
| F-SCAN-07 | v0.1 | PENDING_FINAL_SPEC_HASH | Dependency/provider usage only | Manifest/dependency signal -> provider/framework signal, no material flow | Provider/framework signal only; purpose/action unknown | 0.40-0.70 for provider; 0.00-0.39 for purpose/action | Critical usage fields unknown | No legal risk conclusion from provider only | Not eligible for high-risk rule family | Not classified or remains blocked/low eligibility |
| F-CONFLICT-01 | v0.1 | PENDING_FINAL_SPEC_HASH | Source shows approve/reject; Wizard says no decision | WizardProfile declaration -> TechnicalProfile/AIUsageFlow conflict -> Manager conflict task | Conflict candidate with evidence refs | 0.80-1.00 if bounded path complete | None expected if path complete | Manager conflict task; classification locked | Legal matching waits for resolution | Final classification blocked until Manager resolution and VerifiedProfile |
| F-CONFLICT-02 | v0.1 | PENDING_FINAL_SPEC_HASH | Wizard says human review; source path unresolved | Wizard declaration -> unresolved review graph path -> uncertainty/conflict | human_review=unclear or conflict | 0.40-0.70 | Unclear review state | Manager clarification; classification blocked if critical | Only evidence-backed claims eligible | No final classification on unsupported review claim |

## Metric Capture

| Metric | Capture Method |
| --- | --- |
| AI invocation detection precision | Count true/false invocation findings by fixture |
| Business purpose mapping precision | Compare `business_process` and `ai_purpose` to expected labels |
| Input category detection accuracy | Compare input data categories to fixture expectation |
| Output type detection accuracy | Compare output claim to expected summary/score/ranking/decision label |
| Downstream-action detection accuracy | Compare display/recommend/rank/approve_reject/change_status |
| Human-review detection accuracy | Score present / absent with bounded evidence / unclear separately |
| Automated-decision false-positive rate | Count provider-only or chatbot/internal cases incorrectly marked automated/high-impact |
| Automated-decision false-negative rate | Count loan/HR/auto-reject paths missed or mapped generic |
| Unknown/abstain correctness | Count dynamic/unsupported cases marked unknown and blocked appropriately |
| AIUsageFlow claim evidence completeness | Percent material claims with evidence_refs |
| Legal-rule mapping eligibility completeness | Percent legal matching inputs backed by evidence refs |

## Acceptance Checks

| Check | Required |
| --- | --- |
| Provider-only false positive | 0 provider/model/framework-only cases may trigger high-risk classification |
| Material evidence refs | 100% material claims used for legal matching have `evidence_refs` |
| Critical unknown handling | 100% unclear critical cases block/degrade classification or require traceable Manager clarification |
| High-impact mapping | 100% loan/HR/automated fixtures map to expected rule family or remain blocked |
| Coverage limitation visibility | 100% unsupported/dynamic/generated cases expose limitation to reviewer |
| Reviewer scoring | False positives and false negatives captured separately |

Phase 4.1.2 approves the A2-b1 mapping-design thresholds listed below. Empirical runtime scanner precision/accuracy metrics remain outside A2-b1 and belong to A2-b2 after implementation.

### Phase 4.1.1 A2-b1 Proposed Acceptance Thresholds

These thresholds were owner-confirmed in `DEC-VAL-2026-001` for Phase 4.2 readiness recheck. A2-b1 evidence collection remains blocked until D-07 fixture release is complete and a Phase 4.2 checkpoint explicitly allows A2-b1.

| Threshold | Proposed Default | Status |
| --- | --- | --- |
| Material evidence refs | 100% of material claims used for legal-rule matching contain `evidence_refs` | APPROVED_FOR_EXECUTION |
| False automated/high-impact labels | 0 false automated/high-impact decision labels for internal summarization, ordinary chatbot and provider-SDK-only fixtures | APPROVED_FOR_EXECUTION |
| Decision-impact fixtures | 100% of explicit loan approval, HR ranking and auto-approval/rejection fixtures produce either expected evidence-backed usage pattern or explicit blocked/unclear result | APPROVED_FOR_EXECUTION |
| Dynamic/unsupported/unresolved fixtures | 100% produce uncertainty or coverage limitation instead of unsupported certainty | APPROVED_FOR_EXECUTION |
| Reviewer disagreement | All reviewer disagreements are recorded and adjudicated | APPROVED_FOR_EXECUTION |

## Phase 4.1.1 A2-b1 Reviewer Model

| Role | Requirement | Status |
| --- | --- | --- |
| Technical Reviewer 1 | Phan Nguyễn Quốc Minh | APPROVED_FOR_EXECUTION |
| Technical Reviewer 2 | Nguyễn Anh Tú | APPROVED_FOR_EXECUTION |
| Legal-eligibility Reviewer | Lê Bảo Nhi | APPROVED_FOR_EXECUTION |
| Adjudicator | Nguyễn Tuấn Anh | APPROVED_FOR_EXECUTION |

## Evidence Record

For each fixture, record:

- `validation_run_id`
- `fixture_id`
- fixture version and hash/ref
- expected findings
- observed findings
- expected AIUsageFlow claims
- observed AIUsageFlow claims
- claim evidence ref completeness
- expected uncertainty behavior
- observed uncertainty behavior
- expected legal-rule eligibility
- observed rule family/corpus
- false positive / false negative note
- reviewer decision
- required follow-up

## Privacy Rules

- Use synthetic fixtures only.
- No real repositories.
- No production credentials.
- No personal data.
- No raw prompts, full prompts, secrets or raw source in records.
- Fixture evidence must use hashes, IDs and metadata references.
