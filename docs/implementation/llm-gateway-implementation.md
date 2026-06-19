# LLM Gateway Implementation

## Purpose

Define the LLM Gateway as LCSP's only external model invocation boundary.

## Scope

The gateway centralizes model-provider configuration, input sanitization, prompt-template versioning, schema validation, retries, timeouts, audit metadata and privacy enforcement.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Source Code Privacy Policy](../security/source-code-privacy-policy.md)
- [Threat Model](../security/threat-model.md)

## Implementation Boundaries

- No component may call an external LLM provider directly.
- Raw source, full prompts, secrets and full AST bodies must not enter the gateway.
- LLM outputs cannot override deterministic evidence.
- LLM outputs cannot create legal conclusions without citation-backed downstream guardrails.

## Provider Adapter Pattern

| Layer | Responsibility |
| --- | --- |
| Gateway API | Accept sanitized structured input and node context |
| Policy filter | Reject disallowed fields and unsafe payload classes |
| Prompt/template resolver | Select prompt by version reference |
| Provider adapter | Apply provider-specific request/response formatting |
| Output validator | Enforce schema and safety constraints |
| Metadata recorder | Persist model run metadata and output hash |

## Required Model Run Metadata

| Field | Meaning |
| --- | --- |
| `assessment_id` | Assessment scope |
| `workflow_run_id` | Workflow scope |
| `node_name` | Calling node |
| `provider` | Configured provider label |
| `model` | Configured model label |
| `prompt_version` | Prompt/template version ref |
| `input_reference` | Reference to sanitized input payload |
| `output_hash` | Hash of stored/validated output |
| `timestamp` | Run timestamp |
| `status` | Success/failure/retry/degraded |

## Allowed Inputs

Sanitized metadata such as route category, service/module label, data category labels, output type labels, downstream action labels, human-review state, confidence and evidence reference ids.

## Forbidden Inputs

Raw repository source, full system prompts, secrets, raw provider tokens, full AST bodies, unredacted credentials and arbitrary log dumps.

## Timeout / Retry / Rate Limit

- Apply node-specific timeout and retry budgets.
- Fail closed on schema invalid output.
- Degrade or block according to node guardrail policy when provider outage occurs.
- Record timeout/rate-limit metrics without logging sensitive inputs.

## Prompt Injection Defense

- Treat repository-derived strings as untrusted metadata.
- Use structured inputs and schema-constrained outputs.
- Reject outputs that instruct workflow bypass, citation bypass or evidence override.

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Sanitized structured metadata | Schema-validated model response |
| Node policy and prompt version | Model run metadata |
| Provider config | Provider-normalized response or failure |

## State / Error / Failure Handling

- Provider outage: retry then mark node failed/degraded per policy.
- Invalid output schema: controlled retry then fail closed.
- Disallowed input detected: reject call and audit security event.

## Security and Privacy Considerations

Store prompt version refs and input references, not raw prompt/source/secret content. Audit metadata only.

## Audit Requirements

Audit model run requested, rejected, timed out, schema invalid, completed, retried and failed, including provider/model/prompt version and output hash.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| LLM provider selection | Provider behind adapter boundary | Implementation configuration |
| Token budget per node | Required policy, exact values deferred | Implementation |

