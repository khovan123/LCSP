# Owner Risk Acceptance - Controlled MVP Prototype Implementation

## Purpose

Record the Project Lead's explicit authorization to begin controlled MVP prototype implementation before real validation evidence collection is complete.

This document is an owner risk-acceptance record. It is not a validation result, compliance certification, legal reliability approval, production release approval or runtime scanner-accuracy approval.

## Owner Authorization

| Field | Value |
|---|---|
| Authorization date | 2026-06-20 |
| Owner | Phan Nguyễn Quốc Minh |
| Role | Project Lead |
| Authorization type | Controlled MVP prototype implementation before completion of real validation evidence collection |
| Evidence reference | Owner statement in LCSP workflow conversation, 2026-06-20 |
| Scope | Controlled MVP prototype only |

Owner statement recorded:

```text
I, Phan Nguyễn Quốc Minh, authorize LCSP prototype implementation before completion of real validation evidence collection.
```

## Accepted Incomplete Validation State

The owner accepts that:

- simulated validation is not real validation evidence;
- A1 remains incomplete until real evidence is collected;
- A2 internal review remains incomplete until real evidence is collected;
- A3 remains incomplete until real evidence is collected;
- A2-b1 remains incomplete until real internal reviewer evidence is collected;
- A2-b2 remains a post-implementation empirical scanner acceptance gate.

## Explicit Non-Claims

This authorization does not permit any claim of:

- legal compliance certification;
- formal legal reliability validation;
- professional legal opinion;
- production release readiness;
- runtime scanner accuracy;
- parser correctness;
- AST extraction accuracy;
- call graph or data-flow accuracy;
- empirical false-positive or false-negative rate;
- performance benchmark;
- production scanner behavior.

## Prototype Permission Boundary

Implementation may proceed only as:

```text
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

Permitted prototype work must remain inside the canonical MVP architecture and invariants:

- Manager remains the MVP super-role.
- Developer remains optional and cannot block the MVP flow.
- OAuth/OIDC login remains separate from GitHub App repository authorization.
- GitHub Repository Scan remains the only active MVP technical evidence path.
- Scanner remains static-analysis only.
- Raw source, full prompts, secrets and raw AST bodies must not enter LLM, ordinary audit logs or long-term persistence.
- Provider/model/framework detection alone must not create legal risk classification.
- VerifiedProfile, Citation Guardrail and Output Guardrail remain mandatory before final legal output.

## Still Blocked

The following remain blocked:

- production release;
- compliance certification;
- formal legal reliability validation;
- A2-b2 empirical scanner acceptance;
- use of simulated validation as real evidence;
- legal-risk claims without citations;
- runtime scanner-accuracy claims;
- implementation readiness claim for validated/production deployment.

## Required Follow-Up

Before any validated implementation readiness or production release claim:

1. Collect and record real A1 evidence.
2. Collect and record real A2 internal review evidence.
3. Collect and record real A3 evidence.
4. Collect and record real A2-b1 internal reviewer evidence.
5. Run A2-b2 empirical scanner acceptance after a scanner prototype exists.
6. Update PRD/spec/architecture/ADR/QA documents if validation evidence requires changes.
7. Run a later readiness checkpoint explicitly addressing the owner-risk prototype exception.

## Decision

CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE

VALIDATION_REMAINS_INCOMPLETE

IMPLEMENTATION_REMAINS_NOT_READY_FOR_VALIDATED_OR_PRODUCTION_RELEASE
