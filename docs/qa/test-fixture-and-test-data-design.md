# Test Fixture and Test Data Design

## Purpose

Define versioned LCSP fixture families and expected-output policy without creating runnable source code or real customer data.

## Scope

Fixtures support scanner validation, AIUsageFlow accuracy, RAG/citation behavior, conflict behavior, auth boundary and operational recovery. All fixtures are synthetic and non-runnable in this documentation phase.

## Fixture Governance

| Rule | Requirement |
| --- | --- |
| Versioning | Each fixture has `fixture_id`, version, checksum and expected-output version |
| No real data | No real credentials, personal data, proprietary source or regulated data |
| Expected output | Expected findings, AIUsageFlow claims, gate outcome and legal eligibility are documented |
| Redaction | Secret-like samples are synthetic and expected to be redacted before persistence |
| Change control | Fixture changes require expected-output review and traceability update |

## Fixture Families

| Fixture ID | Purpose | Expected Findings | Expected AIUsageFlow Claims | Expected Confidence Range | Expected Uncertainty Behavior | Expected Gate Outcome | Expected Legal-Rule Eligibility | Sensitive-Data Handling | Versioning / Checksum Policy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-SCAN-01 | Internal summarization | AI invocation, input user/internal text, output summary | `business_process=internal_productivity`, `ai_purpose=summarization`, `downstream_action=display_to_user`, `affected_subjects=internal_staff` | 0.60-0.90 | Unknown if downstream not visible | Gates pass if evidence refs complete | General/low-impact governance only when applicable | Synthetic internal text only | checksum per fixture package |
| F-SCAN-02 | Customer-support chatbot | Chat route, model invocation, user message, generated response | `business_process=customer_support`, `ai_purpose=chatbot`, `downstream_action=display_to_user`, `affected_subjects=customer` | 0.60-0.90 | Mark unclear if protected-domain advice cannot be determined | Gates pass or clarify domain | Transparency/user-facing AI obligations; not high-risk by default | Synthetic customer text | checksum per fixture package |
| F-SCAN-03 | Loan approval / credit scoring | Financial inputs, score output, threshold, approve/reject action | `business_process=loan_approval`, `ai_purpose=scoring`, `downstream_action=approve_reject`, `affected_subjects=customer`, financial data | 0.80-1.00 | None expected if path complete | Gates pass; high-impact rule eligibility | Automated decision / financial service / affected-person rules | Synthetic financial fields | checksum + expected graph path ids |
| F-SCAN-04 | HR ranking | Resume/profile input, score/rank output, sorting/ranking action | `business_process=recruitment`, `ai_purpose=ranking`, employment data, candidate affected | 0.80-1.00 | Mark review unclear unless review path exists | Gates pass | Employment/recruitment, discrimination risk, oversight/transparency | Synthetic employment data | checksum + expected ranking path |
| F-SCAN-05 | Human-reviewed loan | Loan scoring plus review queue/action | `human_review=present`, `automation_level=decision_support` or semi-automated | 0.70-1.00 | None if review path bounded | Gates pass | Automated decision/oversight rules with review evidence | Synthetic financial data | checksum + review path ids |
| F-SCAN-06 | Auto-reject decision | AI output, threshold/branch, reject/status update, no review | `automation_level=fully_automated`, `downstream_action=approve_reject` | 0.80-1.00 | None if bounded path complete | Gates pass; classification allowed only after VerifiedProfile/citation | Automated-decision/high-impact eligibility | Synthetic financial/customer data | checksum + state-change path |
| F-SCAN-07 | Provider SDK only / no invocation | Dependency/provider usage without traced business flow | provider/framework signal only | 0.40-0.70 for provider; unknown for purpose/action | Critical usage fields unknown | Classification blocked or low eligibility; no overclaim | Not eligible for high-risk from provider alone | No sensitive data | checksum |
| F-SCAN-08 | Dynamic prompt reference | Runtime prompt from DB/config/remote | prompt reference, `ai_purpose=unknown/unclear` if unresolved | 0.00-0.59 for purpose | `DYNAMIC_SYSTEM_PROMPT_REFERENCE`, uncertainty reason | Clarification/block for critical fields | Legal rule matching excludes unsupported claim | No full prompt stored | checksum + prompt ref hash |
| F-SCAN-09 | Message queue flow break | AI output passed across queue boundary | invocation/output found; downstream unknown | 0.40-0.70 partial | `UNSUPPORTED_DYNAMIC_FLOW` for downstream action | Block or clarification if critical | Only evidence-backed claims eligible | Synthetic payload labels | checksum + queue boundary marker |
| F-SCAN-10 | Minified/generated code | Minified/generated source region | coverage limitation | 0.00-0.39 for flow | `SCAN_COVERAGE_LIMITATION` | Insufficient if critical flow hidden | No unsupported legal matching | No raw minified body persisted | checksum |
| F-SCAN-11 | Secret-like configuration sample | Synthetic secret-like tokens in config | redaction finding, no secret persistence | N/A | None; redaction expected | Security pass only if redacted | Not legal-rule input | Synthetic secret values only | checksum + redaction expectation |
| F-SCAN-12 | Missing downstream path | AI invocation/output but no traceable downstream action | invocation and output signal | 0.40-0.59 | downstream unknown; abstain | Classification blocked for critical purpose | Only invocation/output claims eligible | synthetic data labels | checksum |
| F-RAG-01 | Correct legal rule / citation case | N/A | Evidence-backed AIUsageFlow maps to expected rule family | N/A | None | Citation guardrail pass | Rule and citation required | No source data | corpus version + citation checksum |
| F-RAG-02 | Missing citation case | N/A | Valid profile but no citation available | N/A | Citation missing | Block/degrade classification/output | Not eligible for unsupported conclusion | No source data | corpus version |
| F-RAG-03 | Ambiguous legal mapping case | N/A | Multiple possible rule families | N/A | Ambiguity recorded | Degrade or request clarification | Only supported citations used | No source data | corpus version |
| F-CONFLICT-01 | Wizard says no decision but source has approve/reject | AI approve/reject evidence conflicts with Wizard | conflict candidate | 0.80-1.00 | None if path complete | Manager conflict task | Legal matching waits for resolution | Synthetic business answers | fixture + WizardProfile version |
| F-CONFLICT-02 | Wizard says human review but source path unresolved | review declaration, unresolved source flow | conflict or uncertainty | 0.40-0.70 | unclear review state | Manager clarification / classification blocked | Evidence-backed claims only | Synthetic answers | fixture + WizardProfile version |
| F-AUTH-01 | OAuth invalid state/nonce/redirect | invalid callback metadata | N/A | N/A | N/A | Login rejected | N/A | No real tokens | vector id/checksum |
| F-AUTH-02 | Manager versus Developer permissions | Manager and optional Developer actors | N/A | N/A | N/A | Manager allowed, Developer denied for final actions | N/A | Synthetic users | identity fixture version |
| F-OPS-01 | Queue duplicate/retry/dead-letter | duplicate and poison job metadata | N/A | N/A | N/A | idempotency or dead-letter as expected | N/A | no raw source in payload | job fixture version |
| F-OPS-02 | Worker crash/timeout | interrupted workflow/checkpoint | N/A | N/A | N/A | resume or fail closed | N/A | no sensitive payload | checkpoint fixture version |

## Expected-Output Review Policy

Expected outputs must be reviewed when scanner ruleset version, AIUsageFlow confidence thresholds, legal corpus version or reconciliation rules change.

## Testability Labels

| Fixture Family | Label |
| --- | --- |
| Scanner fixtures | TESTABLE_WITH_FIXTURE |
| RAG fixtures | TESTABLE_WITH_FIXTURE and MANUAL_VALIDATION_REQUIRED for A2 |
| Conflict fixtures | TESTABLE_WITH_FIXTURE and BLOCKED_BY_VALIDATION_DEPENDENCY for A3 policy details |
| Auth/ops fixtures | TESTABLE_AFTER_IMPLEMENTATION |

