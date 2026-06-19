# AI Usage Flow Implementation

## Purpose

Define implementation guidance for AI Usage Flow Analysis, the mandatory bridge between repository technical evidence and legal rule matching.

## Scope

AI Usage Flow Analysis consumes scanner signals, `TechnicalProfile`, `TechnicalFindings`, evidence graph paths and WizardProfile context to produce evidence-backed `AIUsageFlow` claims. It does not classify legal risk and does not create legal conclusions.

## Dependencies / Source References

- [AI Usage Flow Analysis Spec](../specs/ai-usage-flow-analysis-spec.md)
- [Static Analysis Scanner Contract](../specs/static-analysis-scanner-contract.md)
- [Scanner Signal Taxonomy](../specs/scanner-signal-taxonomy.md)
- [AI Usage Rule Mapping Spec](../specs/ai-usage-rule-mapping-spec.md)

## Implementation Boundaries

- Runs after `TechnicalProfile` and before Reconciliation.
- Uses rule-first deterministic evidence analysis.
- Optional LLM usage is limited to sanitized metadata through LLM Gateway.
- Claims without evidence refs cannot be used for legal rule matching.
- Unknown critical purpose fields block final classification or require traceable Manager clarification.

## Scanner Signal Consumption

| Signal Group | Consumed For |
| --- | --- |
| AI invocation signals | `ai_purpose`, invocation location, provider/model context |
| AI input signals | `ai_input_types`, sensitive data indicators |
| AI output signals | `ai_output_types` |
| Decision flow signals | `downstream_action`, `automation_level` |
| Human review signals | `human_review` |
| Domain context signals | `business_process`, affected subjects |
| Harm potential signals | `potential_harm_categories` |
| Coverage limitation signals | uncertainty reasons and blocking behavior |

## Static Analysis Inputs

- Tree-sitter generic parse output for file inventory and fallback structure.
- TypeScript Compiler API semantic sidecar output for TS/JS imports, symbols and call analysis.
- Python `ast` plus import/module resolver output for Python semantics.
- L0-L4 scanner depth metadata.
- NetworkX scan-local evidence graph paths.
- Versioned scanner ruleset hits.

## L0-L4 Analysis Depth

| Level | Use in AIUsageFlow |
| --- | --- |
| L0 repository inventory | Language/framework/domain hints only |
| L1 single-function flow | Local input -> model -> output -> action evidence |
| L2 same-module flow | Service-level input/output/action path evidence |
| L3 controlled cross-module flow | Route/controller -> service -> AI invocation -> state/action path evidence |
| L4 unsupported/dynamic boundary | Produce uncertainty; do not infer beyond boundary |

L2/L3 tracing starts only after an AI invocation candidate is detected. Unrestricted whole-repository global data-flow analysis is not part of MVP.

## Claim-Level Output Contract

| Claim | Required Fields | Blocking Relevance |
| --- | --- | --- |
| `business_process` | value, confidence, evidence refs, source type, uncertainty reason | Critical |
| `ai_purpose` | value, confidence, evidence refs, source type, uncertainty reason | Critical |
| `ai_input_types` | values, confidence, evidence refs, source type | Critical when data sensitivity affects rules |
| `ai_output_types` | values, confidence, evidence refs, source type | Critical |
| `downstream_action` | value, confidence, evidence refs, source type | Critical |
| `affected_subjects` | values, confidence, evidence refs, source type | Critical when subject rights are implicated |
| `human_review` | present/absent/unclear, confidence, bounded-path evidence refs | Critical |
| `automation_level` | assistive/decision support/semi/fully/unclear | Critical |
| `potential_harm_categories` | values, confidence, evidence refs | Rule matching support |

## Input / Output / Downstream Detection

| Detection Area | Evidence Fusion |
| --- | --- |
| Input categories | DTO/API schema, function params, prompt variables, DB fields, service names, data-flow paths |
| Output types | Assignment targets, parser/schema, downstream function names, return payloads |
| Downstream action | Branch/threshold, status update, ranking/sorting, notification, user response, review queue |
| Automated decision | AI output + decision logic + state-changing action + no evidenced human-review step |
| Human review | Positive review workflow signals; absence only when bounded path shows no review before action |

A variable or field name alone is weak evidence. Confidence increases only when multiple signals agree.

## Domain Context Fusion

Combine API routes, controller/service names, module/folder names, DTO/schema names, database entities, prompt metadata, input category, output type and downstream action.

| Evidence Combination | Expected Flow Claim |
| --- | --- |
| `/loans/apply`, credit service, income, risk score, approved/rejected | loan approval, scoring, approve/reject |
| candidate ranker, resume/profile, score, sorting | recruitment, ranking |
| support chat route, user message, generated response | customer support, chatbot |

## Confidence and Uncertainty

| Confidence | Meaning |
| ---: | --- |
| 0.80-1.00 | Strong evidence |
| 0.60-0.79 | Reasonable evidence |
| 0.40-0.59 | Partial / weak evidence |
| 0.00-0.39 | Unclear |

Dynamic import, reflection, runtime prompt from DB, remote config, queue boundary without trace, generated/minified code, missing coverage or unresolved output path must create `SCAN_COVERAGE_LIMITATION` or `UNSUPPORTED_DYNAMIC_FLOW` and set affected claims to unknown/unclear.

## Conflict Creation Rules

Create reconciliation conflict candidates when scanner-derived usage flow contradicts WizardProfile, such as internal assistant versus customer-facing chatbot, human review claimed but auto-approve path found, no sensitive data claimed but financial/health/biometric signals found, or content-only claim but scoring/ranking/approve-reject flow found.

Manager resolves conflicts in MVP. Manager clarification must be traceable and must not arbitrarily override scanner facts.

## LLM Permitted and Forbidden Uses

| Task | LLM Allowed? |
| --- | ---: |
| Summarize evidence for Manager from sanitized metadata | Yes |
| Explain uncertainty reasons | Yes |
| Suggest non-binding business-purpose label | Yes |
| Parse AST, extract call graph or data-flow graph | No |
| Receive raw source or full prompts | No |
| Override deterministic evidence | No |
| Create legal classification | No |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| TechnicalProfile | AIUsageFlow claim candidates |
| TechnicalFindings and evidence refs | Claim-level evidence refs |
| Evidence graph paths | Flow trace and confidence support |
| WizardProfile context | Reconciliation comparison context |

## Security and Privacy Considerations

Do not persist raw source, full prompts, full AST bodies or secrets. Use hashes, metadata, symbol refs, line ranges where allowed and evidence reference ids.

## Audit Requirements

Audit AIUsageFlow generated, AIUsageFlow uncertain, conflict candidate created, LLM summary requested, LLM summary failed and Manager review completed.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| A2-b confidence thresholds | Metrics defined; thresholds require validation results | Backlog unblock / implementation |
| Exact LLM summarization prompts | Versioned prompt references only | Implementation |

